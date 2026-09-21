import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { LabelDocument, LabelElement } from "../../../services/label-designer/label-document";
import { resolveLabelText, type LabelDataContext } from "../../../services/label-designer/label-bindings";
import {
  RESIZE_HANDLES,
  mmToPreviewPx,
  moveElement,
  previewPxToMm,
  resizeElementByDelta,
  snapMm,
  type ResizeHandle,
} from "../../../services/label-designer/label-geometry";
import { barcodeSvgPath, encodeCode128B } from "../../../services/label-designer/barcode-symbol";
import { buildQrMatrix, qrSvgPath } from "../../../services/label-designer/qr-symbol";

type Gesture =
  | Readonly<{ mode: "move"; id: string; startClientX: number; startClientY: number; origin: LabelElement }>
  | Readonly<{ mode: "resize"; id: string; handle: ResizeHandle; startClientX: number; startClientY: number; origin: LabelElement }>;

export type LabelCanvasProps = Readonly<{
  document: LabelDocument;
  selectedId: string | null;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  showGuides: boolean;
  lockGuides: boolean;
  previewMode: boolean;
  context: LabelDataContext;
  onSelect(id: string | null): void;
  onGestureStart(): void;
  onChangeElement(id: string, patch: Partial<Omit<LabelElement, "id">>): void;
}>;

const HANDLE_CURSOR: Readonly<Record<ResizeHandle, string>> = {
  nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize",
};

/** Ruler gutters around the label inside the scrollable plane. */
const RULER_TOP_PX = 42;
const RULER_LEFT_PX = 31;

/** Ruler ticks follow the real label size, so the scale stays physical. */
const rulerTicks = (millimetres: number, step = 5): readonly number[] => {
  const ticks: number[] = [];
  for (let value = 0; value <= millimetres + 0.001; value += step) ticks.push(Math.round(value));
  const last = Math.round(millimetres);
  if (ticks[ticks.length - 1] !== last) ticks.push(last);
  return ticks;
};

function LabelCanvasElement({
  element,
  selected,
  zoom,
  previewMode,
  context,
  onPointerDownElement,
  onPointerDownHandle,
}: Readonly<{
  element: LabelElement;
  selected: boolean;
  zoom: number;
  previewMode: boolean;
  context: LabelDataContext;
  onPointerDownElement(event: ReactPointerEvent<HTMLDivElement>, element: LabelElement): void;
  onPointerDownHandle(event: ReactPointerEvent<HTMLSpanElement>, element: LabelElement, handle: ResizeHandle): void;
}>) {
  const width = mmToPreviewPx(element.widthMm, zoom);
  const height = mmToPreviewPx(element.heightMm, zoom);
  const strokeWidth = Math.max(1, mmToPreviewPx(element.style.borderWidthMm, zoom));
  const radius = mmToPreviewPx(element.style.borderRadiusMm, zoom);
  // The designer only draws a border where the printer would draw one: for the
  // explicit frame, or when the element's "show frame" option is on.
  const drawnFrame = element.showFrame && element.kind !== "frame" && element.kind !== "line";
  const style: CSSProperties = {
    left: mmToPreviewPx(element.xMm, zoom),
    top: mmToPreviewPx(element.yMm, zoom),
    width,
    height,
    zIndex: element.zIndex + 1,
    transform: element.rotation === 0 ? undefined : `rotate(${element.rotation}deg)`,
    color: element.style.color,
    borderWidth: drawnFrame ? strokeWidth : 0,
    borderStyle: drawnFrame ? "solid" : "none",
    borderColor: element.style.color,
    borderRadius: radius,
    // A hidden element stays visible on the canvas (dimmed) so it can be
    // selected again, but disappears from the print preview entirely.
    opacity: element.visible ? undefined : (previewMode ? 0 : 0.35),
  };
  const content = resolveLabelText(element, context);
  const fontSize = mmToPreviewPx(element.style.fontSizeMm, zoom);
  const textStyle: CSSProperties = {
    fontSize,
    fontWeight: element.style.fontWeight === "bold" ? 700 : 400,
    textAlign: element.style.align,
    lineHeight: 1.15,
  };

  const body = (() => {
    switch (element.kind) {
      case "text":
      case "field":
        return <p className="label-element-text" style={textStyle}>{content}</p>;

      case "qr": {
        const matrix = buildQrMatrix(content, element.errorCorrection);
        // The padding is a real quiet zone around the symbol in both the canvas
        // and the printer module size.
        const side = Math.max(1, Math.min(width, height) - 2 * mmToPreviewPx(element.paddingMm, zoom));
        if (matrix === null) {
          return <span className="label-element-placeholder">QR</span>;
        }
        return (
          <svg className="label-element-symbol" width={side} height={side} viewBox={`0 0 ${side} ${side}`} aria-hidden="true">
            <path d={qrSvgPath(matrix, side)} fill={element.style.color} />
          </svg>
        );
      }

      case "barcode": {
        const encoding = encodeCode128B(content);
        if (encoding === null) {
          return <span className="label-element-placeholder">بارکد</span>;
        }
        return (
          <svg className="label-element-symbol" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <path d={barcodeSvgPath(encoding, width, height)} fill={element.style.color} />
          </svg>
        );
      }

      case "line":
        return <span className="label-element-line" style={{ background: element.style.color }} />;

      case "frame":
        return (
          <span
            className="label-element-frame"
            style={{ borderWidth: strokeWidth, borderColor: element.style.color, borderRadius: radius }}
          />
        );

      case "image": {
        const imageStyle: CSSProperties = {
          backgroundImage: element.imagePath === null ? undefined : `url("${element.imagePath}")`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        };
        return <span className="label-element-image" style={imageStyle}><span>{element.text}</span></span>;
      }

      default:
        return null;
    }
  })();

  return (
    <div
      className={`label-element${selected && !previewMode ? " selected" : ""}${element.visible ? "" : " hidden"}`}
      data-testid={`label-element-${element.id}`}
      data-element-id={element.id}
      data-element-kind={element.kind}
      data-selected={selected && !previewMode ? "true" : "false"}
      role="group"
      aria-label={`عنصر ${element.kind}${element.binding === null ? "" : ` — ${element.binding}`}`}
      style={style}
      onPointerDown={event => onPointerDownElement(event, element)}
    >
      {body}
      {selected && !previewMode && RESIZE_HANDLES.map(handle => (
        <span
          key={handle}
          className={`label-resize-handle handle-${handle}`}
          data-testid={`label-resize-${element.id}-${handle}`}
          style={{ cursor: HANDLE_CURSOR[handle] }}
          onPointerDown={event => onPointerDownHandle(event, element, handle)}
        />
      ))}
    </div>
  );
}

/**
 * The editable label surface. Document coordinates are millimetres; pixels exist
 * only in this projection, so changing zoom can never change saved geometry.
 */
export function LabelCanvas(props: LabelCanvasProps) {
  const { document: label, selectedId, zoom, showGrid, snapToGrid, showGuides, lockGuides, previewMode, context } = props;
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (gesture === null) return;

    const handleMove = (event: PointerEvent): void => {
      const current = latest.current;
      const rawXMm = previewPxToMm(event.clientX - gesture.startClientX, current.zoom);
      const rawYMm = previewPxToMm(event.clientY - gesture.startClientY, current.zoom);
      const deltaXMm = snapMm(rawXMm, 1, current.snapToGrid);
      const deltaYMm = snapMm(rawYMm, 1, current.snapToGrid);

      if (gesture.mode === "move") {
        const moved = moveElement(gesture.origin, deltaXMm, deltaYMm, current.document);
        current.onChangeElement(gesture.id, { xMm: moved.xMm, yMm: moved.yMm });
        return;
      }

      const resized = resizeElementByDelta(gesture.origin, gesture.handle, deltaXMm, deltaYMm, current.document);
      current.onChangeElement(gesture.id, {
        xMm: resized.xMm,
        yMm: resized.yMm,
        widthMm: resized.widthMm,
        heightMm: resized.heightMm,
      });
    };

    const handleEnd = (): void => setGesture(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
    };
  }, [gesture]);

  const startGesture = (next: Gesture): void => {
    props.onSelect(next.id);
    props.onGestureStart();
    setGesture(next);
  };

  const onPointerDownElement = (event: ReactPointerEvent<HTMLDivElement>, element: LabelElement): void => {
    if (previewMode) return;
    event.preventDefault();
    event.stopPropagation();
    startGesture({
      mode: "move",
      id: element.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: element,
    });
  };

  const onPointerDownHandle = (
    event: ReactPointerEvent<HTMLSpanElement>,
    element: LabelElement,
    handle: ResizeHandle,
  ): void => {
    if (previewMode) return;
    event.preventDefault();
    event.stopPropagation();
    startGesture({
      mode: "resize",
      id: element.id,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: element,
    });
  };

  const selected = label.elements.find(element => element.id === selectedId) ?? null;
  const guideX = lockGuides || selected === null ? 50 : ((selected.xMm + selected.widthMm / 2) / label.widthMm) * 100;
  const guideY = lockGuides || selected === null ? 50 : ((selected.yMm + selected.heightMm / 2) / label.heightMm) * 100;
  const sheetWidth = mmToPreviewPx(label.widthMm, zoom);
  const sheetHeight = mmToPreviewPx(label.heightMm, zoom);

  return (
    <section className="label-canvas-panel" aria-label="بوم طراحی لیبل">
      <div className="label-canvas-grid" onPointerDown={() => props.onSelect(null)}>
        <div className="label-canvas-scroll">
          {/* The rulers and the label share one origin, so a ruler tick always
              points at the same physical millimetre as the sheet. */}
          <div
            className="label-canvas-plane"
            style={{ width: RULER_LEFT_PX + sheetWidth, height: RULER_TOP_PX + sheetHeight }}
          >
            <div className="label-ruler-corner" aria-hidden="true">mm</div>
            <div className="label-ruler-top" aria-hidden="true">
              {rulerTicks(label.widthMm).map(value => (
                <b key={value} style={{ left: mmToPreviewPx(value, zoom) }}>{value}</b>
              ))}
            </div>
            <div className="label-ruler-left" aria-hidden="true">
              {rulerTicks(label.heightMm).map(value => (
                <b key={value} style={{ top: mmToPreviewPx(value, zoom) }}>{value}</b>
              ))}
            </div>
            <div
              className={`label-sheet${previewMode ? " preview" : ""}`}
              data-testid="label-canvas-surface"
              style={{ width: sheetWidth, height: sheetHeight }}
            >
              {showGuides && !previewMode ? <>
                <span className="label-guide label-guide-v" style={{ left: `${guideX}%` }} />
                <span className="label-guide label-guide-h" style={{ top: `${guideY}%` }} />
              </> : null}
              {showGrid && !previewMode ? (
                <span
                  className="label-sheet-grid"
                  style={{ backgroundSize: `${mmToPreviewPx(1, zoom)}px ${mmToPreviewPx(1, zoom)}px` }}
                />
              ) : null}
              {label.elements.map(element => (
                <LabelCanvasElement
                  key={element.id}
                  element={element}
                  selected={element.id === selectedId}
                  zoom={zoom}
                  previewMode={previewMode}
                  context={context}
                  onPointerDownElement={onPointerDownElement}
                  onPointerDownHandle={onPointerDownHandle}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

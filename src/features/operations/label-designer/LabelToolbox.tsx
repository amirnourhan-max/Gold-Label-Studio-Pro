import {
  Braces, Circle, Eye, Grid3X3, Image as ImageIcon, LayoutGrid, Minus, MousePointer2, QrCode, ScanBarcode, Type,
} from "lucide-react";
import type { LabelElementKind } from "../../../services/label-designer/label-document";
import { zoomPercent } from "../../../services/label-designer/label-geometry";

export type LabelToolboxProps = Readonly<{
  activeTool: DesignerTool;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  showGuides: boolean;
  lockGuides: boolean;
  onZoomIn(): void;
  onZoomOut(): void;
  onSelectTool(tool: DesignerTool): void;
  onToggleGrid(): void;
  onToggleSnap(): void;
  onToggleGuides(): void;
  onToggleLockGuides(): void;
}>;

export type DesignerTool = LabelElementKind | "select";

const TOOLS: readonly Readonly<{ label: string; kind: LabelElementKind | "select"; Icon: typeof Type }>[] = [
  { label: "انتخاب", kind: "select", Icon: MousePointer2 },
  { label: "متن", kind: "text", Icon: Type },
  { label: "کد QR", kind: "qr", Icon: QrCode },
  { label: "بارکد", kind: "barcode", Icon: ScanBarcode },
  { label: "تصویر", kind: "image", Icon: ImageIcon },
  { label: "خط", kind: "line", Icon: Minus },
  { label: "شکل", kind: "frame", Icon: Circle },
  { label: "متغیر", kind: "field", Icon: Braces },
];

function Switch({ label, enabled, onToggle }: Readonly<{ label: string; enabled: boolean; onToggle(): void }>) {
  return (
    <button
      type="button"
      className={`label-switch${enabled ? " enabled" : ""}`}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
    >
      <i />
    </button>
  );
}

/** Element insertion plus the view controls that only affect the projection. */
export function LabelToolbox(props: LabelToolboxProps) {
  return (
    <aside className="label-tool-column" role="region" aria-label="ابزارهای طراحی">
      <section className="label-toolbox" role="toolbar" aria-label="فهرست ابزارهای طراحی">
        <header><b>ابزارها</b><span>⌁</span></header>
        {TOOLS.map(({ label, kind, Icon }) => (
          <button
            type="button"
            key={label}
            className={props.activeTool === kind ? "active" : ""}
            aria-pressed={props.activeTool === kind}
            title={kind === "select" ? "انتخاب و جابه‌جایی عناصر" : `افزودن ${label}`}
            onClick={() => props.onSelectTool(kind)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </section>

      <section className="label-view-settings" role="region" aria-label="تنظیمات نمایش">
        <div className="label-zoom">
          <button type="button" aria-label="کوچک‌نمایی" onClick={() => props.onZoomOut()}>−</button>
          <output aria-label="بزرگ‌نمایی">{`${zoomPercent(props.zoom)}%`}</output>
          <button type="button" aria-label="بزرگ‌نمایی" onClick={() => props.onZoomIn()}>+</button>
        </div>
        <p>
          <Grid3X3 size={16} />
          <span>نمایش شبکه</span>
          <Switch label="نمایش شبکه" enabled={props.showGrid} onToggle={() => props.onToggleGrid()} />
        </p>
        <p>
          <Eye size={16} />
          <span>چسبیدن به شبکه</span>
          <Switch label="چسبیدن به شبکه" enabled={props.snapToGrid} onToggle={() => props.onToggleSnap()} />
        </p>
        <p>
          <Circle size={16} />
          <span>راهنماها</span>
          <Switch label="راهنماها" enabled={props.showGuides} onToggle={() => props.onToggleGuides()} />
        </p>
        <p>
          <LayoutGrid size={16} />
          <span>قفل راهنماها</span>
          <Switch label="قفل راهنماها" enabled={props.lockGuides} onToggle={() => props.onToggleLockGuides()} />
        </p>
      </section>
    </aside>
  );
}

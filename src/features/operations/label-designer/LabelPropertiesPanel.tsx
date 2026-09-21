import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine, ArrowUpToLine, ChevronDown, ChevronDownIcon, ChevronUpIcon,
  Copy, Eye, EyeOff, Trash2,
} from "lucide-react";
import { ScrollPanel } from "../../../components/common";
import {
  LABEL_ERROR_CORRECTIONS,
  LABEL_MAX_FONT_MM,
  LABEL_MIN_ELEMENT_MM,
  LABEL_MIN_FONT_MM,
  LABEL_ROTATIONS,
  clampNumber,
  roundMm,
  type LabelDocument,
  type LabelElement,
  type LabelErrorCorrection,
  type LabelFontWeight,
  type LabelRotation,
  type LabelElementKind,
  type LabelTextAlign,
} from "../../../services/label-designer/label-document";
import { LABEL_FIELD_DEFINITIONS, type LabelFieldKey } from "../../../services/label-designer/label-bindings";
import type { ZOrderMove } from "../../../services/label-designer/label-editor";

export type LabelPropertiesPanelProps = Readonly<{
  label: LabelDocument;
  element: LabelElement | null;
  onUpdate(patch: Partial<Omit<LabelElement, "id">>): void;
  onUpdateLabelSize(widthMm: number, heightMm: number): void;
  onDelete(): void;
  onDuplicate(): void;
  onReorder(move: ZOrderMove): void;
  onDeselect(): void;
}>;

type Section = "content" | "position" | "symbol" | "appearance" | "order" | "label";

/** Mirrors the document model: only content-bearing elements can be bound. */
const BINDABLE_KINDS: readonly LabelElementKind[] = ["text", "field", "qr", "barcode", "image"];

const TABS: readonly Readonly<{ label: string; section: Section }>[] = [
  { label: "عمومی", section: "position" },
  { label: "متن", section: "content" },
  { label: "کد QR", section: "symbol" },
  { label: "پیشرفته", section: "appearance" },
];

/** Millimetre field that keeps the element and the panel in sync both ways. */
function MmField({
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
}: Readonly<{
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onCommit(value: number): void;
}>) {
  const [draft, setDraft] = useState(`${value}`);
  useEffect(() => setDraft(`${value}`), [value]);

  const commit = (raw: string): void => {
    const parsed = Number(raw);
    if (raw.trim().length === 0 || !Number.isFinite(parsed)) return;
    onCommit(roundMm(clampNumber(parsed, min, max)));
  };

  return (
    <label>
      {label}
      <input
        dir="ltr"
        aria-label={label}
        inputMode="decimal"
        disabled={disabled}
        value={draft}
        onChange={event => {
          setDraft(event.target.value);
          commit(event.target.value);
        }}
        onBlur={() => setDraft(`${value}`)}
      />
    </label>
  );
}

function SwitchButton({
  label,
  checked,
  disabled,
  onToggle,
}: Readonly<{ label: string; checked: boolean; disabled: boolean; onToggle(): void }>) {
  return (
    <button
      type="button"
      className={`label-switch${checked ? " enabled" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
    >
      <i />
    </button>
  );
}

export function LabelPropertiesPanel(props: LabelPropertiesPanelProps) {
  const { label, element } = props;
  const disabled = element === null;
  const sectionRefs = useRef<Record<Section, HTMLElement | null>>({
    content: null, position: null, symbol: null, appearance: null, order: null, label: null,
  });

  const scrollTo = (section: Section): void => {
    sectionRefs.current[section]?.scrollIntoView?.({ block: "nearest" });
  };

  const update = (patch: Partial<Omit<LabelElement, "id">>): void => {
    if (element === null) return;
    props.onUpdate(patch);
  };

  const style = element?.style ?? null;

  return (
    <aside className="label-properties" role="region" aria-label="خواص عنصر">
      <header><b>خواص</b><button type="button" aria-label="بستن خواص" onClick={() => props.onDeselect()}>×</button></header>
      <ScrollPanel className="label-properties-scroll" role="region" aria-label="تنظیمات خواص">
        <nav aria-label="زبانه‌های خواص">
          {TABS.map((tab, index) => (
            <button
              type="button"
              key={tab.label}
              className={index === 2 ? "active" : ""}
              onClick={() => scrollTo(tab.section)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section ref={node => { sectionRefs.current.content = node; }}>
          <h3>متن و متغیر <ChevronDown size={14} /></h3>
          <label>
            <span>متن</span>
            <input
              dir="auto"
              aria-label="متن عنصر"
              disabled={disabled}
              value={element?.text ?? ""}
              onChange={event => update({ text: event.target.value })}
            />
          </label>
          <label>
            <span>نوع داده</span>
            <select
              aria-label="نوع داده"
              disabled={disabled || element === null || !BINDABLE_KINDS.includes(element.kind)}
              value={element?.binding === null || element === null ? "static" : "variable"}
              onChange={event => update(event.target.value === "variable"
                ? { binding: element?.binding ?? "product.name" }
                : { binding: null })}
            >
              <option value="static">متن ثابت</option>
              <option value="variable">داده متغیر</option>
            </select>
          </label>
          <label>
            <span>متغیر متصل</span>
            <select
              aria-label="متغیر متصل"
              dir="ltr"
              disabled={disabled || element?.binding === null || element === null}
              value={element?.binding ?? "product.name"}
              onChange={event => update({ binding: event.target.value as LabelFieldKey })}

            >
              {LABEL_FIELD_DEFINITIONS.map(definition => (
                <option key={definition.key} value={definition.key}>{`{${definition.key}}`}</option>
              ))}
            </select>
          </label>
          <label>
            <span>اندازه فونت (mm)</span>
            <input
              dir="ltr"
              aria-label="اندازه فونت"
              inputMode="decimal"
              disabled={disabled || style === null}
              value={style?.fontSizeMm ?? 0}
              onChange={event => {
                const parsed = Number(event.target.value);
                if (Number.isFinite(parsed)) {
                  update({ style: { ...style!, fontSizeMm: roundMm(clampNumber(parsed, LABEL_MIN_FONT_MM, LABEL_MAX_FONT_MM)) } });
                }
              }}
            />
          </label>
          <div className="label-property-grid">
            <label>
              <span>وزن فونت</span>
              <select
                aria-label="وزن فونت"
                disabled={disabled || style === null}
                value={style?.fontWeight ?? "normal"}
                onChange={event => update({ style: { ...style!, fontWeight: event.target.value as LabelFontWeight } })}
              >
                <option value="normal">عادی</option>
                <option value="bold">ضخیم</option>
              </select>
            </label>
            <label>
              <span>تراز متن</span>
              <select
                aria-label="تراز متن"
                disabled={disabled || style === null}
                value={style?.align ?? "left"}
                onChange={event => update({ style: { ...style!, align: event.target.value as LabelTextAlign } })}
              >
                <option value="left">چپ</option>
                <option value="center">وسط</option>
                <option value="right">راست</option>
              </select>
            </label>
          </div>
        </section>

        <section ref={node => { sectionRefs.current.position = node; }}>
          <h3>موقعیت و اندازه <ChevronDown size={14} /></h3>
          <div className="label-property-grid">
            <MmField label="X" value={element?.xMm ?? 0} min={0} max={label.widthMm} disabled={disabled} onCommit={value => update({ xMm: value })} />
            <MmField label="Y" value={element?.yMm ?? 0} min={0} max={label.heightMm} disabled={disabled} onCommit={value => update({ yMm: value })} />
            <MmField label="W" value={element?.widthMm ?? 0} min={element?.kind === "line" ? 0.2 : LABEL_MIN_ELEMENT_MM} max={label.widthMm} disabled={disabled} onCommit={value => update({ widthMm: value })} />
            <MmField label="H" value={element?.heightMm ?? 0} min={element?.kind === "line" ? 0.2 : LABEL_MIN_ELEMENT_MM} max={label.heightMm} disabled={disabled} onCommit={value => update({ heightMm: value })} />
          </div>
          <label className="label-rotation">
            <span>چرخش</span>
            <select
              aria-label="چرخش"
              disabled={disabled}
              value={element?.rotation ?? 0}
              onChange={event => update({ rotation: Number(event.target.value) as LabelRotation })}
            >
              {LABEL_ROTATIONS.map(rotation => <option key={rotation} value={rotation}>{`${rotation}°`}</option>)}
            </select>
          </label>
        </section>

        <section ref={node => { sectionRefs.current.symbol = node; }}>
          <h3>تنظیمات کد QR <ChevronDown size={14} /></h3>
          <label>
            <span>سطح تصحیح خطا</span>
            <select
              aria-label="سطح تصحیح خطا"
              disabled={disabled}
              value={element?.errorCorrection ?? "M"}
              onChange={event => update({ errorCorrection: event.target.value as LabelErrorCorrection })}
            >
              {LABEL_ERROR_CORRECTIONS.map(level => <option key={level} value={level}>{`${level} (${level === "L" ? "7" : level === "M" ? "15" : level === "Q" ? "25" : "30"}%)`}</option>)}
            </select>
          </label>
          <MmField label="حاشیه داخلی (Padding)" value={element?.paddingMm ?? 0} min={0} max={20} disabled={disabled} onCommit={value => update({ paddingMm: value })} />
          <label>
            <span>نوع بارکد</span>
            <select aria-label="نوع بارکد" dir="ltr" disabled={disabled} value={element?.barcodeType ?? "code128"} onChange={() => update({ barcodeType: "code128" })}>
              <option value="code128">Code 128</option>
            </select>
          </label>
          <p><span>نمایش چارچوب</span><SwitchButton label="نمایش چارچوب" checked={element?.showFrame ?? false} disabled={disabled} onToggle={() => update({ showFrame: !(element?.showFrame ?? false) })} /></p>
          <p><span>نمایش مقدار زیر بارکد</span><SwitchButton label="نمایش مقدار زیر بارکد" checked={element?.humanReadable ?? false} disabled={disabled} onToggle={() => update({ humanReadable: !(element?.humanReadable ?? false) })} /></p>
        </section>

        <section ref={node => { sectionRefs.current.appearance = node; }}>
          <h3>ظاهر <ChevronDown size={14} /></h3>
          <label>
            <span>رنگ پیش‌زمینه</span>
            <input
              dir="ltr"
              type="color"
              aria-label="رنگ پیش‌زمینه"
              disabled={disabled || style === null}
              value={style?.color ?? "#000000"}
              onChange={event => update({ style: { ...style!, color: event.target.value } })}
            />
          </label>
          <label>
            <span>رنگ پس‌زمینه</span>
            <input
              dir="ltr"
              type="color"
              aria-label="رنگ پس‌زمینه"
              disabled={disabled || style === null}
              value={style?.backgroundColor ?? "#ffffff"}
              onChange={event => update({ style: { ...style!, backgroundColor: event.target.value } })}
            />
          </label>
          <MmField label="ضخامت خط" value={style?.borderWidthMm ?? 0} min={0} max={5} disabled={disabled || style === null} onCommit={value => update({ style: { ...style!, borderWidthMm: value } })} />
          <MmField label="شعاع گوشه‌ها" value={style?.borderRadiusMm ?? 0} min={0} max={20} disabled={disabled || style === null} onCommit={value => update({ style: { ...style!, borderRadiusMm: value } })} />
        </section>

        <section ref={node => { sectionRefs.current.order = node; }}>
          <h3>ترتیب و نمایش <ChevronDown size={14} /></h3>
          <div className="label-order-actions" role="group" aria-label="ترتیب لایه‌ها">
            <button type="button" aria-label="جلوی همه" disabled={disabled} onClick={() => props.onReorder("front")}><ArrowUpToLine size={14} /></button>
            <button type="button" aria-label="یک لایه جلو" disabled={disabled} onClick={() => props.onReorder("forward")}><ChevronUpIcon size={14} /></button>
            <button type="button" aria-label="یک لایه عقب" disabled={disabled} onClick={() => props.onReorder("backward")}><ChevronDownIcon size={14} /></button>
            <button type="button" aria-label="پشت همه" disabled={disabled} onClick={() => props.onReorder("back")}><ArrowDownToLine size={14} /></button>
          </div>
          <p>
            <span>نمایش عنصر</span>
            <span className="label-property-inline">
              {element?.visible === false ? <EyeOff size={15} /> : <Eye size={15} />}
              <SwitchButton label="نمایش عنصر" checked={element?.visible ?? false} disabled={disabled} onToggle={() => update({ visible: !(element?.visible ?? false) })} />
            </span>
          </p>
          <button type="button" className="label-property-action" disabled={disabled} onClick={() => props.onDuplicate()}>
            <Copy size={14} />تکرار عنصر
          </button>
        </section>

        <section ref={node => { sectionRefs.current.label = node; }}>
          <h3>اندازه لیبل <ChevronDown size={14} /></h3>
          <div className="label-property-grid">
            <MmField label="عرض لیبل" value={label.widthMm} min={1} max={500} disabled={false} onCommit={value => props.onUpdateLabelSize(value, label.heightMm)} />
            <MmField label="ارتفاع لیبل" value={label.heightMm} min={1} max={500} disabled={false} onCommit={value => props.onUpdateLabelSize(label.widthMm, value)} />
          </div>
          <p className="label-property-note"><span>ابعاد فیزیکی مستقل از بزرگ‌نمایی ذخیره می‌شود</span></p>
        </section>
      </ScrollPanel>
      <button type="button" className="label-delete-element" disabled={disabled} onClick={() => props.onDelete()}><Trash2 size={15} />حذف عنصر</button>
    </aside>
  );
}

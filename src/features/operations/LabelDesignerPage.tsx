import { useEffect, useState } from "react";
import {
  AlignHorizontalJustifyCenter, Braces, ChevronDown, ChevronLeft, Circle, Copy,
  Eye, FilePlus2, FolderOpen, Grid3X3, Image as ImageIcon, LayoutGrid, List,
  Minus, MousePointer2, Pencil, Printer, QrCode, Redo2, Save, Table2, Trash2, Type, Undo2,
} from "lucide-react";
import { designerTemplates, referenceAssets } from "../../assets/reference";
import { ScrollPanel } from "../../components/common";
import {
  approvedSavedTemplateViews,
  createDefaultTemplateGateway,
} from "../../services/label-templates/template-gateway";
import { isLabelTemplateValid, validateLabelTemplate } from "../../services/label-templates/template-validation";
import type {
  LabelTemplateDocument,
  LabelTemplateGateway,
  SavedLabelTemplateView,
} from "../../services/label-templates/template-contract";
import "./label-designer.css";

type TemplatesStatus = "loading" | "ready" | "error";

const toolbar = [
  ["جدید", FilePlus2], ["باز کردن", FolderOpen], ["ذخیره", Save], ["ذخیره نسخه", Copy],
  ["بازگشت", Undo2], ["جلو برو", Redo2], ["تراز کردن", AlignHorizontalJustifyCenter],
  ["گروه‌بندی", LayoutGrid], ["پیش نمایش", Eye], ["چاپ آزمایشی", Printer],
] as const;

const tools = [
  ["انتخاب", MousePointer2], ["متن", Type], ["کد QR", QrCode], ["تصویر", ImageIcon],
  ["خط", Minus], ["شکل", Circle], ["جدول", Table2], ["متغیر", Braces],
] as const;

function Switch({ enabled = true }: { enabled?: boolean }) {
  return <span className={`label-switch${enabled ? " enabled" : ""}`} aria-hidden="true"><i /></span>;
}

export function LabelDesignerPage() {
  const [templates, setTemplates] = useState<readonly SavedLabelTemplateView[]>(approvedSavedTemplateViews);
  const [status, setStatus] = useState<TemplatesStatus>("loading");
  const [manageMode, setManageMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    createDefaultTemplateGateway()
      .then(gateway => gateway.listTemplates())
      .then(savedTemplates => {
        if (cancelled) return;
        setTemplates(savedTemplates);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshTemplates = async (gateway: LabelTemplateGateway) => {
    setTemplates(await gateway.listTemplates());
  };

  const firstIssueMessage = (document: LabelTemplateDocument): string | null =>
    isLabelTemplateValid(document) ? null : validateLabelTemplate(document)[0]?.message ?? null;

  const handleSaveTemplate = async () => {
    const name = window.prompt("نام قالب جدید:", "قالب جدید");
    if (name === null) return;

    const document: LabelTemplateDocument = {
      name: name.trim(),
      templateKind: "product",
      widthMm: 50,
      heightMm: 30,
      elements: [],
    };
    const issue = firstIssueMessage(document);
    if (issue) {
      window.alert(issue);
      return;
    }

    const gateway = await createDefaultTemplateGateway();
    await gateway.saveTemplate(document);
    await refreshTemplates(gateway);
  };

  const handleRenameTemplate = async (template: SavedLabelTemplateView) => {
    const name = window.prompt("نام جدید قالب:", template.name);
    if (name === null || name.trim() === "" || name.trim() === template.name) return;

    const document: LabelTemplateDocument = {
      name: name.trim(),
      templateKind: template.templateKind,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      elements: [],
    };
    const issue = firstIssueMessage(document);
    if (issue) {
      window.alert(issue);
      return;
    }

    const gateway = await createDefaultTemplateGateway();
    const updated = await gateway.updateTemplate(template.id, document);
    if (!updated) {
      window.alert("قالب یافت نشد؛ فهرست تازه‌سازی شد");
    }
    await refreshTemplates(gateway);
  };

  const handleDeleteTemplate = async (template: SavedLabelTemplateView) => {
    if (!window.confirm(`قالب «${template.name}» حذف شود؟`)) return;

    const gateway = await createDefaultTemplateGateway();
    await gateway.deleteTemplate(template.id);
    await refreshTemplates(gateway);
  };

  return (
    <main className="label-designer-page" data-testid="label-designer-page">
      <div className="label-designer-toolbar" role="toolbar" aria-label="عملیات طراحی لیبل">
        {toolbar.map(([label, Icon], index) => <button type="button" key={label} className={index === 3 ? "accent" : ""} onClick={label === "ذخیره" ? handleSaveTemplate : undefined}><Icon size={19} />{label}{label === "تراز کردن" && <ChevronDown size={13} />}</button>)}
      </div>

      <div className="label-designer-grid">
        <aside className="label-tool-column" role="region" aria-label="ابزارهای طراحی">
          <section className="label-toolbox" role="toolbar" aria-label="فهرست ابزارهای طراحی">
            <header><b>ابزارها</b><span>⌁</span></header>
            {tools.map(([label, Icon], index) => <button type="button" key={label} className={index === 0 ? "active" : ""}><Icon size={20} /><span>{label}</span></button>)}
          </section>
          <section className="label-view-settings" role="region" aria-label="تنظیمات نمایش">
            <div className="label-zoom"><button type="button" aria-label="کوچک‌نمایی">−</button><output>219%</output><button type="button" aria-label="بزرگ‌نمایی">+</button></div>
            <p><Grid3X3 size={16} /><span>نمایش شبکه</span><b>⌗</b></p>
            <p><Eye size={16} /><span>چسبیدن به شبکه</span><Switch /></p>
            <p><Circle size={16} /><span>راهنماها</span><Switch /></p>
            <p><LayoutGrid size={16} /><span>قفل راهنماها</span><Switch enabled={false} /></p>
          </section>
        </aside>

        <section className="label-canvas-panel" aria-label="بوم طراحی لیبل">
          <div className="label-ruler-top"><span>mm</span>{[0,10,20,30,40,50,60,70,80,90].map(value => <b key={value}>{value}</b>)}</div>
          <div className="label-ruler-left">{[0,10,20,30,40,50,60].map(value => <b key={value}>{value}</b>)}</div>
          <div className="label-canvas-grid">
            <span className="label-guide label-guide-v" />
            <span className="label-guide label-guide-h" />
            <img src={referenceAssets.designerFullLabel} alt="لیبل انگشتر طرح گل" />
          </div>
        </section>

        <aside className="label-properties" role="region" aria-label="خواص عنصر">
          <header><b>خواص</b><button type="button" aria-label="بستن خواص">×</button></header>
          <ScrollPanel className="label-properties-scroll" role="region" aria-label="تنظیمات خواص">
            <nav aria-label="زبانه‌های خواص"><button>عمومی</button><button>متن</button><button className="active">کد QR</button><button>پیشرفته</button></nav>
            <label><span>نوع داده</span><select defaultValue="variable"><option value="variable">داده متغیر</option></select></label>
            <label><span>متغیر متصل</span><span className="label-property-input"><input dir="ltr" value="{Product.QRCode}" readOnly /><button>…</button></span></label>
            <section>
              <h3>موقعیت و اندازه <ChevronDown size={14} /></h3>
              <div className="label-property-grid"><label>X<input dir="ltr" value="54.10 mm" readOnly /></label><label>Y<input dir="ltr" value="12.30 mm" readOnly /></label><label>W<input dir="ltr" value="22.00 mm" readOnly /></label><label>H<input dir="ltr" value="22.00 mm" readOnly /></label></div>
              <label className="label-rotation"><span>چرخش</span><select defaultValue="0"><option value="0">0°</option></select></label>
            </section>
            <section>
              <h3>تنظیمات کد QR <ChevronDown size={14} /></h3>
              <label><span>سطح تصحیح خطا</span><select defaultValue="m"><option value="m">M (15%)</option></select></label>
              <label><span>حاشیه داخلی (Padding)</span><input dir="ltr" value="2.0 mm" readOnly /></label>
              <p><span>نمایش چارچوب</span><Switch /></p>
            </section>
            <section>
              <h3>ظاهر <ChevronDown size={14} /></h3>
              <label><span>رنگ پیش‌زمینه</span><input dir="ltr" value="#000000" readOnly /></label>
              <label><span>رنگ پس‌زمینه</span><input dir="ltr" value="#FFFFFF" readOnly /></label>
              <div className="label-property-grid"><label>ضخامت خط<input dir="ltr" value="0.2 mm" readOnly /></label><label>شعاع گوشه‌ها<input dir="ltr" value="1.5 mm" readOnly /></label></div>
            </section>
          </ScrollPanel>
          <button type="button" className="label-delete-element"><Trash2 size={15} />حذف عنصر</button>
        </aside>

        <section className="label-templates" aria-label="قالب‌های ذخیره‌شده">
          <header><h2>قالب‌های ذخیره‌شده</h2><span><button aria-pressed={manageMode} onClick={() => setManageMode(current => !current)}>مدیریت قالب‌ها</button><button aria-label="نمایش شبکه‌ای"><Grid3X3 size={17} /></button><button aria-label="نمایش فهرستی"><List size={17} /></button><ChevronLeft size={20} /></span></header>
          <div role="list" aria-label="قالب‌های ذخیره‌شده">
            {status === "loading" && <p className="label-templates-empty" role="status">در حال بارگذاری قالب‌ها…</p>}
            {status === "error" && <p className="label-templates-empty" role="alert">بارگذاری قالب‌ها ناموفق بود؛ داده نمایشی در حال استفاده است</p>}
            {status === "ready" && templates.length === 0 && <p className="label-templates-empty" role="status">قالب ذخیره‌شده‌ای وجود نیست</p>}
            {templates.map((template, index) => <article role="listitem" key={template.id} className={index === 0 ? "active" : ""}>
              <span className="label-template-image"><img src={designerTemplates[index] ?? designerTemplates[0]} alt={`قالب ${template.name}`} /></span>
              <span>{template.name}</span>
              {manageMode && <span className="label-template-manage">
                <button type="button" aria-label={`تغییر نام قالب ${template.name}`} onClick={() => void handleRenameTemplate(template)}><Pencil size={12} /></button>
                <button type="button" aria-label={`حذف قالب ${template.name}`} onClick={() => void handleDeleteTemplate(template)}><Trash2 size={12} /></button>
              </span>}
            </article>)}
          </div>
        </section>
      </div>
    </main>
  );
}

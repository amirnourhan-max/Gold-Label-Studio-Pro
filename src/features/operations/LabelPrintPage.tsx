import {
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Eye, Files,
  Layers3, Minus, PackageCheck, Plus, Printer, QrCode, Search, Settings2,
  SlidersHorizontal, Sparkles, Tag, Weight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { designerTemplates, referenceAssets } from "../../assets/reference";
import { displayData } from "../../services";
import { createDefaultTemplateGateway } from "../../services/label-templates/template-gateway";
import type { SavedLabelTemplateView } from "../../services/label-templates/template-contract";
import { labelPrintWorkflow, type LabelPrintWorkflow } from "../../services/printer/print-runtime";
import { inferPrinterFormat, type PrinterFormat } from "../../services/printer/printer-service";
import { createDefaultSettingsGateway } from "../../services/settings/settings-gateway";
import "./label-print-page.css";

const labelPrintTemplates = displayData.listLabelPrintTemplates();
const labelPrintQueue = displayData.listLabelPrintQueue();

/** Shown until the persisted printer setting is loaded. */
const approvedPrinterName = "Zebra ZD421";

export function LabelPrintPage({ print = labelPrintWorkflow }: { print?: LabelPrintWorkflow } = {}) {
  const [printerName, setPrinterName] = useState(approvedPrinterName);
  const [format, setFormat] = useState<PrinterFormat>(() => inferPrinterFormat(approvedPrinterName));
  const [templates, setTemplates] = useState<readonly SavedLabelTemplateView[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [copies, setCopies] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"test" | "label" | null>(null);

  /** The configured printer comes from the persisted settings, not from the page. */
  useEffect(() => {
    let cancelled = false;

    createDefaultSettingsGateway()
      .then(gateway => gateway.loadSettings())
      .then(loaded => {
        if (cancelled) return;
        const name = loaded.printer.printerName.trim().length > 0 ? loaded.printer.printerName.trim() : approvedPrinterName;
        setPrinterName(name);
        setFormat(inferPrinterFormat(name));
      })
      .catch(() => undefined);

    createDefaultTemplateGateway()
      .then(gateway => gateway.listTemplates())
      .then(list => {
        if (cancelled) return;
        setTemplates(list);
        setTemplateId(list[0] === undefined ? null : String(list[0].id));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const templateOptions: readonly { id: string; name: string }[] = templates.length > 0
    ? templates.map(template => ({ id: String(template.id), name: template.name }))
    : labelPrintTemplates.map((name, index) => ({ id: `approved-${index + 1}`, name }));

  const selectedTemplateId = templateId ?? templateOptions[0]?.id ?? "";

  const runTestPrint = async () => {
    setBusy("test");
    try {
      const outcome = await print.testPrint();
      setNotice(outcome.message);
    } finally {
      setBusy(null);
    }
  };

  const runLabelPrint = async () => {
    setBusy("label");
    try {
      const outcome = await print.printTemplateLabel({
        templateId: selectedTemplateId.length > 0 ? selectedTemplateId : null,
        copies,
      });
      setNotice(outcome.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="label-print-page" data-testid="label-print-page">
      <header className="label-print-heading">
        <div className="label-print-title"><span><Printer size={27} /></span><div><h1>چاپ لیبل</h1><p>انتخاب محصول، تنظیمات چاپ و ارسال به چاپگر</p></div></div>
        <div className="label-print-heading-actions"><button type="button"><SlidersHorizontal size={17} />تنظیمات پیشرفته</button><button type="button" className="outline"><Eye size={17} />پیش‌نمایش</button></div>
      </header>

      <section className="label-print-workspace">
        <div className="label-print-main">
          <section className="label-product-search" aria-label="انتخاب محصول برای چاپ">
            <header><div><h2>انتخاب محصول</h2><p>محصول موردنظر را با نام یا کد جستجو کنید</p></div><span><PackageCheck size={18} />۱ محصول انتخاب‌شده</span></header>
            <label className="label-search-input"><Search size={20} /><input type="search" aria-label="جستجوی محصول برای چاپ" placeholder="جستجوی نام محصول، کد یا QR Code..." /><kbd>Ctrl + K</kbd></label>
            <article className="label-selected-product" aria-label="اطلاعات محصول انتخاب‌شده">
              <img src={referenceAssets.productRegistrationRing} alt="انگشتر طرح گل" />
              <div><b>انگشتر طرح گل</b><code dir="ltr">R-250904-00125</code><p><span>گروه: انگشتر</span><i /><span>عیار: 750</span><i /><span dir="ltr">4.385 g</span></p></div>
              <span className="label-ready"><CheckCircle2 size={15} />آماده چاپ</span>
              <button type="button" aria-label="تغییر محصول"><ChevronLeft size={19} /></button>
            </article>
          </section>

          <section className="label-print-setup" aria-label="تنظیمات چاپ لیبل">
            <header><Settings2 size={20} /><h2>تنظیمات چاپ</h2><span>{format === "zpl" ? "ZPL II" : "TSPL"}</span></header>
            <div className="label-print-fields">
              <label><span>قالب لیبل</span><span className="label-field-select"><select aria-label="قالب لیبل" value={selectedTemplateId} onChange={event => setTemplateId(event.target.value)}>{templateOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select><ChevronDown size={16} /></span></label>
              <label><span>چاپگر لیبل</span><span className="label-field-select"><select aria-label="چاپگر لیبل" value={printerName} onChange={() => undefined}><option value={printerName}>{printerName}</option></select><ChevronDown size={16} /></span></label>
              <label><span>سایز لیبل</span><span className="label-field-select"><select aria-label="سایز لیبل" defaultValue="50x30"><option value="50x30">50 × 30 mm</option></select><ChevronDown size={16} /></span></label>
              <label><span>تعداد چاپ</span><span className="label-count"><button type="button" aria-label="کاهش تعداد" onClick={() => setCopies(current => Math.max(1, current - 1))}><Minus size={15} /></button><input aria-label="تعداد چاپ" type="number" min={1} value={copies} onChange={event => setCopies(Math.max(1, Number.parseInt(event.target.value, 10) || 1))} /><button type="button" aria-label="افزایش تعداد" onClick={() => setCopies(current => current + 1)}><Plus size={15} /></button></span></label>
            </div>
            <div className="label-print-mode" role="group" aria-label="حالت چاپ"><button type="button" className="active"><Tag size={17} />چاپ تکی</button><button type="button"><Files size={17} />چاپ چندتایی</button><span><i />{printerName}</span></div>
          </section>

          <section className="label-templates-print" aria-label="قالب‌های ذخیره‌شده چاپ">
            <header><div><h2>قالب‌های ذخیره‌شده</h2><p>انتخاب سریع قالب برای محصول</p></div><button type="button">مدیریت قالب‌ها <ChevronLeft size={16} /></button></header>
            <div className="label-template-list">{templateOptions.map((option, index) => <button type="button" key={option.id} className={option.id === selectedTemplateId ? "active" : ""} onClick={() => setTemplateId(option.id)}><img src={designerTemplates[index % designerTemplates.length]} alt={`قالب ${option.name}`} /><span>{option.name}</span></button>)}</div>
          </section>
        </div>

        <aside className="label-print-preview" aria-label="پیش‌نمایش لیبل">
          <header><span><Sparkles size={18} />پیش‌نمایش لیبل</span><div><button type="button" aria-label="قالب قبلی"><ChevronRight size={16} /></button><button type="button" aria-label="قالب بعدی"><ChevronLeft size={16} /></button></div></header>
          <div className="label-preview-stage"><img src={referenceAssets.productRegistrationLabel} alt="پیش‌نمایش لیبل انگشتر طرح گل" /><span className="label-qr-badge"><QrCode size={14} />QR Code</span></div>
          <dl><div><dt>کد محصول</dt><dd dir="ltr">R-250904-00125 <Copy size={13} /></dd></div><div><dt>قالب فعال</dt><dd>{templateOptions.find(option => option.id === selectedTemplateId)?.name ?? "—"}</dd></div><div><dt><Weight size={14} />وزن</dt><dd dir="ltr">4.385 g</dd></div></dl>
          <div className="label-preview-actions"><button type="button" disabled={busy !== null} onClick={() => void runTestPrint()}>{busy === "test" ? "در حال ارسال…" : "چاپ تست"}<Printer size={18} /></button><button type="button" className="primary" disabled={busy !== null} onClick={() => void runLabelPrint()}>{busy === "label" ? "در حال ارسال…" : "چاپ لیبل"}<Printer size={18} /></button></div>
          {notice !== null && <p className="label-print-notice" role="status">{notice}</p>}
          <p className="label-print-notice">لیبل با قالب انتخاب‌شده و چاپگر تنظیمات ارسال می‌شود.</p>
        </aside>
      </section>

      <section className="label-print-queue" aria-label="صف چاپ">
        <header><div><h2><Layers3 size={20} />صف چاپ</h2><span>۳ مورد</span><small className="label-print-note">صف نمایشی است و چاپ نمی‌شود</small></div><button type="button">پاک کردن صف</button></header>
        <div className="label-queue-scroll"><table><thead><tr><th>ردیف</th><th>کد محصول</th><th>نام محصول</th><th>تعداد</th><th>قالب</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{labelPrintQueue.map(([code, name, count, state, tone], index) => <tr key={code}><td>{index + 1}</td><td dir="ltr">{code}</td><td>{name}</td><td>{count}</td><td>QR — انگشتر</td><td><span className={`label-queue-state ${tone}`}>{state}</span></td><td><button type="button" aria-label={`حذف ${name}`}>×</button></td></tr>)}</tbody></table></div>
        <footer><p><span><Printer size={17} />{printerName}</span><b>{format === "zpl" ? "ZPL II" : "TSPL"}</b></p><button type="button" className="primary" disabled><Printer size={18} />چاپ همه</button></footer>
      </section>
    </main>
  );
}

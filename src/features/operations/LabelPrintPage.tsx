import {
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Eye, Files,
  Layers3, Minus, PackageCheck, Plus, Printer, QrCode, Search, Settings2,
  SlidersHorizontal, Sparkles, Tag, Weight,
} from "lucide-react";
import { designerTemplates, referenceAssets } from "../../assets/reference";
import "./label-print-page.css";

const templates = ["انگشتر", "دستبند", "گردنبند", "سرویس", "پلاک"] as const;

const queued = [
  ["R-250904-00130", "انگشتر طرح گل", "۲", "در حال چاپ", "active"],
  ["N-250904-00131", "گردنبند طلایی", "۱", "در صف", "waiting"],
  ["B-250904-00132", "دستبند کارتیه", "۳", "در صف", "waiting"],
] as const;

export function LabelPrintPage() {
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
            <header><Settings2 size={20} /><h2>تنظیمات چاپ</h2><span>صرفاً نمایشی</span></header>
            <div className="label-print-fields">
              <label><span>قالب لیبل</span><span className="label-field-select"><select aria-label="قالب لیبل" defaultValue="ring"><option value="ring">قالب QR — انگشتر</option></select><ChevronDown size={16} /></span></label>
              <label><span>چاپگر لیبل</span><span className="label-field-select"><select aria-label="چاپگر لیبل" defaultValue="zebra"><option value="zebra">Zebra ZD421</option></select><ChevronDown size={16} /></span></label>
              <label><span>سایز لیبل</span><span className="label-field-select"><select aria-label="سایز لیبل" defaultValue="50x30"><option value="50x30">50 × 30 mm</option></select><ChevronDown size={16} /></span></label>
              <label><span>تعداد چاپ</span><span className="label-count"><button type="button" aria-label="کاهش تعداد"><Minus size={15} /></button><input aria-label="تعداد چاپ" type="number" defaultValue={1} min={1} /><button type="button" aria-label="افزایش تعداد"><Plus size={15} /></button></span></label>
            </div>
            <div className="label-print-mode" role="group" aria-label="حالت چاپ"><button type="button" className="active"><Tag size={17} />چاپ تکی</button><button type="button"><Files size={17} />چاپ چندتایی</button><span><i />چاپگر آماده است</span></div>
          </section>

          <section className="label-templates-print" aria-label="قالب‌های ذخیره‌شده چاپ">
            <header><div><h2>قالب‌های ذخیره‌شده</h2><p>انتخاب سریع قالب برای محصول</p></div><button type="button">مدیریت قالب‌ها <ChevronLeft size={16} /></button></header>
            <div className="label-template-list">{templates.map((template, index) => <button type="button" key={template} className={index === 0 ? "active" : ""}><img src={designerTemplates[index]} alt={`قالب ${template}`} /><span>{template}</span></button>)}</div>
          </section>
        </div>

        <aside className="label-print-preview" aria-label="پیش‌نمایش لیبل">
          <header><span><Sparkles size={18} />پیش‌نمایش لیبل</span><div><button type="button" aria-label="قالب قبلی"><ChevronRight size={16} /></button><button type="button" aria-label="قالب بعدی"><ChevronLeft size={16} /></button></div></header>
          <div className="label-preview-stage"><img src={referenceAssets.productRegistrationLabel} alt="پیش‌نمایش لیبل انگشتر طرح گل" /><span className="label-qr-badge"><QrCode size={14} />QR Code</span></div>
          <dl><div><dt>کد محصول</dt><dd dir="ltr">R-250904-00125 <Copy size={13} /></dd></div><div><dt>قالب فعال</dt><dd>QR — انگشتر</dd></div><div><dt><Weight size={14} />وزن</dt><dd dir="ltr">4.385 g</dd></div></dl>
          <div className="label-preview-actions"><button type="button"><Printer size={18} />چاپ تست</button><button type="button" className="primary"><Printer size={18} />چاپ لیبل</button></div>
        </aside>
      </section>

      <section className="label-print-queue" aria-label="صف چاپ">
        <header><div><h2><Layers3 size={20} />صف چاپ</h2><span>۳ مورد</span></div><button type="button">پاک کردن صف</button></header>
        <div className="label-queue-scroll"><table><thead><tr><th>ردیف</th><th>کد محصول</th><th>نام محصول</th><th>تعداد</th><th>قالب</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{queued.map(([code, name, count, state, tone], index) => <tr key={code}><td>{index + 1}</td><td dir="ltr">{code}</td><td>{name}</td><td>{count}</td><td>QR — انگشتر</td><td><span className={`label-queue-state ${tone}`}>{state}</span></td><td><button type="button" aria-label={`حذف ${name}`}>×</button></td></tr>)}</tbody></table></div>
        <footer><p><span><Printer size={17} />Zebra ZD421</span><b>Ready</b></p><button type="button" className="primary"><Printer size={18} />چاپ همه</button></footer>
      </section>
    </main>
  );
}

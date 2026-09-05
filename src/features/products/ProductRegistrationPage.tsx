import { ArrowUp, ChevronDown, ChevronRight, ChevronsDown, Crosshair, Database, Home, ImagePlus, Printer, PrinterCheck, Save, ScanBarcode, Scale, Trash2, Undo2 } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { categoryAssets, referenceAssets } from "../../assets/reference";
import "./product-registration.css";

const categories = [
  { name: "انگشتر", image: categoryAssets[0], children: ["انگشتر مردانه", "انگشتر زنانه", "انگشتر نگین دار"] },
  { name: "دستبند", image: categoryAssets[1], children: ["دستبند زنانه", "دستبند مردانه"] },
  { name: "سرویس", image: categoryAssets[5], children: ["سرویس کامل", "نیم ست"] },
  { name: "گردنبند", image: categoryAssets[2], children: ["گردنبند زنانه", "گردنبند مردانه"] },
] as const;

const initialFields = {
  name: "انگشتر طرح نگین خورشیدی", code: "R-250904-00125", weight: "4.385",
  manualWeight: "4.385", purity: "750", size: "54", quantity: "1",
  maker: "کارگاه طلای پارسیان", template: "default", note: "نگین اتمی درجه یک",
};

const previewNotice = "پیش‌نمایش رابط کاربری — هیچ اطلاعاتی ذخیره یا چاپ نمی‌شود.";

export function ProductRegistrationPage() {
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(0);
  const [subcategory, setSubcategory] = useState("انگشتر زنانه");
  const [fields, setFields] = useState(initialFields);
  const [imagePreview, setImagePreview] = useState<string | null>(referenceAssets.productRegistrationRing);
  const [inInventory, setInInventory] = useState(true);
  const [notice, setNotice] = useState(previewNotice);
  const imageInput = useRef<HTMLInputElement>(null);

  const updateField = (name: keyof typeof initialFields, value: string) => setFields(current => ({ ...current, [name]: value }));
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => setImagePreview(typeof reader.result === "string" ? reader.result : null));
    reader.readAsDataURL(file);
  };
  const clearImage = () => {
    setImagePreview(null);
    if (imageInput.current) imageInput.current.value = "";
  };
  const clearForm = () => {
    setFields({ ...initialFields, name: "", code: "", weight: "", manualWeight: "", size: "", note: "" });
    setCategoryIndex(0);
    setExpandedCategory(0);
    setSubcategory("انگشتر زنانه");
    setInInventory(true);
    clearImage();
    setNotice(previewNotice);
  };

  return (
    <main className="product-registration" data-testid="product-registration-page">
      <div className="registration-main">
        <header className="registration-heading">
          <nav aria-label="مسیر صفحه"><span>محصولات</span><ChevronRight size={14} /><span>ثبت محصول</span></nav>
          <h1>ثبت محصول</h1><span className="registration-home" aria-hidden="true"><Home size={19} fill="currentColor" /></span>
        </header>

        <form className="registration-surface" aria-label="اطلاعات محصول" onSubmit={event => event.preventDefault()}>
          <h2 className="registration-surface-title">اطلاعات محصول</h2>
          <div className="registration-workspace">
            <section className="registration-categories registration-panel" aria-labelledby="registration-category-title">
              <h3 id="registration-category-title">گروه / دسته اصلی</h3>
              {categories.map((category, index) => (
                <div className="registration-category-branch" key={category.name}>
                  <button type="button" className={`registration-category-toggle${categoryIndex === index ? " selected" : ""}`} aria-expanded={expandedCategory === index} aria-controls={`registration-category-${index}`} onClick={() => {
                    setExpandedCategory(expandedCategory === index ? null : index);
                    if (categoryIndex !== index) { setCategoryIndex(index); setSubcategory(category.children[0]); }
                  }}>
                    <span className="registration-tree-arrow" aria-hidden="true">{expandedCategory === index ? "▾" : "▸"}</span>
                    <img src={category.image} alt="" /><span>{category.name}</span><ChevronDown size={15} />
                  </button>
                  {expandedCategory === index && <div className="registration-subcategories" id={`registration-category-${index}`}>
                    {category.children.map(child => <button type="button" key={child} aria-pressed={subcategory === child} onClick={() => setSubcategory(child)}>
                      <img src={category.image} alt="" /><span>{child}</span>
                    </button>)}
                  </div>}
                </div>
              ))}
            </section>

            <div className="registration-details">
              <div className="registration-identity registration-panel">
                <label className="registration-field"><span>زیرمجموعه</span><select value={subcategory} onChange={event => setSubcategory(event.target.value)}>{categories[categoryIndex].children.map(child => <option key={child}>{child}</option>)}</select></label>
                <label className="registration-field"><span><i aria-hidden="true">*</i> نام محصول</span><input aria-label="نام محصول" value={fields.name} onChange={event => updateField("name", event.target.value)} /></label>
                <label className="registration-field registration-code"><span>کد داخلی</span><span className="registration-icon-input"><input value={fields.code} onChange={event => updateField("code", event.target.value)} dir="ltr" /><ScanBarcode size={18} aria-hidden="true" /></span></label>
              </div>
              <div className="registration-measurements">
                <section className="registration-weight registration-panel" aria-label="وزن محصول">
                  <label className="registration-field" htmlFor="registration-weight"><span>وزن (گرم)</span></label>
                  <div className="registration-scale-input"><input id="registration-weight" aria-label="وزن (گرم)" inputMode="decimal" dir="ltr" value={fields.weight} onChange={event => updateField("weight", event.target.value)} /><button type="button" disabled title="فقط نمایشی؛ ترازو متصل نیست"><ArrowUp size={18} />دریافت از ترازو</button></div>
                  <label className="registration-field registration-manual-weight"><span>وزن دستی (گرم)</span><input inputMode="decimal" dir="ltr" value={fields.manualWeight} onChange={event => updateField("manualWeight", event.target.value)} /></label>
                </section>
                <section className="registration-specifications registration-panel" aria-label="مشخصات محصول">
                  <label className="registration-field"><span>عیار <i aria-hidden="true">*</i></span><select aria-label="عیار" value={fields.purity} onChange={event => updateField("purity", event.target.value)}><option value="750">750 (18K)</option><option value="875">875 (21K)</option><option value="916">916 (22K)</option></select></label>
                  <label className="registration-field"><span>سایز</span><input dir="ltr" value={fields.size} onChange={event => updateField("size", event.target.value)} /></label>
                  <label className="registration-field"><span><i aria-hidden="true">*</i> تعداد <i aria-hidden="true">*</i></span><input aria-label="تعداد" type="number" min="1" dir="ltr" value={fields.quantity} onChange={event => updateField("quantity", event.target.value)} /></label>
                </section>
              </div>
            </div>

            <div className="registration-previews">
              <section className="registration-product-image registration-panel" aria-labelledby="registration-image-title">
                <h3 id="registration-image-title">تصویر محصول</h3>
                <div className="registration-image-frame">{imagePreview ? <img src={imagePreview} alt="پیش‌نمایش تصویر محصول" /> : <ImagePlus size={40} aria-hidden="true" />}</div>
                <div className="registration-image-actions"><label htmlFor="registration-image-input">انتخاب تصویر<ImagePlus size={15} /></label><input ref={imageInput} className="registration-visually-hidden" id="registration-image-input" type="file" accept="image/*" onChange={handleImageChange} /><button type="button" onClick={clearImage}>حذف<Trash2 size={17} /></button></div>
              </section>
              <section className="registration-label-preview registration-panel" aria-labelledby="registration-label-title">
                <h3 id="registration-label-title">پیش‌نمایش لیبل (QR)</h3>
                <img src={referenceAssets.productRegistrationLabel} alt="نمونه ثابت لیبل محصول؛ کد QR نمایشی" />
              </section>
              <p className="registration-label-note registration-panel">برای تغییر چینش و طراحی لیبل به بخش «طراح لیبل» مراجعه کنید.</p>
            </div>

            <section className="registration-additional registration-panel" aria-label="اطلاعات تکمیلی">
              <label className="registration-field"><span>کارگاه / سازنده</span><select value={fields.maker} onChange={event => updateField("maker", event.target.value)}><option>کارگاه طلای پارسیان</option><option>کارگاه مرکزی</option></select></label>
              <label className="registration-field"><span>قالب لیبل</span><select value={fields.template} onChange={event => updateField("template", event.target.value)}><option value="default">قالب پیش‌فرض (QR)</option><option value="compact">قالب کوچک</option></select></label>
              <label className="registration-field registration-notes"><span>یادداشت</span><textarea aria-label="یادداشت" maxLength={300} value={fields.note} onChange={event => updateField("note", event.target.value)} /><small dir="ltr">{fields.note.length} / 300</small></label>
            </section>
            <div className="registration-inventory registration-panel"><label><span><b>وضعیت موجودی</b><small>محصول پس از ثبت به موجودی افزوده شود</small></span><input type="checkbox" aria-label="وضعیت موجودی" checked={inInventory} onChange={event => setInInventory(event.target.checked)} /></label></div>
          </div>
          <div className="registration-actions" role="group" aria-label="عملیات محصول">
            <button type="button" className="registration-print" onClick={() => setNotice(`چاپ — ${previewNotice}`)}>چاپ<Printer size={23} /></button>
            <button type="button" className="registration-save" onClick={() => setNotice(`ثبت — ${previewNotice}`)}>ثبت<Save size={22} /></button>
            <button type="button" className="registration-print-save" onClick={() => setNotice(`چاپ و ثبت — ${previewNotice}`)}>چاپ و ثبت<PrinterCheck size={24} /></button>
            <button type="button" className="registration-clear" onClick={clearForm}>پاک کردن فرم<Undo2 size={19} /></button>
          </div>
        </form>
        <p className="registration-preview-notice" role="status">{notice}</p>
      </div>

      <aside className="registration-devices" aria-label="وضعیت دستگاه‌ها">
        <h2><ChevronsDown size={15} />وضعیت دستگاه‌ها</h2>
        <section className="registration-device-card"><h3><Scale />ترازو دیجیتال</h3><p className="registration-connected">متصل <i /></p><span>وزن پایدار</span><strong className="registration-live-weight" dir="ltr">4.385 g</strong><button type="button" disabled>کالیبره<Crosshair size={17} /></button></section>
        <section className="registration-device-card"><h3><Printer />چاپگر لیبل</h3><p className="registration-connected">متصل <i /></p><span dir="ltr">Zebra ZD421</span><button type="button" disabled>تنظیمات چاپگر<ChevronRight size={17} /></button></section>
        <section className="registration-device-card"><h3><Database />پایگاه داده</h3><p className="registration-connected">متصل <i /></p><span dir="ltr">SQL Server<br />Database_Main</span><button type="button" disabled>آزمایش اتصال<ChevronRight size={17} /></button></section>
        <small className="registration-device-disclaimer">وضعیت دستگاه‌ها صرفاً نمایشی است</small>
      </aside>
    </main>
  );
}

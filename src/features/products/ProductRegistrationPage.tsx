import { ArrowUp, Check, ChevronDown, ChevronRight, ChevronsDown, Crosshair, Database, Home, ImagePlus, Plus, Printer, PrinterCheck, Save, ScanBarcode, Scale, Trash2, Undo2, X } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { categoryAssets, referenceAssets } from "../../assets/reference";
import "./product-registration.css";

const initialCategories = [
  { name: "انگشتر", image: categoryAssets[0], children: ["انگشتر مردانه", "انگشتر زنانه", "انگشتر نگین دار"] },
  { name: "دستبند", image: categoryAssets[1], children: ["دستبند زنانه", "دستبند مردانه"] },
  { name: "سرویس", image: categoryAssets[5], children: ["سرویس کامل", "نیم ست"] },
  { name: "گردنبند", image: categoryAssets[2], children: ["گردنبند زنانه", "گردنبند مردانه"] },
];

const initialMakers = ["کارگاه طلای پارسیان", "کارگاه مرکزی"];

const initialFields = {
  name: "انگشتر طرح نگین خورشیدی", code: "R-250904-00125", weight: "4.385",
  manualWeight: "4.385", purity: "750", size: "54", quantity: "1",
  maker: "کارگاه طلای پارسیان", template: "default", note: "نگین اتمی درجه یک",
};

const previewNotice = "پیش‌نمایش رابط کاربری — هیچ اطلاعاتی ذخیره یا چاپ نمی‌شود.";

export function ProductRegistrationPage() {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(0);
  const [subcategory, setSubcategory] = useState("انگشتر زنانه");
  const [fields, setFields] = useState(initialFields);
  const [imagePreview, setImagePreview] = useState<string | null>(referenceAssets.productRegistrationRing);
  const [inInventory, setInInventory] = useState(true);
  const [notice, setNotice] = useState(previewNotice);
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState("");
  const [makers, setMakers] = useState(initialMakers);
  const [makerEditorOpen, setMakerEditorOpen] = useState(false);
  const [makerDraft, setMakerDraft] = useState("");
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
  const addCategory = () => {
    const name = groupDraft.trim();
    if (!name || categories.some(category => category.name === name)) return;
    const next = { name, image: categoryAssets[0], children: ["دسته جدید"] };
    setCategories(current => [...current, next]);
    setCategoryIndex(categories.length);
    setExpandedCategory(categories.length);
    setSubcategory(next.children[0]);
    setGroupDraft("");
    setGroupEditorOpen(false);
  };
  const removeCategory = () => {
    if (categories.length === 1) return;
    const next = categories.filter((_, index) => index !== categoryIndex);
    setCategories(next);
    setCategoryIndex(0);
    setExpandedCategory(0);
    setSubcategory(next[0].children[0]);
  };
  const addMaker = () => {
    const name = makerDraft.trim();
    if (!name || makers.includes(name)) return;
    setMakers(current => [...current, name]);
    updateField("maker", name);
    setMakerDraft("");
    setMakerEditorOpen(false);
  };
  const removeMaker = () => {
    if (makers.length === 1) return;
    const next = makers.filter(maker => maker !== fields.maker);
    setMakers(next);
    updateField("maker", next[0]);
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
              <div className="registration-section-title-row">
                <h3 id="registration-category-title">گروه / دسته اصلی</h3>
                <span className="registration-inline-actions">
                  <button type="button" aria-label="افزودن گروه اصلی" title="افزودن گروه اصلی" onClick={() => setGroupEditorOpen(true)}><Plus size={14} /></button>
                  <button type="button" aria-label="حذف گروه اصلی" title="حذف گروه اصلی" disabled={categories.length === 1} onClick={removeCategory}><Trash2 size={13} /></button>
                </span>
              </div>
              {groupEditorOpen && <div className="registration-manager-row">
                <input autoFocus aria-label="نام گروه اصلی جدید" placeholder="نام گروه جدید" value={groupDraft} onChange={event => setGroupDraft(event.target.value)} onKeyDown={event => event.key === "Enter" && (event.preventDefault(), addCategory())} />
                <button type="button" aria-label="ثبت گروه اصلی" onClick={addCategory}><Check size={14} /></button>
                <button type="button" aria-label="انصراف افزودن گروه" onClick={() => { setGroupEditorOpen(false); setGroupDraft(""); }}><X size={14} /></button>
              </div>}
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
                  <label className="registration-field registration-manual-weight"><span>وزن نگین (گرم)</span><input inputMode="decimal" dir="ltr" value={fields.manualWeight} onChange={event => updateField("manualWeight", event.target.value)} /></label>
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
              <div className="registration-field registration-managed-field">
                <span className="registration-managed-label">کارگاه / سازنده <span className="registration-inline-actions"><button type="button" aria-label="افزودن کارگاه" title="افزودن کارگاه" onClick={() => setMakerEditorOpen(true)}><Plus size={13} /></button><button type="button" aria-label="حذف کارگاه" title="حذف کارگاه" disabled={makers.length === 1} onClick={removeMaker}><Trash2 size={12} /></button></span></span>
                <select aria-label="کارگاه / سازنده" value={fields.maker} onChange={event => updateField("maker", event.target.value)}>{makers.map(maker => <option key={maker}>{maker}</option>)}</select>
                {makerEditorOpen && <div className="registration-manager-row registration-maker-editor"><input autoFocus aria-label="نام کارگاه جدید" placeholder="نام کارگاه جدید" value={makerDraft} onChange={event => setMakerDraft(event.target.value)} onKeyDown={event => event.key === "Enter" && (event.preventDefault(), addMaker())} /><button type="button" aria-label="ثبت کارگاه" onClick={addMaker}><Check size={14} /></button><button type="button" aria-label="انصراف افزودن کارگاه" onClick={() => { setMakerEditorOpen(false); setMakerDraft(""); }}><X size={14} /></button></div>}
              </div>
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

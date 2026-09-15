import { ArrowUp, Check, ChevronDown, ChevronRight, ChevronsDown, Crosshair, Database, Home, ImagePlus, Plus, Printer, PrinterCheck, Save, ScanBarcode, Scale, Trash2, Undo2, X } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { categoryAssets, referenceAssets } from "../../assets/reference";
import { createDefaultCatalogGateway, type CatalogEntry, type CatalogGateway } from "../../services/catalog/catalog-gateway";
import type { EntityId } from "../../types/persistence";
import { displayData } from "../../services";
import { buildRegistrationCatalog, type RegistrationGroupOption } from "./catalog-form-service";
import { validateProductForm, type ProductFormValidationIssue } from "./product-form-validation";
import { productWorkflow } from "../../services/products/product-runtime";
import type { ProductWorkflowPort } from "../../services/products/product-service";
import "./product-registration.css";

const { initialFields, previewNotice } = displayData.getProductRegistration();

/** The approved preview opens the form with this subcategory preselected. */
const approvedDefaultCategoryName = "انگشتر زنانه";

type DefaultCategorySource = Readonly<{
  children?: readonly { id: string; name: string }[];
  categories?: readonly { id: string; name: string }[];
}>;

const defaultCategoryFor = (group: DefaultCategorySource | undefined) => {
  const children = group?.children ?? group?.categories ?? [];
  return children.find(category => category.name === approvedDefaultCategoryName) ?? children[0];
};

type CatalogFeedback = Readonly<{ tone: "error" | "empty" | "info"; text: string }> | null;

export function ProductRegistrationPage({ workflow = productWorkflow }: { workflow?: ProductWorkflowPort } = {}) {
  const catalogGateway: CatalogGateway = createDefaultCatalogGateway();
  const [catalog, setCatalog] = useState<CatalogEntry | null>(catalogGateway.peekCatalog?.() ?? null);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">(catalog ? "ready" : "loading");
  const [catalogFeedback, setCatalogFeedback] = useState<CatalogFeedback>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(catalog?.groups[0]?.id ?? null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(catalog?.groups[0]?.id ?? null);
  const [fields, setFields] = useState(initialFields);
  const [imagePreview, setImagePreview] = useState<string | null>(referenceAssets.productRegistrationRing);
  const [inInventory, setInInventory] = useState(true);
  const [notice, setNotice] = useState(previewNotice);
  const [issues, setIssues] = useState<readonly ProductFormValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState("");
  const [makerEditorOpen, setMakerEditorOpen] = useState(false);
  const [makerDraft, setMakerDraft] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);

  const groups = catalog === null ? [] : buildRegistrationCatalog(catalog).groups;
  const workshops = catalog?.workshops ?? [];
  const selectedGroup: RegistrationGroupOption | undefined = groups.find(group => group.id === selectedGroupId) ?? groups[0];
  const selectedCategory = selectedGroup?.children.find(category => category.id === selectedCategoryId) ?? defaultCategoryFor(selectedGroup);

  const refreshCatalog = (selectGroupId?: string, selectCategoryId?: string) => {
    setCatalogStatus("loading");
    catalogGateway
      .loadCatalog()
      .then(entry => {
        setCatalog(entry);
        setCatalogStatus("ready");
        setCatalogFeedback(entry.groups.length === 0 && entry.workshops.length === 0 ? { tone: "empty", text: "هیچ گروه یا کارگاهی ثبت نشده است" } : null);
        const nextGroup = selectGroupId !== undefined && entry.groups.some(group => group.id === selectGroupId)
          ? selectGroupId
          : entry.groups[0]?.id ?? null;
        setSelectedGroupId(nextGroup);
        setExpandedGroupId(current => (current === null ? nextGroup : current));
        const nextGroupEntry = entry.groups.find(group => group.id === nextGroup);
        setSelectedCategoryId(selectCategoryId ?? defaultCategoryFor(nextGroupEntry)?.id ?? null);
      })
      .catch(() => {
        setCatalogStatus("error");
        setCatalogFeedback({ tone: "error", text: "خواندن کاتالوگ ناموفق بود" });
      });
  };

  useEffect(() => {
    if (catalogStatus === "loading" && catalog === null) refreshCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const selectGroup = (group: RegistrationGroupOption) => {
    setSelectedGroupId(group.id);
    setSelectedCategoryId(defaultCategoryFor(group)?.id ?? null);
  };
  const addGroup = () => {
    const name = groupDraft.trim();
    if (!name) return;
    catalogGateway
      .addGroup(name)
      .then(newGroupId => {
        setGroupDraft("");
        setGroupEditorOpen(false);
        refreshCatalog(newGroupId);
      })
      .catch(() => setCatalogFeedback({ tone: "error", text: "افزودن گروه ناموفق بود" }));
  };
  const removeGroup = () => {
    if (selectedGroup === undefined || groups.length === 1) return;
    catalogGateway
      .removeGroup(selectedGroup.id as EntityId)
      .then(() => refreshCatalog())
      .catch(() => setCatalogFeedback({ tone: "error", text: "حذف گروه ناموفق بود" }));
  };
  const addWorkshop = () => {
    const name = makerDraft.trim();
    if (!name) return;
    catalogGateway
      .addWorkshop(name)
      .then(() => catalogGateway.loadCatalog())
      .then(entry => {
        setMakerDraft("");
        setMakerEditorOpen(false);
        setCatalog(entry);
        updateField("maker", name);
      })
      .catch(() => setCatalogFeedback({ tone: "error", text: "افزودن کارگاه ناموفق بود" }));
  };
  const removeWorkshop = () => {
    const current = workshops.find(workshop => workshop.name === fields.maker) ?? workshops[0];
    if (current === undefined || workshops.length === 1) return;
    catalogGateway
      .removeWorkshop(current.id)
      .then(() => catalogGateway.loadCatalog())
      .then(entry => {
        setCatalog(entry);
        const remaining = entry.workshops[0]?.name ?? "";
        updateField("maker", remaining);
      })
      .catch(() => setCatalogFeedback({ tone: "error", text: "حذف کارگاه ناموفق بود" }));
  };
  const submitAction = (action: () => void) => {
    const validation = validateProductForm({
      name: fields.name,
      code: fields.code,
      weight: fields.weight,
      stoneWeight: fields.manualWeight,
      purity: fields.purity,
      quantity: fields.quantity,
      groupId: selectedGroup?.id ?? null,
      categoryId: selectedCategory?.id ?? null,
      workshopId: workshops.find(workshop => workshop.name === fields.maker)?.id ?? null,
    });
    setIssues(validation.issues);
    if (validation.valid) action();
  };
  const clearForm = () => {
    setFields({ ...initialFields, name: "", code: "", weight: "", manualWeight: "", size: "", note: "" });
    setSelectedGroupId(groups[0]?.id ?? null);
    setExpandedGroupId(groups[0]?.id ?? null);
    setSelectedCategoryId(defaultCategoryFor(groups[0])?.id ?? null);
    setInInventory(true);
    clearImage();
    setNotice(previewNotice);
    setIssues([]);
  };

  const groupImageFor = (group: RegistrationGroupOption) => group.image ?? categoryAssets[0];

  const saveProduct = async (action: "ثبت" | "چاپ و ثبت") => {
    setSaving(true);
    try {
      const result = await workflow.create({
        name: fields.name,
        code: fields.code,
        weightGramText: fields.weight,
        stoneWeightGramText: fields.manualWeight,
        purity: fields.purity,
        size: fields.size,
        quantity: fields.quantity,
        imagePath: imagePreview,
        note: fields.note,
        inInventory,
        productGroupId: (selectedGroup?.id ?? null) as EntityId | null,
        mainCategoryId: (selectedCategory?.id ?? null) as EntityId | null,
        workshopId: (workshops.find(workshop => workshop.name === fields.maker)?.id ?? null) as EntityId | null,
      });
      // "چاپ و ثبت" saves the product, but no print job is sent from this form yet;
      // the notice must not claim that a label was printed.
      setNotice(result.persisted
        ? action === "چاپ و ثبت"
          ? "محصول ثبت شد؛ ارسال به چاپگر در این نسخه فعال نیست."
          : "ثبت محصول با موفقیت انجام شد."
        : `${action} — ${previewNotice}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ثبت محصول انجام نشد.");
    } finally {
      setSaving(false);
    }
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
                  <button type="button" aria-label="حذف گروه اصلی" title="حذف گروه اصلی" disabled={groups.length <= 1} onClick={removeGroup}><Trash2 size={13} /></button>
                </span>
              </div>
              {groupEditorOpen && <div className="registration-manager-row">
                <input autoFocus aria-label="نام گروه اصلی جدید" placeholder="نام گروه جدید" value={groupDraft} onChange={event => setGroupDraft(event.target.value)} onKeyDown={event => event.key === "Enter" && (event.preventDefault(), addGroup())} />
                <button type="button" aria-label="ثبت گروه اصلی" onClick={addGroup}><Check size={14} /></button>
                <button type="button" aria-label="انصراف افزودن گروه" onClick={() => { setGroupEditorOpen(false); setGroupDraft(""); }}><X size={14} /></button>
              </div>}
              {catalogStatus === "loading" && <p className="registration-catalog-status" role="status">در حال بارگذاری گروه‌ها…</p>}
              {catalogStatus === "error" && <p className="registration-catalog-status" role="alert">خطا در خواندن گروه‌ها</p>}
              {catalogStatus === "ready" && groups.length === 0 && <p className="registration-catalog-status" role="status">گروهی ثبت نشده است</p>}
              {groups.map((group, index) => (
                <div className="registration-category-branch" key={group.id}>
                  <button type="button" className={`registration-category-toggle${selectedGroup?.id === group.id ? " selected" : ""}`} aria-expanded={expandedGroupId === group.id} aria-controls={`registration-category-${index}`} onClick={() => {
                    setExpandedGroupId(current => (current === group.id ? null : group.id));
                    if (selectedGroup?.id !== group.id) selectGroup(group);
                  }}>
                    <span className="registration-tree-arrow" aria-hidden="true">{expandedGroupId === group.id ? "▾" : "▸"}</span>
                    <img src={groupImageFor(group)} alt="" /><span>{group.name}</span><ChevronDown size={15} />
                  </button>
                  {expandedGroupId === group.id && <div className="registration-subcategories" id={`registration-category-${index}`}>
                    {group.children.map(child => <button type="button" key={child.id} aria-pressed={selectedCategory?.id === child.id} onClick={() => setSelectedCategoryId(child.id)}>
                      <img src={groupImageFor(group)} alt="" /><span>{child.name}</span>
                    </button>)}
                  </div>}
                </div>
              ))}
            </section>

            <div className="registration-details">
              <div className="registration-identity registration-panel">
                <label className="registration-field"><span>زیرمجموعه</span><select value={selectedCategory?.name ?? ""} onChange={event => {
                  const match = selectedGroup?.children.find(category => category.name === event.target.value);
                  if (match) setSelectedCategoryId(match.id);
                }}>{(selectedGroup?.children ?? []).map(child => <option key={child.id}>{child.name}</option>)}</select></label>
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
                <span className="registration-managed-label">کارگاه / سازنده <span className="registration-inline-actions"><button type="button" aria-label="افزودن کارگاه" title="افزودن کارگاه" onClick={() => setMakerEditorOpen(true)}><Plus size={13} /></button><button type="button" aria-label="حذف کارگاه" title="حذف کارگاه" disabled={workshops.length === 1} onClick={removeWorkshop}><Trash2 size={12} /></button></span></span>
                <select aria-label="کارگاه / سازنده" value={fields.maker} onChange={event => updateField("maker", event.target.value)}>{workshops.map(workshop => <option key={workshop.id}>{workshop.name}</option>)}</select>
                {makerEditorOpen && <div className="registration-manager-row registration-maker-editor"><input autoFocus aria-label="نام کارگاه جدید" placeholder="نام کارگاه جدید" value={makerDraft} onChange={event => setMakerDraft(event.target.value)} onKeyDown={event => event.key === "Enter" && (event.preventDefault(), addWorkshop())} /><button type="button" aria-label="ثبت کارگاه" onClick={addWorkshop}><Check size={14} /></button><button type="button" aria-label="انصراف افزودن کارگاه" onClick={() => { setMakerEditorOpen(false); setMakerDraft(""); }}><X size={14} /></button></div>}
              </div>
              <label className="registration-field"><span>قالب لیبل</span><select value={fields.template} onChange={event => updateField("template", event.target.value)}><option value="default">قالب پیش‌فرض (QR)</option><option value="compact">قالب کوچک</option></select></label>
              <label className="registration-field registration-notes"><span>یادداشت</span><textarea aria-label="یادداشت" maxLength={300} value={fields.note} onChange={event => updateField("note", event.target.value)} /><small dir="ltr">{fields.note.length} / 300</small></label>
            </section>
            <div className="registration-inventory registration-panel"><label><span><b>وضعیت موجودی</b><small>محصول پس از ثبت به موجودی افزوده شود</small></span><input type="checkbox" aria-label="وضعیت موجودی" checked={inInventory} onChange={event => setInInventory(event.target.checked)} /></label></div>
          </div>
          <div className="registration-actions" role="group" aria-label="عملیات محصول">
            <button type="button" className="registration-print" onClick={() => submitAction(() => setNotice(`چاپ — ${previewNotice}`))}>چاپ<Printer size={23} /></button>
            <button type="button" className="registration-save" disabled={saving} onClick={() => submitAction(() => void saveProduct("ثبت"))}>ثبت<Save size={22} /></button>
            <button type="button" className="registration-print-save" disabled={saving} onClick={() => submitAction(() => void saveProduct("چاپ و ثبت"))}>چاپ و ثبت<PrinterCheck size={24} /></button>
            <button type="button" className="registration-clear" onClick={clearForm}>پاک کردن فرم<Undo2 size={19} /></button>
          </div>
          {issues.length > 0 && <p className="registration-preview-notice" role="alert">{issues.map(issue => issue.message).join(" • ")}</p>}
        </form>
        <p className="registration-preview-notice" role="status">{notice}</p>
        {catalogFeedback !== null && <p className="registration-preview-notice" role={catalogFeedback.tone === "error" ? "alert" : "status"}>{catalogFeedback.text}</p>}
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

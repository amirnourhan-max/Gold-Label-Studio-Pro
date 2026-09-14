import {
  Boxes,
  ChevronDown,
  CircleCheck,
  CirclePause,
  Eye,
  Gem,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Tags,
  Trash2,
  Weight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { referenceAssets } from "../../assets/reference";
import { productWorkflow, previewProductSnapshot } from "../../services/products/product-runtime";
import type { ProductListItem, ProductSnapshot, ProductWorkflowPort } from "../../services/products/product-service";
import "./products-page.css";

const faDigits = (value: string | number) => String(value).replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const formatWeight = (weightMg: number) => `${faDigits((weightMg / 1000).toFixed(3))} g`;

type SelectFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
};

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return <label className="products-select-field">
    <span>{label}</span>
    <span className="products-select-value">
      <select aria-label={label} value={value} onChange={event => onChange(event.target.value)} style={{ appearance: "none", border: 0, background: "transparent", color: "inherit", font: "inherit", width: "100%" }}>
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown size={14} />
    </span>
  </label>;
}

const statusLabels = {
  active: "فعال",
  pending_print: "در انتظار چاپ",
  inactive: "غیرفعال",
  packaged: "بسته‌بندی شده",
  returned: "مرجوع شده",
} as const;

function StatusBadge({ status }: { status: ProductListItem["status"] }) {
  const isActive = status === "active";
  const isPending = status === "pending_print";
  return <span className={`products-status ${isActive ? "active" : isPending ? "pending" : "inactive"}`}>{isActive ? <CircleCheck size={13} /> : <CirclePause size={13} />}{statusLabels[status]}</span>;
}

const unique = (values: readonly string[]) => [...new Set(values)];

export function ProductsPage({ workflow = productWorkflow }: { workflow?: ProductWorkflowPort }) {
  const [snapshot, setSnapshot] = useState<ProductSnapshot>(workflow === productWorkflow ? previewProductSnapshot : { source: "persistence", products: [] });
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("همه گروه‌ها");
  const [category, setCategory] = useState("همه دسته‌ها");
  const [purity, setPurity] = useState("همه عیارها");
  const [status, setStatus] = useState("همه وضعیت‌ها");

  useEffect(() => {
    let active = true;
    workflow.load().then(result => {
      if (!active) return;
      setSnapshot(result);
      setLoadState("ready");
    }).catch(error => {
      if (!active) return;
      setErrorMessage(error instanceof Error ? error.message : "بارگذاری محصولات انجام نشد.");
      setLoadState("error");
    });
    return () => { active = false; };
  }, [workflow]);

  const products = snapshot.products;
  const groupOptions = ["همه گروه‌ها", ...unique(products.map(product => product.group))];
  const categoryOptions = ["همه دسته‌ها", ...unique(products.map(product => product.category))];
  const purityOptions = ["همه عیارها", ...unique(products.map(product => String(product.purityPerMille)))];
  const statusOptions = ["همه وضعیت‌ها", ...unique(products.map(product => statusLabels[product.status]))];

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fa");
    return products.filter(product => {
      const matchesQuery = !needle || [product.name, product.code, product.group, product.category].some(value => value.toLocaleLowerCase("fa").includes(needle));
      return matchesQuery
        && (group === "همه گروه‌ها" || product.group === group)
        && (category === "همه دسته‌ها" || product.category === category)
        && (purity === "همه عیارها" || String(product.purityPerMille) === purity)
        && (status === "همه وضعیت‌ها" || statusLabels[product.status] === status);
    });
  }, [products, query, group, category, purity, status]);

  const stats = snapshot.source === "preview" ? [
    { label: "کل محصولات", value: "۸۷۱", detail: "۱۲ محصول جدید امروز", Icon: Boxes, tone: "gold" },
    { label: "وزن کل موجودی", value: "۲,۷۹۵.۴۸۰ g", detail: "بر مبنای محصولات فعال", Icon: Weight, tone: "blue" },
    { label: "گروه‌های فعال", value: "۷", detail: "در ۲۴ دسته اصلی", Icon: Tags, tone: "purple" },
    { label: "نیازمند بررسی", value: "۱۲", detail: "لیبل یا وضعیت ناقص", Icon: CirclePause, tone: "red" },
  ] : [
    { label: "کل محصولات", value: faDigits(products.length), detail: "محصول ثبت‌شده", Icon: Boxes, tone: "gold" },
    { label: "وزن کل موجودی", value: formatWeight(products.filter(product => product.status === "active").reduce((sum, product) => sum + product.weightMg, 0)), detail: "بر مبنای محصولات فعال", Icon: Weight, tone: "blue" },
    { label: "گروه‌های فعال", value: faDigits(unique(products.map(product => product.group).filter(value => value !== "—")).length), detail: "گروه‌های دارای محصول", Icon: Tags, tone: "purple" },
    { label: "نیازمند بررسی", value: faDigits(products.filter(product => product.status !== "active").length), detail: "وضعیت غیرفعال یا ناقص", Icon: CirclePause, tone: "red" },
  ];

  const removeProduct = async (product: ProductListItem) => {
    try {
      setSnapshot(await workflow.softDelete(product.id));
      setLoadState("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "حذف محصول انجام نشد.");
      setLoadState("error");
    }
  };

  return <main className="products-page" data-testid="products-page">
    <header className="products-heading">
      <div className="products-heading-copy">
        <span className="products-heading-icon"><Gem size={24} /></span>
        <div><h1>محصولات</h1><p>مدیریت موجودی، گروه‌بندی و مشخصات محصولات</p></div>
      </div>
      <div className="products-heading-actions">
        <span className="preview-pill"><CircleCheck size={14} /> {snapshot.source === "preview" ? "صرفاً نمایشی" : "متصل به پایگاه داده"}</span>
        <button className="products-add-button"><Plus size={17} /> افزودن محصول جدید</button>
      </div>
    </header>

    <section className="products-stats" aria-label="آمار محصولات">
      {stats.map(({ label, value, detail, Icon, tone }) => <article className={`products-stat ${tone}`} key={label}>
        <span><Icon size={22} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div>
      </article>)}
    </section>

    <section className="products-filter-panel" aria-label="فیلتر محصولات">
      <div className="products-filter-heading"><span><SlidersHorizontal size={17} /> جستجو و فیلتر محصولات</span><small>{snapshot.source === "preview" ? "نمایش ۷ مورد از ۸۷۱ محصول" : `نمایش ${faDigits(filteredProducts.length)} مورد از ${faDigits(products.length)} محصول`}</small></div>
      <div className="products-filter-controls">
        <label className="products-search"><Search size={18} /><input type="search" aria-label="جستجوی محصولات" placeholder="جستجو با نام محصول، کد یا گروه..." value={query} onChange={event => setQuery(event.target.value)} /></label>
        <SelectField label="گروه" value={group} options={groupOptions} onChange={setGroup} />
        <SelectField label="دسته اصلی" value={category} options={categoryOptions} onChange={setCategory} />
        <SelectField label="عیار" value={purity} options={purityOptions} onChange={setPurity} />
        <SelectField label="وضعیت" value={status} options={statusOptions} onChange={setStatus} />
      </div>
    </section>

    <section className="products-table-panel" aria-labelledby="products-table-title">
      <header><div><h2 id="products-table-title">فهرست محصولات</h2><p>آخرین محصولات ثبت‌شده در موجودی</p></div><span>به‌روزرسانی: امروز، ۱۰:۲۴</span></header>
      <div className="products-table-scroll">
        <table aria-label="فهرست محصولات">
          <thead><tr><th>ردیف</th><th>تصویر</th><th>کد محصول</th><th>نام محصول</th><th>گروه</th><th>دسته اصلی</th><th>عیار</th><th>وزن</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>
            {loadState === "error" && <tr><td colSpan={10}>{errorMessage}</td></tr>}
            {loadState === "loading" && products.length === 0 && <tr><td colSpan={10}>در حال بارگذاری محصولات...</td></tr>}
            {loadState === "ready" && filteredProducts.length === 0 && <tr><td colSpan={10}>محصولی یافت نشد.</td></tr>}
            {filteredProducts.map((product, index) => <tr key={product.id}>
              <td>{faDigits(index + 1)}</td>
              <td><span className="products-image"><img src={product.imagePath || referenceAssets.productRegistrationRing} alt="" /></span></td>
              <td><code>{product.code}</code></td>
              <td><strong>{product.name}</strong></td>
              <td>{product.group}</td><td>{product.category}</td><td>{faDigits(product.purityPerMille)}</td><td><b>{formatWeight(product.weightMg)}</b></td>
              <td><StatusBadge status={product.status} /></td>
              <td><div className="products-row-actions">
                <button aria-label={`مشاهده ${product.name}`}><Eye size={16} /></button>
                <button aria-label={`ویرایش ${product.name}`}><Pencil size={15} /></button>
                <button className="danger" aria-label={`حذف ${product.name}`} onClick={() => void removeProduct(product)}><Trash2 size={15} /></button>
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <footer><span>{snapshot.source === "preview" ? "تمام عملیات این صفحه صرفاً نمایشی هستند." : "تغییرات محصولات در پایگاه داده ذخیره می‌شوند."}</span><div><button aria-label="صفحه قبل">‹</button><button className="current">۱</button><button>۲</button><button>۳</button><button aria-label="صفحه بعد">›</button></div></footer>
    </section>
  </main>;
}

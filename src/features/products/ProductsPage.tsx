import {
  Boxes, ChevronDown, CircleCheck, CirclePause, Eye, Gem, Pencil, Plus,
  Search, SlidersHorizontal, Tags, Trash2, Weight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { referenceAssets } from "../../assets/reference";
import { formatWeightMg } from "../../services/database/weight";
import type { ProductListItem } from "../../services/product-catalog";
import type { ProductStatus } from "../../types";
import { useProductCatalog } from "./ProductCatalogProvider";
import "./products-page.css";

const statusLabels = {
  active: "فعال",
  pending_print: "در انتظار چاپ",
  inactive: "غیرفعال",
  packaged: "بسته‌بندی‌شده",
  returned: "مرجوع‌شده",
} as const satisfies Record<ProductListItem["status"], ProductStatus>;

const toPersian = (value: number): string => new Intl.NumberFormat("fa-IR", { useGrouping: true }).format(value);
const weightForDisplay = (weightMg: number): string => `${formatWeightMg(weightMg).replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]!)} g`;

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="products-select-field"><span>{label}</span><span className="products-select-value"><select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select><ChevronDown size={14} /></span></label>;
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const isActive = status === "فعال" || status === "بسته‌بندی‌شده";
  const isPending = status === "در انتظار چاپ";
  return <span className={`products-status ${isActive ? "active" : isPending ? "pending" : "inactive"}`}>{isActive ? <CircleCheck size={13} /> : <CirclePause size={13} />}{status}</span>;
}

export function ProductsPage({ onNewProduct }: { onNewProduct: () => void }) {
  const { service, source, revision } = useProductCatalog();
  const [products, setProducts] = useState<readonly ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [category, setCategory] = useState("all");
  const [purity, setPurity] = useState("all");
  const [status, setStatus] = useState("all");

  const loadProducts = async () => {
    if (!service) return;
    setLoading(true);
    try { setProducts(await service.listProducts()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "بارگذاری محصولات ناموفق بود."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadProducts(); }, [service, revision]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fa");
    return products.filter(product => {
      const matchesQuery = !normalized || [product.name, product.code, product.group, product.category, product.workshop]
        .some(value => value.toLocaleLowerCase("fa").includes(normalized));
      return matchesQuery
        && (group === "all" || product.group === group)
        && (category === "all" || product.category === category)
        && (purity === "all" || String(product.purity) === purity)
        && (status === "all" || product.status === status);
    });
  }, [category, group, products, purity, query, status]);

  const totalWeightMg = products.filter(product => product.status !== "inactive").reduce((sum, product) => sum + product.weightMg, 0);
  const groups = [...new Set(products.map(product => product.group))];
  const categories = [...new Set(products.filter(product => group === "all" || product.group === group).map(product => product.category))];
  const purities = [...new Set(products.map(product => product.purity))].sort((a, b) => a - b);
  const reviewCount = products.filter(product => product.status !== "active").length;
  const stats = [
    { label: "کل محصولات", value: toPersian(products.length), detail: "محصول ثبت‌شده در پایگاه داده", Icon: Boxes, tone: "gold" },
    { label: "وزن کل موجودی", value: weightForDisplay(totalWeightMg), detail: "بر مبنای محصولات فعال", Icon: Weight, tone: "blue" },
    { label: "گروه‌های فعال", value: toPersian(groups.length), detail: `در ${toPersian(new Set(products.map(product => product.category)).size)} دسته اصلی`, Icon: Tags, tone: "purple" },
    { label: "نیازمند بررسی", value: toPersian(reviewCount), detail: "لیبل یا وضعیت ناقص", Icon: CirclePause, tone: "red" },
  ] as const;

  const removeProduct = async (product: ProductListItem) => {
    if (!service) return;
    try { await service.softDeleteProduct(product.id); await loadProducts(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "حذف محصول ناموفق بود."); }
  };

  return <main className="products-page" data-testid="products-page">
    <header className="products-heading">
      <div className="products-heading-copy">
        <span className="products-heading-icon"><Gem size={24} /></span>
        <div><h1>محصولات</h1><p>مدیریت موجودی، گروه‌بندی و مشخصات محصولات</p></div>
      </div>
      <div className="products-heading-actions">
        <span className="preview-pill"><CircleCheck size={14} /> {source === "sqlite" ? "اطلاعات پایگاه داده" : "حالت پیش‌نمایش"}</span>
        <button type="button" className="products-add-button" onClick={onNewProduct}><Plus size={17} /> افزودن محصول جدید</button>
      </div>
    </header>

    <section className="products-stats" aria-label="آمار محصولات">
      {stats.map(({ label, value, detail, Icon, tone }) => <article className={`products-stat ${tone}`} key={label}>
        <span><Icon size={22} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div>
      </article>)}
    </section>

    <section className="products-filter-panel" aria-label="فیلتر محصولات">
      <div className="products-filter-heading"><span><SlidersHorizontal size={17} /> جستجو و فیلتر محصولات</span><small>نمایش {toPersian(filteredProducts.length)} مورد از {toPersian(products.length)} محصول</small></div>
      <div className="products-filter-controls">
        <label className="products-search"><Search size={18} /><input type="search" aria-label="جستجوی محصولات" value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجو با نام محصول، کد یا گروه..." /></label>
        <SelectField label="گروه" value={group} onChange={value => { setGroup(value); setCategory("all"); }} options={[{ value: "all", label: "همه گروه‌ها" }, ...groups.map(value => ({ value, label: value }))]} />
        <SelectField label="دسته اصلی" value={category} onChange={setCategory} options={[{ value: "all", label: "همه دسته‌ها" }, ...categories.map(value => ({ value, label: value }))]} />
        <SelectField label="عیار" value={purity} onChange={setPurity} options={[{ value: "all", label: "همه عیارها" }, ...purities.map(value => ({ value: String(value), label: toPersian(value) }))]} />
        <SelectField label="وضعیت" value={status} onChange={setStatus} options={[{ value: "all", label: "همه وضعیت‌ها" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} />
      </div>
    </section>

    <section className="products-table-panel" aria-labelledby="products-table-title">
      <header><div><h2 id="products-table-title">فهرست محصولات</h2><p>آخرین محصولات ثبت‌شده در موجودی</p></div><span>{error ?? (loading ? "در حال به‌روزرسانی..." : "اطلاعات به‌روز است")}</span></header>
      <div className="products-table-scroll">
        <table aria-label="فهرست محصولات">
          <thead><tr><th>ردیف</th><th>تصویر</th><th>کد محصول</th><th>نام محصول</th><th>گروه</th><th>دسته اصلی</th><th>عیار</th><th>وزن</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>{filteredProducts.map((product, index) => <tr key={product.id}>
            <td>{toPersian(index + 1)}</td>
            <td><span className="products-image"><img src={product.image ?? referenceAssets.productRegistrationRing} alt="" /></span></td>
            <td><code>{product.code}</code></td>
            <td><strong>{product.name}</strong></td>
            <td>{product.group}</td><td>{product.category}</td><td>{toPersian(product.purity)}</td><td><b>{weightForDisplay(product.weightMg)}</b></td>
            <td><StatusBadge status={statusLabels[product.status]} /></td>
            <td><div className="products-row-actions">
              <button type="button" aria-label={`مشاهده ${product.name}`}><Eye size={16} /></button>
              <button type="button" aria-label={`ویرایش ${product.name}`}><Pencil size={15} /></button>
              <button type="button" className="danger" aria-label={`حذف ${product.name}`} onClick={() => void removeProduct(product)}><Trash2 size={15} /></button>
            </div></td>
          </tr>)}{!loading && filteredProducts.length === 0 && <tr><td colSpan={10}>محصولی مطابق فیلترهای انتخاب‌شده یافت نشد.</td></tr>}</tbody>
        </table>
      </div>
      <footer><span>{error ? `خطا: ${error}` : "حذف محصولات به‌صورت نرم انجام می‌شود."}</span><div><button aria-label="صفحه قبل">‹</button><button className="current">۱</button><button>۲</button><button>۳</button><button aria-label="صفحه بعد">›</button></div></footer>
    </section>
  </main>;
}

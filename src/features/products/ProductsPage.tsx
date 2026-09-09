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
import { displayData } from "../../services";
import type { ProductStatus } from "../../types";
import "./products-page.css";

const productRows = displayData.listProducts();

const stats = [
  { label: "کل محصولات", value: "۸۷۱", detail: "۱۲ محصول جدید امروز", Icon: Boxes, tone: "gold" },
  { label: "وزن کل موجودی", value: "۲,۷۹۵.۴۸۰ g", detail: "بر مبنای محصولات فعال", Icon: Weight, tone: "blue" },
  { label: "گروه‌های فعال", value: "۷", detail: "در ۲۴ دسته اصلی", Icon: Tags, tone: "purple" },
  { label: "نیازمند بررسی", value: "۱۲", detail: "لیبل یا وضعیت ناقص", Icon: CirclePause, tone: "red" },
] as const;

function SelectField({ label, value }: { label: string; value: string }) {
  return <label className="products-select-field"><span>{label}</span><span className="products-select-value">{value}<ChevronDown size={14} /></span></label>;
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const isActive = status === "فعال";
  const isPending = status === "در انتظار چاپ";
  return <span className={`products-status ${isActive ? "active" : isPending ? "pending" : "inactive"}`}>{isActive ? <CircleCheck size={13} /> : <CirclePause size={13} />}{status}</span>;
}

export function ProductsPage() {
  return <main className="products-page" data-testid="products-page">
    <header className="products-heading">
      <div className="products-heading-copy">
        <span className="products-heading-icon"><Gem size={24} /></span>
        <div><h1>محصولات</h1><p>مدیریت موجودی، گروه‌بندی و مشخصات محصولات</p></div>
      </div>
      <div className="products-heading-actions">
        <span className="preview-pill"><CircleCheck size={14} /> صرفاً نمایشی</span>
        <button className="products-add-button"><Plus size={17} /> افزودن محصول جدید</button>
      </div>
    </header>

    <section className="products-stats" aria-label="آمار محصولات">
      {stats.map(({ label, value, detail, Icon, tone }) => <article className={`products-stat ${tone}`} key={label}>
        <span><Icon size={22} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div>
      </article>)}
    </section>

    <section className="products-filter-panel" aria-label="فیلتر محصولات">
      <div className="products-filter-heading"><span><SlidersHorizontal size={17} /> جستجو و فیلتر محصولات</span><small>نمایش ۷ مورد از ۸۷۱ محصول</small></div>
      <div className="products-filter-controls">
        <label className="products-search"><Search size={18} /><input type="search" aria-label="جستجوی محصولات" placeholder="جستجو با نام محصول، کد یا گروه..." /></label>
        <SelectField label="گروه" value="همه گروه‌ها" />
        <SelectField label="دسته اصلی" value="همه دسته‌ها" />
        <SelectField label="عیار" value="همه عیارها" />
        <SelectField label="وضعیت" value="همه وضعیت‌ها" />
      </div>
    </section>

    <section className="products-table-panel" aria-labelledby="products-table-title">
      <header><div><h2 id="products-table-title">فهرست محصولات</h2><p>آخرین محصولات ثبت‌شده در موجودی</p></div><span>به‌روزرسانی: امروز، ۱۰:۲۴</span></header>
      <div className="products-table-scroll">
        <table aria-label="فهرست محصولات">
          <thead><tr><th>ردیف</th><th>تصویر</th><th>کد محصول</th><th>نام محصول</th><th>گروه</th><th>دسته اصلی</th><th>عیار</th><th>وزن</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>{productRows.map((product) => <tr key={product.code}>
            <td>{product.id}</td>
            <td><span className="products-image"><img src={product.image} alt="" /></span></td>
            <td><code>{product.code}</code></td>
            <td><strong>{product.name}</strong></td>
            <td>{product.group}</td><td>{product.category}</td><td>{product.purity}</td><td><b>{product.weight}</b></td>
            <td><StatusBadge status={product.status} /></td>
            <td><div className="products-row-actions">
              <button aria-label={`مشاهده ${product.name}`}><Eye size={16} /></button>
              <button aria-label={`ویرایش ${product.name}`}><Pencil size={15} /></button>
              <button className="danger" aria-label={`حذف ${product.name}`}><Trash2 size={15} /></button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      <footer><span>تمام عملیات این صفحه صرفاً نمایشی هستند.</span><div><button aria-label="صفحه قبل">‹</button><button className="current">۱</button><button>۲</button><button>۳</button><button aria-label="صفحه بعد">›</button></div></footer>
    </section>
  </main>;
}

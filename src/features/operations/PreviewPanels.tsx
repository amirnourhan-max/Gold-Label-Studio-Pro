import { Play, Square, Trash2, FileText } from "lucide-react";
import { referenceAssets } from "../../assets/reference";

export function PackageLabelPreview() {
  return <aside className="package-label-panel"><h2>پیش‌نمایش لیبل بسته</h2>
    <img className="package-label-reference" src={referenceAssets.packageLabel} alt="پیش‌نمایش کامل لیبل بسته" />
  </aside>;
}

export function ReturnsSummary() {
  return <aside className="returns-detail"><section><h2>آخرین محصول</h2><div className="last-product"><img src={referenceAssets.productRegistrationRing} alt="انگشتر طرح گل"/><div><b>انگشتر طرح گل</b><p dir="ltr">R-250904-00125</p><span dir="ltr">4.385 g</span></div></div></section>
    <section><h2>خلاصه جلسه</h2>{[["تعداد کل","128"],["وزن کل","483.725 g"],["تعداد خطا","7"],["درصد موفقیت","94.82%"]].map(([name,value])=><p className="summary-value" key={name}><span>{name}</span><b dir="ltr">{value}</b></p>)}</section>
  </aside>;
}

export function ReturnsActions() {
  return <div className="returns-action-row" aria-label="عملیات مرجوع کالا">
    <button type="button" className="green" disabled><Play/>شروع</button>
    <button type="button" className="danger" disabled><Square/>توقف</button>
    <button type="button" disabled><Trash2/>حذف آخرین</button>
    <button type="button" className="gold" disabled><FileText/>پایان و گزارش</button>
  </div>;
}

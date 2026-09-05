import { Printer, Play, Square, Trash2, FileText } from "lucide-react";
import { referenceAssets } from "../../assets/reference";

export function PackageLabelPreview() {
  return <aside className="package-label-panel"><h2>پیش‌نمایش لیبل بسته</h2>
    <div className="package-label-sheet"><img className="package-brand" src={referenceAssets.brandDiamond} alt="لوگوی الماس Gold Label" />
      <strong dir="ltr">GOLD LABEL<br/>STUDIO PRO</strong><p>کد بسته</p><b dir="ltr">PK-250604-00125</b>
      <div className="package-label-totals"><span>تعداد اقلام<b>12</b></span><span>وزن کل<b dir="ltr">483.725 g</b></span></div>
      <p className="label-placeholder">جایگاه QR و بارکد بسته</p>
    </div>
  </aside>;
}

export function OutboundSummary() {
  return <aside className="outbound-detail"><section><h2>آخرین محصول</h2><div className="last-product"><img src={referenceAssets.productRegistrationRing} alt="انگشتر طرح گل"/><div><b>انگشتر طرح گل</b><p dir="ltr">R-250904-00125</p><span dir="ltr">4.385 g</span></div></div></section>
    <section><h2>خلاصه جلسه</h2>{[["تعداد کل","128"],["وزن کل","483.725 g"],["تعداد خطا","7"],["درصد موفقیت","94.82%"]].map(([name,value])=><p className="summary-value" key={name}><span>{name}</span><b dir="ltr">{value}</b></p>)}</section>
  </aside>;
}

export function OutboundActions() {
  return <div className="outbound-action-row" aria-label="عملیات خروج کالا">
    <button type="button" className="green" disabled><Play/>شروع</button>
    <button type="button" className="danger" disabled><Square/>توقف</button>
    <button type="button" disabled><Trash2/>حذف آخرین</button>
    <button type="button" className="gold" disabled><FileText/>پایان و گزارش</button>
  </div>;
}

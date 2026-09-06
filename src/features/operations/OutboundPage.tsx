import {
  ArrowLeft, Barcode, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, FileText, LogOut, Play, Scale, ScanBarcode,
  Square, Trash2, TriangleAlert, X, XCircle,
} from "lucide-react";
import { referenceAssets } from "../../assets/reference";
import "./outbound-page.css";

const scans = [
  ["۱", "10:24:31", "R-250904-00125", "انگشتر طرح گل", "انگشتر", "4.385 g", "موفق"],
  ["۲", "10:23:47", "R-250904-00124", "دستبند کارتیه", "دستبند", "8.340 g", "موفق"],
  ["۳", "10:22:18", "R-250904-00125", "انگشتر طرح گل", "انگشتر", "4.385 g", "بارکد تکراری"],
  ["۴", "10:21:05", "R-250904-00123", "گردنبند قلب", "گردنبند", "3.215 g", "موفق"],
  ["۵", "10:20:01", "R-250904-00122", "دستبند النگویی", "دستبند", "5.670 g", "موفق"],
  ["۶", "10:19:33", "R-250904-00124", "دستبند کارتیه", "دستبند", "8.340 g", "بارکد تکراری"],
  ["۷", "10:18:55", "R-250904-00121", "آویز پروانه", "آویز", "2.950 g", "موفق"],
  ["۸", "10:18:12", "R-250904-00120", "زنجیر طنابی", "زنجیر", "7.120 g", "موفق"],
] as const;

const metrics = [
  { label: "تعداد اسکن شده", value: "۱۲۸", trend: "↑ ۱۲٪", Icon: Barcode, tone: "blue" },
  { label: "جمع وزن", value: "483.725 g", trend: "↑ ۱۱٪", Icon: Scale, tone: "gold" },
  { label: "تعداد خطا", value: "۷", trend: "↑ ۴", Icon: TriangleAlert, tone: "red" },
  { label: "زمان جلسه", value: "۰۰:۲۴:۱۸", trend: "", Icon: Clock3, tone: "green" },
] as const;

function ScannerArtwork() {
  return <svg className="outbound-scanner-art" viewBox="0 0 150 120" aria-hidden="true">
    <defs><radialGradient id="scanner-light"><stop offset="0" stopColor="#e8b44b" stopOpacity=".58"/><stop offset="1" stopColor="#e8b44b" stopOpacity="0"/></radialGradient></defs>
    <path className="scanner-beam" d="M55 35 L145 4 L145 90 Z" fill="url(#scanner-light)"/>
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M25 28h49c13 0 22 8 22 20v9c0 7-6 13-13 13H58L48 108H29l9-44c-10-4-16-12-16-23 0-5 1-9 3-13Z"/>
      <path d="M34 28v14h34"/><rect x="67" y="36" width="21" height="22" rx="6"/><path d="m44 70 18 7"/>
    </g>
  </svg>;
}

export function OutboundPage() {
  return <main className="outbound-workspace" data-testid="outbound-page">
    <header className="outbound-heading">
      <div className="outbound-title"><span><LogOut size={22}/></span><div><h1>خروج کالا</h1><p>اسکن و ثبت خروج محصولات از انبار</p></div></div>
      <div className="outbound-heading-actions"><button type="button" className="outbound-help"><CircleHelp size={16}/>راهنما</button><button type="button" className="outbound-back"><ArrowLeft size={17}/>بازگشت</button></div>
    </header>

    <section className="outbound-metrics" aria-label="آمار جلسه خروج کالا" role="list">
      {metrics.map(({ label, value, trend, Icon, tone }) => <article key={label} role="listitem" className={`outbound-metric ${tone}`}>
        <span className="outbound-metric-icon"><Icon size={27}/></span><div><small>{label}</small><strong dir={value.includes("g") ? "ltr" : undefined}>{value}</strong>{trend ? <em>{trend}</em> : null}</div>
      </article>)}
    </section>

    <section className="outbound-scan-panel" aria-label="اسکن بارکد خروج کالا">
      <ScannerArtwork/><div className="outbound-scan-copy"><h2>منتظر اسکن...</h2><p>بارکد محصول را اسکن کنید</p><label><ScanBarcode size={23}/><input aria-label="بارکد محصول" placeholder="اسکن کنید یا بارکد را وارد نمایید" /></label><small>برای اسکن سریع‌تر از بارکدخوان استفاده کنید</small></div>
    </section>

    <section className="outbound-feedback">
      <article className="outbound-error" role="alert" aria-label="بارکد تکراری"><span><X size={28}/></span><div><b>بارکد تکراری</b><p>این بارکد قبلاً ثبت شده است</p><small dir="ltr">کد:　R-250904-00125　|　10:34:22</small></div></article>
      <article className="outbound-success" role="status" aria-label="اسکن موفق"><span><Check size={28}/></span><div><b>اسکن موفق</b><p>انگشتر طرح گل</p><small dir="ltr">R-250904-00125　|　4.385 g</small></div><img src={referenceAssets.productRegistrationRing} alt="تصویر محصول اسکن‌شده" /></article>
    </section>

    <section className="outbound-lower">
      <section className="outbound-history"><h2>آخرین اسکن‌ها</h2><table aria-label="آخرین اسکن‌های خروج کالا"><thead><tr><th>ردیف</th><th>زمان</th><th>کد</th><th>نام محصول</th><th>گروه</th><th>وزن</th><th>وضعیت</th></tr></thead><tbody>{scans.map(row => {
        const duplicate = row[6] === "بارکد تکراری";
        return <tr key={`${row[0]}-${row[2]}`} className={duplicate ? "duplicate" : undefined}>{row.slice(0, 6).map((cell, index) => <td key={index} dir={index === 1 || index === 2 || index === 5 ? "ltr" : undefined}>{cell}</td>)}<td><span className={duplicate ? "scan-state duplicate" : "scan-state ok"}>{duplicate ? <XCircle size={14}/> : <CheckCircle2 size={14}/>} {row[6]}</span></td></tr>;
      })}</tbody></table><footer><label><i>نمایش</i><span><b>۵۰</b>⌄</span><i>مورد</i></label><nav aria-label="صفحه‌بندی اسکن‌ها"><button aria-label="صفحه بعد"><ChevronRight size={15}/></button><button>۱</button><button>۲</button><button>۳</button><button aria-label="صفحه قبل"><ChevronLeft size={15}/></button></nav></footer></section>

      <aside className="outbound-details" aria-label="جزئیات جلسه خروج کالا">
        <section className="outbound-latest"><h2><i/>آخرین محصول</h2><div><img src={referenceAssets.productRegistrationRing} alt="انگشتر طرح گل"/><article><b>انگشتر طرح گل</b><code dir="ltr">R-250904-00125</code><p><span>گروه<em>انگشتر</em></span><span>وزن<em dir="ltr">4.385 g</em></span></p></article></div></section>
        <section className="outbound-session"><h2>خلاصه جلسه</h2>{[["تعداد کل","۱۲۸",Barcode,"blue"],["وزن کل","483.725 g",Scale,"gold"],["تعداد خطا","۷",TriangleAlert,"red"],["درصد موفقیت","۹۴.۸۲٪",CheckCircle2,"green"]].map(([name,value,Icon,tone]) => { const MetricIcon = Icon as typeof Barcode; return <p key={name as string}><MetricIcon size={16} className={tone as string}/><span>{name as string}</span><b dir="ltr">{value as string}</b></p>; })}</section>
      </aside>
    </section>

    <div className="outbound-actions" role="toolbar" aria-label="عملیات خروج کالا">
      <button type="button" className="start"><Play size={21} fill="currentColor"/>شروع</button><button type="button" className="stop"><Square size={20} fill="currentColor"/>توقف</button><button type="button" className="remove"><Trash2 size={21}/>حذف آخرین</button><button type="button" className="report"><FileText size={21}/>پایان و گزارش</button>
    </div>
  </main>;
}

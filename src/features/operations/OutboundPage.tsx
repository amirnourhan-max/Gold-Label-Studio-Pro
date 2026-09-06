import {
  ArrowLeft, Barcode, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, FileText, Play, RotateCcw, Scale, ScanBarcode,
  Square, TriangleAlert, Undo2, X, XCircle,
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
  { label: "تعداد اسکن شده", value: "۱۲۸", trend: "↑ ۱۲٪", Icon: Barcode, tone: "tone-blue" },
  { label: "وزن کل مرجوع", value: "483.725 g", trend: "↑ ۱۱٪", Icon: Scale, tone: "tone-gold" },
  { label: "تعداد خطا", value: "۷", trend: "↑ ۴", Icon: TriangleAlert, tone: "tone-red" },
  { label: "زمان جلسه", value: "۰۰:۲۴:۱۸", trend: "", Icon: Clock3, tone: "tone-green" },
] as const;

function ScannerArtwork({ compact = false }: { compact?: boolean }) {
  const gradientId = compact ? "reader-light" : "scanner-light";
  return <svg className={compact ? "outbound-reader-art" : "outbound-scanner-art"} viewBox="0 0 150 120" role={compact ? "img" : undefined} aria-label={compact ? "بارکدخوان متصل" : undefined} aria-hidden={compact ? undefined : "true"}>
    <defs><radialGradient id={gradientId}><stop offset="0" stopColor="#e8b44b" stopOpacity=".58"/><stop offset="1" stopColor="#e8b44b" stopOpacity="0"/></radialGradient></defs>
    <path className="scanner-beam" d="M55 35 L145 4 L145 90 Z" fill={`url(#${gradientId})`}/>
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M25 28h49c13 0 22 8 22 20v9c0 7-6 13-13 13H58L48 108H29l9-44c-10-4-16-12-16-23 0-5 1-9 3-13Z"/>
      <path d="M34 28v14h34"/><rect x="67" y="36" width="21" height="22" rx="6"/><path d="m44 70 18 7"/>
    </g>
  </svg>;
}

export function OutboundPage() {
  return <main className="outbound-workspace" data-testid="outbound-page">
    <header className="outbound-heading">
      <div className="outbound-title"><span><RotateCcw size={22}/></span><div><h1>مرجوع کالا</h1><p>اسکن و ثبت مرجوع محصولات به انبار</p></div></div>
      <div className="outbound-heading-actions"><button type="button" className="outbound-help"><CircleHelp size={16}/>راهنما</button><button type="button" className="outbound-back"><ArrowLeft size={17}/>بازگشت</button></div>
    </header>

    <section className="outbound-metrics" aria-label="آمار جلسه مرجوع کالا" role="list">
      {metrics.map(({ label, value, trend, Icon, tone }) => <article key={label} role="listitem" className={`outbound-metric ${tone}`}>
        <span className="outbound-metric-icon"><Icon size={27}/></span><div><small>{label}</small><strong dir={value.includes("g") ? "ltr" : undefined}>{value}</strong>{trend ? <em>{trend}</em> : null}</div>
      </article>)}
    </section>

    <section className="outbound-content">
      <div className="outbound-primary">
        <section className="outbound-scan-panel" aria-label="اسکن بارکد مرجوع کالا">
          <img className="outbound-scanner-reference" src={referenceAssets.barcodeScannerReference} alt="بارکدخوان مرجع"/><div className="outbound-scan-copy"><h2>منتظر اسکن بارکد هستیم...</h2><p>بارکد محصول را اسکن کنید</p><label><ScanBarcode size={23}/><input aria-label="بارکد محصول" placeholder="اسکن کنید یا بارکد را وارد نمایید" /></label><small>برای اسکن سریع‌تر از بارکدخوان استفاده کنید</small></div>
        </section>

        <section className="outbound-feedback">
          <article className="outbound-error" role="alert" aria-label="بارکد تکراری"><span><X size={28}/></span><div><b>بارکد تکراری</b><p>این بارکد قبلاً ثبت شده است</p><small dir="ltr">کد:　R-250904-00125　|　10:22:18</small></div></article>
          <article className="outbound-success" role="status" aria-label="اسکن موفق"><span><Check size={28}/></span><div><b>اسکن موفق</b><p>ثبت مرجوع با موفقیت انجام شد</p><small dir="ltr">R-250904-00125　|　4.385 g</small></div><img src={referenceAssets.productRegistrationRing} alt="تصویر محصول اسکن‌شده" /></article>
        </section>

        <section className="outbound-history"><h2>آخرین اسکن‌ها</h2><table aria-label="آخرین اسکن‌های مرجوع کالا"><thead><tr><th>ردیف</th><th>زمان</th><th>کد محصول</th><th>نام محصول</th><th>گروه</th><th>وزن</th><th>وضعیت</th></tr></thead><tbody>{scans.map(row => {
        const duplicate = row[6] === "بارکد تکراری";
        return <tr key={`${row[0]}-${row[2]}`} className={duplicate ? "duplicate" : undefined}>{row.slice(0, 6).map((cell, index) => <td key={index} dir={index === 1 || index === 2 || index === 5 ? "ltr" : undefined}>{cell}</td>)}<td><span className={duplicate ? "scan-state duplicate" : "scan-state ok"}>{duplicate ? <XCircle size={14}/> : <CheckCircle2 size={14}/>} {row[6]}</span></td></tr>;
      })}</tbody></table><footer><label><i>نمایش</i><span><b>۵۰</b>⌄</span><i>مورد</i></label><nav aria-label="صفحه‌بندی اسکن‌ها"><button aria-label="صفحه بعد"><ChevronRight size={15}/></button><button>۱</button><button>۲</button><button>۳</button><button aria-label="صفحه قبل"><ChevronLeft size={15}/></button></nav></footer></section>

        <div className="outbound-actions" role="toolbar" aria-label="عملیات مرجوع کالا">
          <button type="button" className="start"><Play size={21} fill="currentColor"/>شروع</button><button type="button" className="stop"><Square size={20} fill="currentColor"/>توقف</button><button type="button" className="remove"><Undo2 size={21}/>بازگشت آخرین</button><button type="button" className="report"><FileText size={21}/>پایان و گزارش</button>
        </div>
      </div>

      <aside className="outbound-details" aria-label="جزئیات جلسه مرجوع کالا">
        <section className="outbound-latest"><h2><i/>آخرین محصول اسکن شده</h2><div><img src={referenceAssets.productRegistrationRing} alt="انگشتر طرح گل"/><article><b>انگشتر طرح گل</b><code dir="ltr">R-250904-00125</code><strong dir="ltr">4.385 g <small>وزن</small></strong><p><span>گروه</span><em>انگشتر</em></p></article></div></section>
        <section className="outbound-reader"><h2><i/>وضعیت اتصال بارکدخوان</h2><div><span><img className="outbound-reader-reference" src={referenceAssets.barcodeScannerReference} alt="بارکدخوان متصل"/></span><article><b>متصل</b><p dir="ltr">COM3　|　9600</p><button type="button">تست اتصال</button></article></div></section>
        <section className="outbound-session"><h2>خلاصه جلسه</h2>{[["تعداد کل","۱۲۸",Barcode,"tone-blue"],["وزن کل مرجوع","483.725 g",Scale,"tone-gold"],["تعداد خطا","۷",TriangleAlert,"tone-red"],["درصد موفقیت","۹۴.۸۲٪",CheckCircle2,"tone-green"]].map(([name,value,Icon,tone]) => { const MetricIcon = Icon as typeof Barcode; return <p key={name as string}><MetricIcon size={16} className={tone as string}/><span>{name as string}</span><b dir="ltr">{value as string}</b></p>; })}</section>
      </aside>
    </section>
  </main>;
}

import { Check, ScanBarcode, X } from "lucide-react";
import "./operations-preview.css";
import "./reference-layout.css";
import { OutboundSummary, OutboundActions } from "./PreviewPanels";
import { LabelDesignerPage } from "./LabelDesignerPage";
import { PackagingPage } from "./PackagingPage";

type Mode = "label-print" | "label-designer" | "packaging" | "outbound" | "products" | "reports" | "settings";
const products = ["انگشتر طرح گل", "دستبند طرح قلب", "گردنبند طرح پروانه", "سرویس طرح نگین", "پلاک طرح اسم", "گوشواره طرح حلقه"];

export function OperationsPreviewPage({ mode }: { mode: Mode }) {
  if (mode === "label-designer") return <LabelDesignerPage />;
  if (mode === "packaging") return <PackagingPage />;
  if (mode !== "outbound") return <UtilityPage mode={mode} />;
  return <Outbound />;
}

function UtilityPage({ mode }: { mode: Exclude<Mode, "label-designer" | "packaging" | "outbound"> }) {
  const titles: Record<typeof mode, string> = { "label-print": "چاپ لیبل", products: "محصولات", reports: "گزارش‌ها", settings: "تنظیمات" };
  const title = titles[mode];
  return <main className="ops-page utility-page"><header className="ops-title"><div><small>Gold Label Studio Pro</small><h1>{title}</h1><p>پیش‌نمایش رابط کاربری</p></div><button>راهنما　?</button></header><section className="utility-hero"><h2>{mode === "label-print" ? "آماده چاپ لیبل‌ها" : `مدیریت ${title}`}</h2><p>این بخش مطابق زبان بصری تأییدشده‌ی برنامه طراحی شده و فعلاً بدون عملیات واقعی است.</p><div className="utility-search"><input placeholder={mode === "label-print" ? "جستجوی کد محصول یا بسته..." : `جستجو در ${title}...`} /><button>جستجو</button></div></section><section className="data-panel"><h2>آخرین موارد</h2><table><thead><tr><th>#</th><th>کد</th><th>عنوان</th><th>وضعیت</th><th>تاریخ</th><th>عملیات</th></tr></thead><tbody>{products.map((p,i)=><tr key={p}><td>{i+1}</td><td>GL-250904-00{i+1}</td><td>{p}</td><td className="good">آماده</td><td>۱۴۰۴/۰۶/۱۳</td><td><button className="table-action">مشاهده</button></td></tr>)}</tbody></table></section></main>;
}

function Outbound(){return <main className="ops-page outbound-page"><header className="ops-title"><div><small>انبار</small><h1>خروج کالا</h1><p>اسکن و ثبت خروج محصولات از انبار</p></div><button>بازگشت　‹</button></header><div className="metrics">{[["تعداد اسکن شده","128"],["جمع وزن","483.725 g"],["تعداد خطا","7"],["زمان جلسه","00:24:18"]].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div><section className="outbound-scan"><h2>منتظر اسکن...</h2><p>بارکد محصول را اسکن کنید</p><div><ScanBarcode/><input placeholder="بارکد را وارد نمایید"/></div></section><div className="alerts"><article className="success"><Check/><b>اسکن موفق</b><span>انگشتر طرح گل　R-250904-00125　|　4.385 g</span></article><article className="error"><X/><b>بارکد تکراری</b><span>این بارکد قبلاً ثبت شده است</span></article></div><section className="data-panel"><h2>آخرین اسکن‌ها</h2><table><thead><tr><th>ردیف</th><th>زمان</th><th>کد</th><th>نام محصول</th><th>وزن</th><th>وضعیت</th></tr></thead><tbody>{products.slice(0,5).map((p,i)=><tr key={p}><td>{i+1}</td><td>10:2{i}:31</td><td>R-250904-0012{i}</td><td>{p}</td><td>4.385 g</td><td className={i===2?"bad":"good"}>{i===2?"بارکد تکراری":"موفق ✓"}</td></tr>)}</tbody></table></section><OutboundSummary/><OutboundActions/></main>}

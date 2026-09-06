import "./operations-preview.css";
import "./reference-layout.css";
import { LabelDesignerPage } from "./LabelDesignerPage";
import { PackagingPage } from "./PackagingPage";
import { OutboundPage } from "./OutboundPage";

type Mode = "label-print" | "label-designer" | "packaging" | "outbound" | "products" | "reports" | "settings";
const products = ["انگشتر طرح گل", "دستبند طرح قلب", "گردنبند طرح پروانه", "سرویس طرح نگین", "پلاک طرح اسم", "گوشواره طرح حلقه"];

export function OperationsPreviewPage({ mode }: { mode: Mode }) {
  if (mode === "label-designer") return <LabelDesignerPage />;
  if (mode === "packaging") return <PackagingPage />;
  if (mode === "outbound") return <OutboundPage />;
  return <UtilityPage mode={mode} />;
}

function UtilityPage({ mode }: { mode: Exclude<Mode, "label-designer" | "packaging" | "outbound"> }) {
  const titles: Record<typeof mode, string> = { "label-print": "چاپ لیبل", products: "محصولات", reports: "گزارش‌ها", settings: "تنظیمات" };
  const title = titles[mode];
  return <main className="ops-page utility-page"><header className="ops-title"><div><small>Gold Label Studio Pro</small><h1>{title}</h1><p>پیش‌نمایش رابط کاربری</p></div><button>راهنما　?</button></header><section className="utility-hero"><h2>{mode === "label-print" ? "آماده چاپ لیبل‌ها" : `مدیریت ${title}`}</h2><p>این بخش مطابق زبان بصری تأییدشده‌ی برنامه طراحی شده و فعلاً بدون عملیات واقعی است.</p><div className="utility-search"><input placeholder={mode === "label-print" ? "جستجوی کد محصول یا بسته..." : `جستجو در ${title}...`} /><button>جستجو</button></div></section><section className="data-panel"><h2>آخرین موارد</h2><table><thead><tr><th>#</th><th>کد</th><th>عنوان</th><th>وضعیت</th><th>تاریخ</th><th>عملیات</th></tr></thead><tbody>{products.map((p,i)=><tr key={p}><td>{i+1}</td><td>GL-250904-00{i+1}</td><td>{p}</td><td className="good">آماده</td><td>۱۴۰۴/۰۶/۱۳</td><td><button className="table-action">مشاهده</button></td></tr>)}</tbody></table></section></main>;
}

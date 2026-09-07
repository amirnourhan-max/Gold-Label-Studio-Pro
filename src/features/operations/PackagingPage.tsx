import {
  Box, CheckCircle2, CircleHelp, Clock3, Copy, Hash, Keyboard, PackageCheck,
  PackagePlus, Printer, QrCode, ScanLine, Trash2, UserRound, Weight, XCircle,
} from "lucide-react";
import { categoryAssets, referenceAssets } from "../../assets/reference";
import "./packaging-page.css";

const packageItems = [
  ["R-250604-00125", "انگشتر طرح گل", "انگشتر", "750", "4.385 g"],
  ["B-250604-00087", "دستبند کارتیر", "دستبند", "750", "8.340 g"],
  ["N-250604-00056", "گردنبند طلا توپ قلب", "گردنبند", "750", "3.215 g"],
  ["G-250604-00031", "گوشواره حلقه‌ای", "گوشواره", "750", "2.870 g"],
  ["R-250604-00126", "انگشتر طرح پیچ", "انگشتر", "750", "4.102 g"],
  ["P-250604-00099", "پلاک اسم محمد", "پلاک", "750", "1.950 g"],
] as const;

export function PackagingPage() {
  return (
    <main className="packaging-workspace" data-testid="packaging-page">
      <div className="packaging-main">
        <header className="packaging-heading">
          <Box size={33} strokeWidth={1.75} />
          <div><h1>بسته‌بندی</h1><p>اسکن محصولات و ایجاد بسته جدید</p></div>
        </header>

        <section className="packaging-scan-card" aria-label="روش افزودن محصول">
          <section className="packaging-qr-path" aria-label="اسکن QR محصول">
            <h2><QrCode size={19} /> اسکن محصول (QR Code)</h2>
            <p>کد QR محصول را مقابل اسکنر قرار دهید</p>
            <div className="packaging-scan-frame"><ScanLine size={56} strokeWidth={1.65} /><b>آماده اسکن</b><small>منتظر دریافت کد محصول</small></div>
          </section>
          <div className="packaging-or"><span>یا</span></div>
          <section className="packaging-manual-path" aria-label="ورود دستی کد محصول" data-testid="packaging-manual-entry">
            <h2><Keyboard size={19} /> ورود دستی کد محصول</h2>
            <p>در صورت عدم امکان اسکن، کد را به صورت دستی وارد کنید</p>
            <label htmlFor="manual-package-code"><span>کد محصول</span><span className="manual-input"><input id="manual-package-code" aria-label="کد محصول دستی" dir="ltr" placeholder="کد محصول را وارد کنید..." /><Keyboard size={18} /></span></label>
            <button type="button"><PackagePlus size={18} />افزودن به بسته</button>
          </section>
        </section>

        <div className="packaging-actions" role="group" aria-label="عملیات بسته">
          <button type="button" className="create"><PackagePlus size={18} />ایجاد بسته جدید</button>
          <button type="button" className="finish"><CheckCircle2 size={18} />پایان بسته‌بندی</button>
          <button type="button"><Printer size={18} />چاپ لیبل بسته</button>
          <button type="button" className="remove"><Trash2 size={18} />حذف آخرین اسکن</button>
        </div>

        <section className="packaging-table-card">
          <header><h2>لیست اقلام اسکن شده</h2><span>۶ قلم</span></header>
          <div className="packaging-items-scroll" data-testid="packaging-items-scroll">
            <table aria-label="اقلام اسکن‌شده بسته">
              <thead><tr><th>ردیف</th><th>کد محصول</th><th>نام محصول</th><th>گروه</th><th>عیار</th><th>وزن (گرم)</th><th>وضعیت</th><th>عملیات</th></tr></thead>
              <tbody>{packageItems.map((item, index) => <tr key={item[0]}><td>{index + 1}</td><td dir="ltr">{item[0]}</td><td>{item[1]}</td><td>{item[2]}</td><td>{item[3]}</td><td dir="ltr">{item[4]}</td><td><span className="packaging-added"><CheckCircle2 size={14} />اسکن موفق</span></td><td><button type="button" aria-label={`حذف ${item[1]}`}><Trash2 size={16} /></button></td></tr>)}</tbody>
            </table>
          </div>
          <footer><span>۶ قلم</span><span>جمع کل</span><b dir="ltr">24.862 g</b><span>750 عیار</span></footer>
        </section>

        <div className="packaging-feedback">
          <article className="duplicate" role="alert" aria-label="محصول تکراری">
            <header><span><XCircle size={18} /><b>اسکن تکراری</b></span><time dir="ltr">10:24:18</time></header>
            <div><img src={referenceAssets.productRegistrationRing} alt="تصویر محصول تکراری" /><p>این محصول قبلاً در بسته فعلی اسکن شده است<small dir="ltr">R-250604-00125</small></p></div>
          </article>
          <article className="accepted" role="status" aria-label="اسکن موفق">
            <header><span><CheckCircle2 size={18} /><b>اسکن موفق</b></span><time dir="ltr">10:24:15</time></header>
            <div><img src={categoryAssets[4]} alt="تصویر محصول اسکن‌شده" /><p>پلاک اسم محمد به بسته اضافه شد<small dir="ltr">P-250604-00099　|　1.850 g</small></p></div>
          </article>
        </div>
      </div>

      <aside className="packaging-sidebar">
        <section className="package-information" role="complementary" aria-label="اطلاعات بسته جاری" data-testid="current-package-panel">
          <h2><span>اطلاعات بسته جاری</span><CircleHelp size={19} /></h2>
          <dl>
            <div><dt><Hash size={15} />کد بسته</dt><dd dir="ltr">PK-250604-00125 <Copy size={15} /></dd></div>
            <div><dt><Box size={15} />تعداد اقلام</dt><dd>۶ قلم</dd></div>
            <div><dt><Weight size={15} />وزن کل</dt><dd dir="ltr">24.862 g</dd></div>
            <div><dt><UserRound size={15} />اپراتور</dt><dd>Admin <small>اپراتور ارشد</small></dd></div>
            <div><dt><Clock3 size={15} />زمان سپری شده</dt><dd dir="ltr">00:14:37</dd></div>
          </dl>
          <p className="package-status"><i />در حال بسته‌بندی</p>
        </section>

        <section className="package-label-preview">
          <h2><Printer size={20} /> پیش‌نمایش لیبل بسته</h2>
          <div className="package-label-art">
            <img src={referenceAssets.packageLabel} alt="لیبل بسته PK-250604-00125" />
          </div>
          <button type="button"><Printer size={18} />چاپ لیبل بسته</button>
        </section>
      </aside>
    </main>
  );
}

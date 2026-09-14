import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  ArrowLeft, Barcode, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Play, RotateCcw, Scale, ScanBarcode,
  Square, TriangleAlert, Undo2, X, XCircle,
} from "lucide-react";
import { referenceAssets } from "../../assets/reference";
import { PageContainer, ScrollPanel } from "../../components/common";
import {
  previewReturnWorkflowSnapshot, returnWorkflow,
} from "../../services/returns/return-workflow-runtime";
import type { ReturnWorkflowPort, ReturnWorkflowSnapshot } from "../../services/returns/return-workflow-service";
import "./returns-page.css";

const emptySnapshot: ReturnWorkflowSnapshot = {
  session: null, scans: [], summary: { itemCount: 0, totalWeightMg: 0, errorCount: 0, scanCount: 0 },
};

const faDigits = (value: string | number) => String(value).replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
const weightText = (weightMg: number | null) => weightMg === null ? "—" : `${(weightMg / 1000).toFixed(3)} g`;
const scanTime = (timestamp: string) => timestamp.slice(11, 19);

function elapsedText(snapshot: ReturnWorkflowSnapshot): string {
  if (snapshot.session?.id === "preview-return-session") return "۰۰:۲۴:۱۸";
  if (!snapshot.session) return "۰۰:۰۰:۰۰";
  const end = snapshot.session.endedAt ? Date.parse(snapshot.session.endedAt) : Date.now();
  const seconds = Math.max(0, Math.floor((end - Date.parse(snapshot.session.startedAt)) / 1000));
  const parts = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  return faDigits(parts.map(part => String(part).padStart(2, "0")).join(":"));
}

function successPercent(snapshot: ReturnWorkflowSnapshot): string {
  if (snapshot.session?.id === "preview-return-session") return "۹۴.۸۲٪";
  if (snapshot.summary.scanCount === 0) return "۰٪";
  return `${faDigits((snapshot.summary.itemCount / snapshot.summary.scanCount * 100).toFixed(2))}٪`;
}

export function ReturnsPage({ workflow = returnWorkflow }: { workflow?: ReturnWorkflowPort }) {
  const usingPreview = workflow === returnWorkflow;
  const [snapshot, setSnapshot] = useState<ReturnWorkflowSnapshot>(usingPreview ? previewReturnWorkflowSnapshot : emptySnapshot);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "load-error" | "operation-error">(usingPreview ? "ready" : "loading");
  const [, setClockTick] = useState(0);
  const [barcode, setBarcode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!usingPreview) setLoadState("loading");
    workflow.load().then(next => {
      if (active) { setSnapshot(next); setLoadState("ready"); }
    }).catch(() => {
      if (active) setLoadState("load-error");
    });
    return () => { active = false; };
  }, [usingPreview, workflow]);

  useEffect(() => {
    if (usingPreview || snapshot.session?.status !== "open") return;
    const timer = window.setInterval(() => setClockTick(tick => tick + 1), 1000);
    return () => window.clearInterval(timer);
  }, [snapshot.session?.id, snapshot.session?.status, usingPreview]);

  const latestAccepted = useMemo(() => snapshot.scans.find(scan => scan.scanStatus === "accepted") ?? null, [snapshot.scans]);
  const latestError = useMemo(() => snapshot.scans.find(scan => scan.scanStatus !== "accepted") ?? null, [snapshot.scans]);
  const scanTitle = loadState === "loading" ? "در حال بارگذاری اطلاعات جلسه..." : loadState === "load-error" ? "خطا در بارگذاری اطلاعات جلسه" : loadState === "operation-error" ? "خطا در ثبت اسکن یا عملیات" : "منتظر اسکن بارکد هستیم...";
  const metrics = [
    { label: "تعداد اسکن شده", value: faDigits(snapshot.summary.itemCount), trend: "↑ ۱۲٪", Icon: Barcode, tone: "tone-blue" },
    { label: "وزن کل مرجوع", value: weightText(snapshot.summary.totalWeightMg), trend: "↑ ۱۱٪", Icon: Scale, tone: "tone-gold" },
    { label: "تعداد خطا", value: faDigits(snapshot.summary.errorCount), trend: "↑ ۴", Icon: TriangleAlert, tone: "tone-red" },
    { label: "زمان جلسه", value: elapsedText(snapshot), trend: "", Icon: Clock3, tone: "tone-green" },
  ] as const;

  const run = async (operation: () => Promise<ReturnWorkflowSnapshot>) => {
    if (busy) return;
    setBusy(true);
    try { setSnapshot(await operation()); setLoadState("ready"); }
    catch { setLoadState("operation-error"); }
    finally { setBusy(false); }
  };

  const submitScan = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !barcode.trim()) return;
    event.preventDefault();
    const code = barcode.trim();
    setBarcode("");
    void run(() => workflow.scan(code));
  };

  return <PageContainer className="returns-workspace" data-testid="returns-page">
    <header className="returns-heading">
      <div className="returns-title"><span><RotateCcw size={22}/></span><div><h1>مرجوع کالا</h1><p>اسکن و ثبت مرجوع محصولات به انبار</p></div></div>
      <div className="returns-heading-actions"><button type="button" className="returns-help"><CircleHelp size={16}/>راهنما</button><button type="button" className="returns-back"><ArrowLeft size={17}/>بازگشت</button></div>
    </header>

    <section className="returns-metrics" aria-label="آمار جلسه مرجوع کالا" role="list">
      {metrics.map(({ label, value, trend, Icon, tone }) => <article key={label} role="listitem" className={`returns-metric ${tone}`}>
        <span className="returns-metric-icon"><Icon size={27}/></span><div><small>{label}</small><strong dir={value.includes("g") ? "ltr" : undefined}>{value}</strong>{trend ? <em>{trend}</em> : null}</div>
      </article>)}
    </section>

    <section className="returns-content">
      <div className="returns-primary">
        <section className="returns-scan-panel" aria-label="اسکن بارکد مرجوع کالا">
          <img className="returns-scanner-reference" src={referenceAssets.barcodeScannerReference} alt="بارکدخوان مرجع"/><div className="returns-scan-copy"><h2>{scanTitle}</h2><p>بارکد محصول را اسکن کنید</p><label><ScanBarcode size={23}/><input aria-label="بارکد محصول" placeholder="اسکن کنید یا بارکد را وارد نمایید" value={barcode} onChange={event => setBarcode(event.target.value)} onKeyDown={submitScan} /></label><small>برای اسکن سریع‌تر از بارکدخوان استفاده کنید</small></div>
        </section>

        <section className="returns-results" aria-label="نتایج اسکن مرجوع کالا">
          <section className="returns-feedback">
            <article className="returns-error" role="alert" aria-label="بارکد تکراری"><span><X size={28}/></span><div><b>{latestError?.scanStatus === "rejected" ? "بارکد نامعتبر" : "بارکد تکراری"}</b><p>{latestError?.scanStatus === "rejected" ? "محصولی با این بارکد پیدا نشد" : "این بارکد قبلاً ثبت شده است"}</p><small dir="ltr">{latestError ? `کد:　${latestError.scannedCode}　|　${scanTime(latestError.scannedAt)}` : "کد:　—"}</small></div></article>
            <article className="returns-success" role="status" aria-label="اسکن موفق"><span><Check size={28}/></span><div><b>اسکن موفق</b><p>ثبت مرجوع با موفقیت انجام شد</p><small dir="ltr">{latestAccepted ? `${latestAccepted.scannedCode}　|　${weightText(latestAccepted.weightMgSnapshot)}` : "—　|　0.000 g"}</small></div><img src={referenceAssets.productRegistrationRing} alt="تصویر محصول اسکن‌شده" /></article>
          </section>

          <section className="returns-history"><h2>آخرین اسکن‌ها</h2><ScrollPanel className="returns-history-scroll" role="region" aria-label="فهرست آخرین اسکن‌ها"><table aria-label="آخرین اسکن‌های مرجوع کالا"><thead><tr><th>ردیف</th><th>زمان</th><th>کد محصول</th><th>نام محصول</th><th>گروه</th><th>وزن</th><th>وضعیت</th></tr></thead><tbody>{snapshot.scans.map((scan, index) => {
            const duplicate = scan.scanStatus !== "accepted";
            const cells = [faDigits(index + 1), scanTime(scan.scannedAt), scan.scannedCode, scan.productName ?? "—", scan.productGroupName ?? "—", weightText(scan.weightMgSnapshot)];
            return <tr key={scan.id} className={duplicate ? "duplicate" : undefined}>{cells.map((cell, cellIndex) => <td key={cellIndex} dir={cellIndex === 1 || cellIndex === 2 || cellIndex === 5 ? "ltr" : undefined}>{cell}</td>)}<td><span className={duplicate ? "scan-state duplicate" : "scan-state ok"}>{duplicate ? <XCircle size={14}/> : <CheckCircle2 size={14}/>} {scan.scanStatus === "accepted" ? "موفق" : scan.scanStatus === "duplicate" ? "بارکد تکراری" : "نامعتبر"}</span></td></tr>;
          })}</tbody></table></ScrollPanel><footer><label><i>نمایش</i><span><b>۵۰</b>⌄</span><i>مورد</i></label><nav aria-label="صفحه‌بندی اسکن‌ها"><button aria-label="صفحه بعد"><ChevronRight size={15}/></button><button>۱</button><button>۲</button><button>۳</button><button aria-label="صفحه قبل"><ChevronLeft size={15}/></button></nav></footer></section>
        </section>

        <div className="returns-actions" role="toolbar" aria-label="عملیات مرجوع کالا">
          <button type="button" className="start" onClick={() => void run(() => workflow.startSession())}><Play size={21} fill="currentColor"/>شروع</button><button type="button" className="stop" onClick={() => void run(() => workflow.stopSession())}><Square size={20} fill="currentColor"/>توقف</button><button type="button" className="remove"><Undo2 size={21}/>بازگشت آخرین</button><button type="button" className="finish" onClick={() => void run(() => workflow.completeSession())}><CheckCircle2 size={21}/>پایان جلسه</button>
        </div>
      </div>

      <aside className="returns-details" aria-label="جزئیات جلسه مرجوع کالا">
        <section className="returns-latest"><h2><i/>آخرین محصول اسکن شده</h2><div><img src={referenceAssets.productRegistrationRing} alt={latestAccepted?.productName ?? "انگشتر طرح گل"}/><article><b>{latestAccepted?.productName ?? "انگشتر طرح گل"}</b><code dir="ltr">{latestAccepted?.scannedCode ?? "—"}</code><strong dir="ltr">{weightText(latestAccepted?.weightMgSnapshot ?? null)} <small>وزن</small></strong><p><span>گروه</span><em>{latestAccepted?.productGroupName ?? "—"}</em></p></article></div></section>
        <section className="returns-reader"><h2><i/>وضعیت اتصال بارکدخوان</h2><div><span><img className="returns-reader-reference" src={referenceAssets.barcodeScannerReference} alt="بارکدخوان متصل"/></span><article><b>متصل</b><p dir="ltr">COM3　|　9600</p><button type="button">تست اتصال</button></article></div></section>
        <section className="returns-session"><h2>خلاصه جلسه</h2>{[["تعداد کل",faDigits(snapshot.summary.itemCount),Barcode,"tone-blue"],["وزن کل مرجوع",weightText(snapshot.summary.totalWeightMg),Scale,"tone-gold"],["تعداد خطا",faDigits(snapshot.summary.errorCount),TriangleAlert,"tone-red"],["درصد موفقیت",successPercent(snapshot),CheckCircle2,"tone-green"]].map(([name,value,Icon,tone]) => { const MetricIcon = Icon as typeof Barcode; return <p key={name as string}><MetricIcon size={16} className={tone as string}/><span>{name as string}</span><b dir="ltr">{value as string}</b></p>; })}</section>
      </aside>
    </section>
  </PageContainer>;
}

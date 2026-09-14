import { useEffect, useMemo, useState } from "react";
import {
  Box, CheckCircle2, CircleHelp, Clock3, Copy, Hash, Keyboard, PackageCheck,
  PackagePlus, Printer, QrCode, ScanLine, Trash2, UserRound, Weight, XCircle,
} from "lucide-react";
import { categoryAssets, referenceAssets } from "../../assets/reference";
import type { PackagingFeedbackEntry, PackagingFeedbackView, PackagingSessionView } from "../../services/packaging/packaging-contract";
import { packagingGateway } from "../../services/packaging/packaging-gateway";
import "./packaging-page.css";

type PackagingPhase = "loading" | "ready" | "error";

const describeError = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

const noFeedback: PackagingFeedbackView = { accepted: null, error: null };

export function PackagingPage() {
  const [session, setSession] = useState<PackagingSessionView | null>(null);
  const [phase, setPhase] = useState<PackagingPhase>("loading");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState<PackagingFeedbackEntry | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    packagingGateway
      .loadSession()
      .then((loaded) => {
        if (active) {
          setSession(loaded);
          setPhase("ready");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPhase("error");
          setLoadError(describeError(error, "بسته جاری بارگذاری نشد"));
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const failAction = (error: unknown) => {
    setActionError({
      title: "خطا در ذخیره‌سازی",
      message: describeError(error, "عملیات بسته انجام نشد"),
      detail: "—",
      timeLabel: "--:--:--",
    });
  };

  const runAction = async (action: () => Promise<PackagingSessionView>) => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      setSession(await action());
      setPhase("ready");
      setActionError(null);
    } catch (error) {
      failAction(error);
    } finally {
      setBusy(false);
    }
  };

  const submitManualCode = async () => {
    const code = manualCode.trim();

    if (busy || code.length === 0) {
      return;
    }

    setBusy(true);

    try {
      const result = await packagingGateway.addItemByCode(code);

      setSession(result.session);
      setPhase("ready");
      setActionError(null);

      if (result.outcome === "accepted") {
        setManualCode("");
      }
    } catch (error) {
      failAction(error);
    } finally {
      setBusy(false);
    }
  };

  const feedback = useMemo<PackagingFeedbackView>(() => {
    const base = session?.feedback ?? noFeedback;

    if (phase === "error") {
      return {
        accepted: base.accepted,
        error: { title: "خطا در بارگذاری اطلاعات", message: loadError, detail: "—", timeLabel: "--:--:--" },
      };
    }

    return actionError ? { accepted: base.accepted, error: actionError } : base;
  }, [session, phase, loadError, actionError]);

  const summary = session?.summary;
  const items = session?.items ?? [];
  const itemCountLabel = summary?.itemCountLabel ?? "۰ قلم";
  const totalWeightLabel = summary?.totalWeightLabel ?? "0.000 g";
  const packageCode = summary?.packageCode ?? "—";
  const emptyRowMessage =
    phase === "loading" ? "در حال بارگذاری اقلام بسته..." : phase === "error" ? "اطلاعات بسته در دسترس نیست" : "هنوز محصولی در این بسته ثبت نشده است";

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
            <label htmlFor="manual-package-code"><span>کد محصول</span><span className="manual-input"><input id="manual-package-code" aria-label="کد محصول دستی" dir="ltr" placeholder="کد محصول را وارد کنید..." value={manualCode} onChange={(event) => setManualCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submitManualCode(); }} /><Keyboard size={18} /></span></label>
            <button type="button" onClick={() => void submitManualCode()}><PackagePlus size={18} />افزودن به بسته</button>
          </section>
        </section>

        <div className="packaging-actions" role="group" aria-label="عملیات بسته">
          <button type="button" className="create" onClick={() => void runAction(() => packagingGateway.createPackage())}><PackagePlus size={18} />ایجاد بسته جدید</button>
          <button type="button" className="finish" onClick={() => void runAction(() => packagingGateway.completePackage())}><CheckCircle2 size={18} />پایان بسته‌بندی</button>
          <button type="button"><Printer size={18} />چاپ لیبل بسته</button>
          <button type="button" className="remove" onClick={() => void runAction(() => packagingGateway.removeLastItem())}><Trash2 size={18} />حذف آخرین اسکن</button>
        </div>

        <section className="packaging-table-card">
          <header><h2>لیست اقلام اسکن شده</h2><span>{itemCountLabel}</span></header>
          <div className="packaging-items-scroll" data-testid="packaging-items-scroll">
            <table aria-label="اقلام اسکن‌شده بسته">
              <thead><tr><th>ردیف</th><th>کد محصول</th><th>نام محصول</th><th>گروه</th><th>عیار</th><th>وزن (گرم)</th><th>وضعیت</th><th>عملیات</th></tr></thead>
              <tbody>{items.length === 0
                ? <tr><td colSpan={8}>{emptyRowMessage}</td></tr>
                : items.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td dir="ltr">{item.productCode}</td><td>{item.name}</td><td>{item.groupName}</td><td>{item.purityLabel}</td><td dir="ltr">{item.weightGrams} g</td><td><span className="packaging-added"><CheckCircle2 size={14} />اسکن موفق</span></td><td><button type="button" aria-label={`حذف ${item.name}`} onClick={() => void runAction(() => packagingGateway.removeItem(item.id))}><Trash2 size={16} /></button></td></tr>)}</tbody>
            </table>
          </div>
          <footer><span>{itemCountLabel}</span><span>جمع کل</span><b dir="ltr">{totalWeightLabel}</b><span>{summary?.purityCaption ?? "—"}</span></footer>
        </section>

        <div className="packaging-feedback">
          <article className="duplicate" role="alert" aria-label="محصول تکراری">
            <header><span><XCircle size={18} /><b>{feedback.error?.title ?? "بدون خطا"}</b></span><time dir="ltr">{feedback.error?.timeLabel ?? "--:--:--"}</time></header>
            <div><img src={referenceAssets.productRegistrationRing} alt="تصویر محصول تکراری" /><p>{feedback.error?.message ?? "اسکن ناموفقی در این بسته ثبت نشده است"}{feedback.error ? <small dir="ltr">{feedback.error.detail}</small> : null}</p></div>
          </article>
          <article className="accepted" role="status" aria-label="اسکن موفق">
            <header><span><CheckCircle2 size={18} /><b>{feedback.accepted?.title ?? "بدون اسکن"}</b></span><time dir="ltr">{feedback.accepted?.timeLabel ?? "--:--:--"}</time></header>
            <div><img src={categoryAssets[4]} alt="تصویر محصول اسکن‌شده" /><p>{feedback.accepted?.message ?? "هنوز محصولی اسکن نشده است"}{feedback.accepted ? <small dir="ltr">{feedback.accepted.detail}</small> : null}</p></div>
          </article>
        </div>
      </div>

      <aside className="packaging-sidebar">
        <section className="package-information" role="complementary" aria-label="اطلاعات بسته جاری" data-testid="current-package-panel">
          <h2><span>اطلاعات بسته جاری</span><CircleHelp size={19} /></h2>
          <dl>
            <div><dt><Hash size={15} />کد بسته</dt><dd dir="ltr">{packageCode} <Copy size={15} /></dd></div>
            <div><dt><Box size={15} />تعداد اقلام</dt><dd>{itemCountLabel}</dd></div>
            <div><dt><Weight size={15} />وزن کل</dt><dd dir="ltr">{totalWeightLabel}</dd></div>
            <div><dt><UserRound size={15} />اپراتور</dt><dd>{summary?.operatorName ?? "—"} <small>{summary?.operatorRole ?? ""}</small></dd></div>
            <div><dt><Clock3 size={15} />زمان سپری شده</dt><dd dir="ltr">{summary?.elapsedLabel ?? "—"}</dd></div>
          </dl>
          <p className="package-status"><i />{summary?.statusLabel ?? "در حال بارگذاری"}</p>
        </section>

        <section className="package-label-preview">
          <h2><Printer size={20} /> پیش‌نمایش لیبل بسته</h2>
          <div className="package-label-art">
            <img src={referenceAssets.packageLabel} alt={`لیبل بسته ${packageCode}`} />
          </div>
          <button type="button"><Printer size={18} />چاپ لیبل بسته</button>
        </section>
      </aside>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  Cable, CheckCircle2, ChevronDown, Clock3, DatabaseBackup, FolderOpen,
  HardDriveDownload, KeyRound, Pencil, Plus, Printer, ScanLine, Scale,
  ShieldCheck, Trash2, UserPlus, UsersRound,
} from "lucide-react";
import { displayData } from "../../services";
import { createDefaultSettingsGateway } from "../../services/settings/settings-gateway";
import { validateSettings } from "../../services/settings/settings-validation";
import type {
  BackupSettingsView,
  PrinterSettingsView,
  ScaleSettingsView,
  ScannerSettingsView,
  SettingsGateway,
  SettingsSnapshot,
} from "../../services/settings/settings-contract";
import { approvedSettingsSnapshot } from "../../services/settings/settings-contract";
import "./settings-page.css";

const displayUsers = displayData.listUsers();

type SettingsStatus = "loading" | "ready" | "error";

const LOAD_ERROR_MESSAGE = "بارگذاری تنظیمات ذخیره‌شده ناموفق بود؛ مقادیر پیش‌فرض نمایش داده می‌شوند";
const SAVE_ERROR_MESSAGE = "ذخیره تنظیمات ناموفق بود؛ تغییرات پس از راه‌اندازی مجدد حفظ نمی‌شوند";
const INVALID_MESSAGE = "تنظیمات وارد شده معتبر نیست و ذخیره نشد";

type DeviceCardProps = {
  title: string;
  subtitle: string;
  icon: typeof Scale;
  fields: readonly (readonly [string, string])[];
  action: string;
  onFieldChange?: (label: string, value: string) => void;
};

function DeviceCard({ title, subtitle, icon: Icon, fields, action, onFieldChange }: DeviceCardProps) {
  return <section className="settings-device-card" role="region" aria-label={title}>
    <header><span className="settings-card-icon"><Icon size={22} /></span><div><h2>{title}</h2><p>{subtitle}</p></div><span className="settings-ready"><i />آماده</span></header>
    <div className="settings-fields">
      {fields.map(([label, value]) => <label key={label}><span>{label}</span><span className="settings-select"><select value={value} onChange={event => onFieldChange?.(label, event.target.value)}><option>{value}</option></select><ChevronDown size={14} /></span></label>)}
    </div>
    <div className="settings-card-footer"><span><Cable size={15} />وضعیت اتصال: <b>متصل</b></span><button type="button" aria-label={action}>{action}</button></div>
  </section>;
}

const scaleFieldByLabel: Partial<Record<string, keyof ScaleSettingsView>> = {
  "مدل ترازو": "scaleModel", "پورت اتصال": "port", "Baud Rate": "baudRate",
};
const printerFieldByLabel: Partial<Record<string, keyof PrinterSettingsView>> = {
  "پرینتر لیبل": "printerName", "سایز لیبل": "labelSize", "حالت چاپ": "printMode",
};
const scannerFieldByLabel: Partial<Record<string, keyof ScannerSettingsView>> = {
  "نوع اسکنر": "scannerType", "حالت اسکن": "scanMode", "پورت اتصال": "port",
};

export function SettingsPage() {
  const [snapshot, setSnapshot] = useState<SettingsSnapshot>(approvedSettingsSnapshot);
  const [status, setStatus] = useState<SettingsStatus>("loading");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const gatewayRef = useRef<Promise<SettingsGateway> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  /** One gateway (and therefore one SQLite connection) for load and saves. */
  const resolveGateway = () => {
    if (!gatewayRef.current) gatewayRef.current = createDefaultSettingsGateway();
    return gatewayRef.current;
  };

  useEffect(() => {
    let cancelled = false;

    resolveGateway()
      .then(gateway => gateway.loadSettings())
      .then(loaded => {
        if (cancelled) return;
        setSnapshot(loaded);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = (next: SettingsSnapshot) => {
    const issues = validateSettings(next);
    if (issues.length > 0) {
      setValidationMessage(issues[0]?.message ?? INVALID_MESSAGE);
      return;
    }
    setValidationMessage(null);

    // Saves are chained so rapid edits persist in order instead of racing.
    saveChainRef.current = saveChainRef.current
      .then(resolveGateway)
      .then(gateway => gateway.saveSettings(next))
      .then(() => setSaveFailed(false))
      .catch(() => setSaveFailed(true));
  };

  const updateDeviceField = <K extends "scale" | "printer" | "scanner">(
    device: K,
    labelByField: Partial<Record<string, keyof SettingsSnapshot[K]>>,
    label: string,
    value: string,
  ) => {
    const field = labelByField[label];
    if (!field) return;
    const next: SettingsSnapshot = { ...snapshot, [device]: { ...snapshot[device], [field]: value } };
    setSnapshot(next);
    persist(next);
  };

  const updateBackup = (patch: Partial<BackupSettingsView>) => {
    const next: SettingsSnapshot = { ...snapshot, backup: { ...snapshot.backup, ...patch } };
    setSnapshot(next);
    persist(next);
  };

  const notice = status === "error"
    ? LOAD_ERROR_MESSAGE
    : validationMessage ?? (saveFailed ? SAVE_ERROR_MESSAGE : null);

  return <main className="settings-page" data-testid="settings-page">
    <header className="settings-heading">
      <div><span className="settings-heading-icon"><ShieldCheck size={31} /></span><div><h1>تنظیمات</h1><p>مدیریت دستگاه‌ها، نسخه‌های پشتیبان و دسترسی کاربران</p></div></div>
      <p className="settings-ui-note" data-testid="settings-ui-only-note"><CheckCircle2 size={16} />این بخش صرفاً نمایشی است</p>
    </header>

    <section className="settings-devices" aria-label="تنظیمات دستگاه‌ها">
      <DeviceCard
        title="تنظیمات ترازو" subtitle="دریافت وزن از ترازوی دیجیتال" icon={Scale} action="تست اتصال"
        fields={[["مدل ترازو", snapshot.scale.scaleModel], ["پورت اتصال", snapshot.scale.port], ["Baud Rate", snapshot.scale.baudRate]]}
        onFieldChange={(label, value) => updateDeviceField("scale", scaleFieldByLabel, label, value)}
      />
      <DeviceCard
        title="تنظیمات پرینتر" subtitle="چاپ لیبل محصولات و بسته‌ها" icon={Printer} action="تست چاپ"
        fields={[["پرینتر لیبل", snapshot.printer.printerName], ["سایز لیبل", snapshot.printer.labelSize], ["حالت چاپ", snapshot.printer.printMode]]}
        onFieldChange={(label, value) => updateDeviceField("printer", printerFieldByLabel, label, value)}
      />
      <DeviceCard
        title="تنظیمات اسکنر" subtitle="ثبت سریع کد QR و بارکد" icon={ScanLine} action="تست اسکن"
        fields={[["نوع اسکنر", snapshot.scanner.scannerType], ["حالت اسکن", snapshot.scanner.scanMode], ["پورت اتصال", snapshot.scanner.port]]}
        onFieldChange={(label, value) => updateDeviceField("scanner", scannerFieldByLabel, label, value)}
      />
    </section>

    <section className="settings-backup-grid" aria-label="تنظیمات پشتیبان‌گیری">
      <section className="settings-backup-card" role="region" aria-label="بکاپ‌گیری اتوماتیک">
        <header><span className="settings-card-icon"><DatabaseBackup size={22} /></span><div><h2>بکاپ‌گیری اتوماتیک</h2><p>محافظت زمان‌بندی‌شده از اطلاعات برنامه</p></div><button type="button" className="settings-switch" role="switch" aria-label="فعال‌سازی بکاپ خودکار" aria-checked={snapshot.backup.enabled} onClick={() => updateBackup({ enabled: !snapshot.backup.enabled })}><i /></button></header>
        <div className="settings-backup-fields">
          <label><span>بازه زمانی</span><span className="settings-select"><select value={snapshot.backup.intervalLabel} onChange={event => updateBackup({ intervalLabel: event.target.value })}><option>{snapshot.backup.intervalLabel}</option></select><ChevronDown size={14} /></span></label>
          <label><span>مسیر ذخیره</span><span className="settings-path"><input dir="ltr" value={snapshot.backup.destinationPath} onChange={event => updateBackup({ destinationPath: event.target.value })} /><FolderOpen size={17} /></span></label>
        </div>
        <footer><Clock3 size={16} /><span>آخرین بکاپ: امروز، ۱۰:۲۴</span><b>موفق</b></footer>
      </section>

      <section className="settings-manual-card" role="region" aria-label="بکاپ‌گیری دستی">
        <header><span className="settings-card-icon"><HardDriveDownload size={22} /></span><div><h2>بکاپ‌گیری دستی</h2><p>نسخه پشتیبان را به‌صورت دستی مدیریت کنید</p></div></header>
        <div className="settings-manual-actions"><button type="button" className="settings-primary"><DatabaseBackup size={18} />گرفتن بکاپ</button><button type="button"><HardDriveDownload size={18} />بازیابی بکاپ</button></div>
        <footer><CheckCircle2 size={16} /><span>آخرین عملیات: بازیابی آزمایشی</span><b>بدون خطا</b></footer>
      </section>
    </section>

    <section className="settings-users-card" role="region" aria-label="مدیریت کاربران">
      <header className="settings-users-heading"><div><span className="settings-card-icon"><UsersRound size={22} /></span><div><h2>مدیریت کاربران</h2><p>سطح دسترسی و حساب‌های کاربری برنامه</p></div></div><button type="button" className="settings-add-user" aria-label="افزودن کاربر"><UserPlus size={18} />افزودن کاربر</button></header>
      <div className="settings-users-scroll">
        <table aria-label="فهرست کاربران">
          <thead><tr><th>نام کاربر</th><th>نقش</th><th>نام کاربری</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>{displayUsers.map(([name, role, username, status]) => <tr key={username}><td><span className="settings-avatar">{name.slice(0, 1)}</span>{name}</td><td><span className={role === "مدیر سیستم" ? "settings-role manager" : "settings-role"}>{role}</span></td><td dir="ltr">{username}</td><td><span className={status === "فعال" ? "settings-active" : "settings-disabled"}><i />{status}</span></td><td><div className="settings-user-actions"><button type="button" aria-label={`ویرایش ${name}`}><Pencil size={16} /></button><button type="button" aria-label={`تعویض رمز ${name}`}><KeyRound size={16} /></button><button type="button" aria-label={`حذف ${name}`}><Trash2 size={16} /></button></div></td></tr>)}</tbody>
        </table>
      </div>
      <footer><span>۳ کاربر ثبت‌شده</span><span>تغییرات این بخش ذخیره نمی‌شوند</span><button type="button"><Plus size={16} />دعوت از کاربر</button></footer>
    </section>
    {notice ? <p className="settings-visually-hidden" role="alert">{notice}</p> : null}
  </main>;
}

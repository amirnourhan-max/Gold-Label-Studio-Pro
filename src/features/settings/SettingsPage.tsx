import { useEffect, useRef, useState } from "react";
import {
  Cable, CheckCircle2, ChevronDown, Clock3, DatabaseBackup, FolderOpen,
  HardDriveDownload, KeyRound, Pencil, Plus, Printer, ScanLine, Scale,
  ShieldCheck, Trash2, UserPlus, UsersRound,
} from "lucide-react";
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
import { approvedSettingsSnapshot, backupIntervalOptions } from "../../services/settings/settings-contract";
import { createBackupService } from "../../services/backup/backup-service";
import type { BackupOutcome } from "../../services/backup/backup-contract";
import { createDefaultBackupStateGateway, type BackupStateGateway } from "../../services/backup/backup-state-gateway";
import { backupConfigFromSettings } from "../../services/backup/backup-scheduler";
import {
  createDeviceProbeService,
  type DeviceProbeKind,
  type DeviceProbeOutcome,
} from "../../services/hardware/device-probe";
import { relaunchApplication } from "../../services/backup/app-relaunch";
import { defaultUserService } from "../../services/users/user-gateway";
import { toPersianDigits, type UserListItem, type UserSnapshot } from "../../services/users/user-contract";
import type { UserMutationResult } from "../../services/users/user-service";
import type { UserValidationIssue } from "../../services/users/user-validation";
import type { UserRole } from "../../types/persistence";
import "./settings-page.css";

const USER_LOAD_ERROR_MESSAGE = "بارگذاری فهرست کاربران ناموفق بود";

/** How long the restore result stays readable before the app restarts. */
const RESTORE_RELAUNCH_DELAY_MS = 2_500;

type RestoreConfirmation = Readonly<{
  path: string;
  confirming: boolean;
  /** Set once the database was replaced and the app is about to restart. */
  restored?: boolean;
}>;

type UserStatus = "loading" | "ready" | "error";

type UserDialog =
  | Readonly<{ mode: "create"; displayName: string; username: string; role: UserRole; password: string }>
  | Readonly<{ mode: "edit"; id: string; displayName: string; username: string; role: UserRole; isActive: boolean }>
  | Readonly<{ mode: "password"; id: string; displayName: string; password: string; confirmation: string }>;

const dialogTitle = (dialog: UserDialog): string => {
  if (dialog.mode === "create") return "افزودن کاربر";
  if (dialog.mode === "edit") return "ویرایش کاربر";
  return "تعویض رمز عبور";
};

const dialogSubtitle = (dialog: UserDialog): string => {
  if (dialog.mode === "create") return "حساب کاربری جدید را برای برنامه ثبت کنید";
  if (dialog.mode === "edit") return `ویرایش مشخصات ${dialog.displayName}`;
  return `تعیین رمز عبور جدید برای ${dialog.displayName}`;
};

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
  onAction?: () => void;
  /** `null` keeps the approved default until a real probe has run. */
  probe?: DeviceProbeOutcome | null;
  busy?: boolean;
};

const LAST_BACKUP_NONE = "آخرین بکاپ: ثبت نشده";

function DeviceCard({ title, subtitle, icon: Icon, fields, action, onFieldChange, onAction, probe = null, busy = false }: DeviceCardProps) {
  const badge = probe && !probe.ok ? "خطا" : "آماده";
  return <section className="settings-device-card" role="region" aria-label={title}>
    <header><span className="settings-card-icon"><Icon size={22} /></span><div><h2>{title}</h2><p>{subtitle}</p></div><span className={probe && !probe.ok ? "settings-disabled" : "settings-ready"}><i />{badge}</span></header>
    <div className="settings-fields">
      {fields.map(([label, value]) => <label key={label}><span>{label}</span><span className="settings-select"><select value={value} onChange={event => onFieldChange?.(label, event.target.value)}><option>{value}</option></select><ChevronDown size={14} /></span></label>)}
    </div>
    <div className="settings-card-footer">
      <span><Cable size={15} />{probe ? probe.message : <>وضعیت اتصال: <b>متصل</b></>}</span>
      <button type="button" aria-label={action} disabled={busy} onClick={onAction}>{busy ? "در حال بررسی…" : action}</button>
    </div>
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

  const [userSnapshot, setUserSnapshot] = useState<UserSnapshot | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus>("loading");
  const [userNotice, setUserNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<UserDialog | null>(null);
  const [dialogIssues, setDialogIssues] = useState<readonly UserValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);

  const [probes, setProbes] = useState<Readonly<Record<DeviceProbeKind, DeviceProbeOutcome | null>>>({
    scale: null, printer: null, scanner: null,
  });
  const [probing, setProbing] = useState<DeviceProbeKind | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState<RestoreConfirmation | null>(null);
  const [backupRunning, setBackupRunning] = useState<"manual" | "restore" | null>(null);
  const [lastBackupAction, setLastBackupAction] = useState<BackupOutcome | null>(null);
  const [automaticBackup, setAutomaticBackup] = useState<BackupOutcome | null>(null);

  const probeServiceRef = useRef<ReturnType<typeof createDeviceProbeService> | null>(null);
  const backupServiceRef = useRef<ReturnType<typeof createBackupService> | null>(null);
  const backupStateRef = useRef<Promise<BackupStateGateway> | null>(null);

  /** Hardware services are created once per screen, like the settings gateway. */
  const resolveProbeService = () => (probeServiceRef.current ??= createDeviceProbeService());
  const resolveBackupService = () => (backupServiceRef.current ??= createBackupService());
  const resolveBackupState = () => (backupStateRef.current ??= createDefaultBackupStateGateway());

  const probeConfig = () => ({
    printerName: snapshot.printer.printerName,
    scalePort: snapshot.scale.port,
    scaleBaudRate: Number.parseInt(snapshot.scale.baudRate, 10) || 9600,
    scannerPort: snapshot.scanner.port,
    scannerBaudRate: 9600,
  });

  // One shared mapping, so the page and the background scheduler always agree.
  const backupConfig = (backup: BackupSettingsView) => backupConfigFromSettings(backup);

  const runProbe = async (kind: DeviceProbeKind) => {
    setProbing(kind);
    try {
      const outcome = await resolveProbeService().probe(kind, probeConfig());
      setProbes(current => ({ ...current, [kind]: outcome }));
    } finally {
      setProbing(null);
    }
  };

  const recordBackupCompletion = async (completedAt: string) => {
    setLastBackupAt(completedAt);
    try {
      const state = await resolveBackupState();
      await state.recordBackupAt(completedAt);
    } catch {
      // The backup itself succeeded; only the schedule marker could not be stored.
    }
  };

  const runManualBackup = async () => {
    setBackupRunning("manual");
    try {
      const outcome = await resolveBackupService().backup(backupConfig(snapshot.backup));
      setLastBackupAction(outcome);
      if (outcome.ok) await recordBackupCompletion(new Date().toISOString());
    } finally {
      setBackupRunning(null);
    }
  };

  /**
   * Restore is destructive, so it never runs straight from the button: the
   * newest backup is resolved first and the operator has to confirm it.
   */
  const requestRestore = async () => {
    setBackupRunning("restore");
    try {
      const files = await resolveBackupService().list(backupConfig(snapshot.backup));
      if (files.length === 0) {
        setLastBackupAction({ ok: false, message: "هیچ فایل پشتیبانی در مسیر تعیین‌شده پیدا نشد" });
        return;
      }
      setRestoreConfirmation({ path: files[0]!, confirming: false });
    } finally {
      setBackupRunning(null);
    }
  };

  const confirmRestore = async () => {
    const pending = restoreConfirmation;
    if (pending === null) return;

    setRestoreConfirmation({ ...pending, confirming: true });
    const outcome = await resolveBackupService().restore(pending.path);
    setLastBackupAction({ ...outcome, path: pending.path });
    if (!outcome.ok) {
      // Keep the dialog open so the failure stays visible next to the file.
      setRestoreConfirmation({ ...pending, confirming: false });
      return;
    }

    // The restored file is only picked up by a fresh process, so the app is
    // relaunched instead of continuing against the replaced database.
    setRestoreConfirmation({ ...pending, confirming: true, restored: true });
    await new Promise(resolve => setTimeout(resolve, RESTORE_RELAUNCH_DELAY_MS));
    await relaunchApplication();
    setRestoreConfirmation(null);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The page only reports the persisted schedule marker; the backup itself runs
   * from the application-level scheduler, which works while any page is open.
   */
  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;

    resolveBackupState()
      .then(state => state.loadLastBackupAt())
      .then(last => {
        if (!cancelled) setLastBackupAt(last);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    defaultUserService()
      .then(service => service.load())
      .then(loaded => {
        if (cancelled) return;
        setUserSnapshot(loaded);
        setUserStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setUserStatus("error");
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

  const settingsNotice = status === "error"
    ? LOAD_ERROR_MESSAGE
    : validationMessage ?? (saveFailed ? SAVE_ERROR_MESSAGE : null);

  const applyResult = (result: UserMutationResult, insideDialog: boolean): void => {
    if (result.status === "saved") {
      setUserSnapshot(result.snapshot);
      setDialogIssues([]);
      setDialog(null);
      setUserNotice(null);
      return;
    }

    const issues = result.status === "invalid"
      ? result.issues
      : [{ field: "general", message: result.message }];

    if (insideDialog) setDialogIssues(issues);
    else setUserNotice(issues[0]?.message ?? null);
  };

  const runDialogMutation = async (work: (service: Awaited<ReturnType<typeof defaultUserService>>) => Promise<UserMutationResult>) => {
    setSaving(true);
    try {
      applyResult(await work(await defaultUserService()), true);
    } catch {
      setDialogIssues([{ field: "general", message: "ذخیره تغییرات کاربر ناموفق بود" }]);
    } finally {
      setSaving(false);
    }
  };

  const submitDialog = async () => {
    if (!dialog) return;

    if (dialog.mode === "create") {
      await runDialogMutation(service => service.createUser({
        displayName: dialog.displayName, username: dialog.username, role: dialog.role, password: dialog.password,
      }));
      return;
    }

    if (dialog.mode === "edit") {
      await runDialogMutation(async service => {
        const updated = await service.updateUser({
          id: dialog.id, displayName: dialog.displayName, username: dialog.username, role: dialog.role,
        });
        if (updated.status !== "saved") return updated;
        return service.setUserActive(dialog.id, dialog.isActive);
      });
      return;
    }

    await runDialogMutation(service => service.changePassword({
      id: dialog.id, password: dialog.password, confirmation: dialog.confirmation,
    }));
  };

  const removeUser = async (user: UserListItem) => {
    setSaving(true);
    try {
      applyResult(await (await defaultUserService()).removeUser(user.id), false);
    } catch {
      setUserNotice("ذخیره تغییرات کاربر ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const users = userSnapshot?.users ?? [];

  return <main className="settings-page" data-testid="settings-page">
    <header className="settings-heading">
      <div><span className="settings-heading-icon"><ShieldCheck size={31} /></span><div><h1>تنظیمات</h1><p>مدیریت دستگاه‌ها، نسخه‌های پشتیبان و دسترسی کاربران</p></div></div>
      <p className="settings-ui-note" data-testid="settings-ui-only-note"><CheckCircle2 size={16} />تنظیمات در پایگاه داده ذخیره می‌شوند؛ تست اتصال دستگاه‌ها واقعی است</p>
    </header>

    <section className="settings-devices" aria-label="تنظیمات دستگاه‌ها">
      <DeviceCard
        title="تنظیمات ترازو" subtitle="دریافت وزن از ترازوی دیجیتال" icon={Scale} action="تست اتصال"
        fields={[["مدل ترازو", snapshot.scale.scaleModel], ["پورت اتصال", snapshot.scale.port], ["Baud Rate", snapshot.scale.baudRate]]}
        onFieldChange={(label, value) => updateDeviceField("scale", scaleFieldByLabel, label, value)}
        onAction={() => void runProbe("scale")} probe={probes.scale} busy={probing === "scale"}
      />
      <DeviceCard
        title="تنظیمات پرینتر" subtitle="چاپ لیبل محصولات و بسته‌ها" icon={Printer} action="تست چاپ"
        fields={[["پرینتر لیبل", snapshot.printer.printerName], ["سایز لیبل", snapshot.printer.labelSize], ["حالت چاپ", snapshot.printer.printMode]]}
        onFieldChange={(label, value) => updateDeviceField("printer", printerFieldByLabel, label, value)}
        onAction={() => void runProbe("printer")} probe={probes.printer} busy={probing === "printer"}
      />
      <DeviceCard
        title="تنظیمات اسکنر" subtitle="ثبت سریع کد QR و بارکد" icon={ScanLine} action="تست اسکن"
        fields={[["نوع اسکنر", snapshot.scanner.scannerType], ["حالت اسکن", snapshot.scanner.scanMode], ["پورت اتصال", snapshot.scanner.port]]}
        onFieldChange={(label, value) => updateDeviceField("scanner", scannerFieldByLabel, label, value)}
        onAction={() => void runProbe("scanner")} probe={probes.scanner} busy={probing === "scanner"}
      />
    </section>

    <section className="settings-backup-grid" aria-label="تنظیمات پشتیبان‌گیری">
      <section className="settings-backup-card" role="region" aria-label="بکاپ‌گیری اتوماتیک">
        <header><span className="settings-card-icon"><DatabaseBackup size={22} /></span><div><h2>بکاپ‌گیری اتوماتیک</h2><p>محافظت زمان‌بندی‌شده از اطلاعات برنامه</p></div><button type="button" className="settings-switch" role="switch" aria-label="فعال‌سازی بکاپ خودکار" aria-checked={snapshot.backup.enabled} onClick={() => updateBackup({ enabled: !snapshot.backup.enabled })}><i /></button></header>
        <div className="settings-backup-fields">
          <label><span>بازه زمانی</span><span className="settings-select"><select value={snapshot.backup.intervalLabel} onChange={event => updateBackup({ intervalLabel: event.target.value })}><option>{snapshot.backup.intervalLabel}</option></select><ChevronDown size={14} /></span></label>
          <label><span>مسیر ذخیره</span><span className="settings-path"><input dir="ltr" value={snapshot.backup.destinationPath} onChange={event => updateBackup({ destinationPath: event.target.value })} /><FolderOpen size={17} /></span></label>
        </div>
        <footer><Clock3 size={16} /><span>{lastBackupAt ? `آخرین بکاپ: ${new Date(lastBackupAt).toLocaleString("fa-IR")}` : LAST_BACKUP_NONE}</span><b>{automaticBackup ? (automaticBackup.ok ? "موفق" : "خطا") : "—"}</b></footer>
      </section>

      <section className="settings-manual-card" role="region" aria-label="بکاپ‌گیری دستی">
        <header><span className="settings-card-icon"><HardDriveDownload size={22} /></span><div><h2>بکاپ‌گیری دستی</h2><p>نسخه پشتیبان را به‌صورت دستی مدیریت کنید</p></div></header>
        <div className="settings-manual-actions"><button type="button" className="settings-primary" disabled={backupRunning !== null} onClick={() => void runManualBackup()}><DatabaseBackup size={18} />{backupRunning === "manual" ? "در حال پشتیبان‌گیری…" : "گرفتن بکاپ"}</button><button type="button" disabled={backupRunning !== null} onClick={() => void requestRestore()}><HardDriveDownload size={18} />{backupRunning === "restore" ? "در حال بازیابی…" : "بازیابی بکاپ"}</button></div>
        <footer><CheckCircle2 size={16} /><span>{lastBackupAction ? lastBackupAction.message : "آخرین عملیات: بدون عملیات"}</span><b>{lastBackupAction ? (lastBackupAction.ok ? "بدون خطا" : "خطا") : "—"}</b></footer>
      </section>
    </section>

    <section className="settings-users-card" role="region" aria-label="مدیریت کاربران">
      <header className="settings-users-heading"><div><span className="settings-card-icon"><UsersRound size={22} /></span><div><h2>مدیریت کاربران</h2><p>سطح دسترسی و حساب‌های کاربری برنامه</p></div></div><button type="button" className="settings-add-user" aria-label="افزودن کاربر" onClick={() => { setDialogIssues([]); setDialog({ mode: "create", displayName: "", username: "", role: "operator", password: "" }); }}><UserPlus size={18} />افزودن کاربر</button></header>
      <div className="settings-users-scroll">
        <table aria-label="فهرست کاربران">
          <thead><tr><th>نام کاربر</th><th>نقش</th><th>نام کاربری</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>
            {users.map(user => <tr key={user.id}>
              <td><span className="settings-avatar">{user.displayName.slice(0, 1)}</span>{user.displayName}</td>
              <td><span className={user.roleLabel === "مدیر سیستم" ? "settings-role manager" : "settings-role"}>{user.roleLabel}</span></td>
              <td dir="ltr">{user.username}</td>
              <td><span className={user.isActive ? "settings-active" : "settings-disabled"}><i />{user.statusLabel}</span></td>
              <td><div className="settings-user-actions">
                <button type="button" aria-label={`ویرایش ${user.displayName}`} onClick={() => { setDialogIssues([]); setDialog({ mode: "edit", id: user.id, displayName: user.displayName, username: user.username, role: user.role, isActive: user.isActive }); }}><Pencil size={16} /></button>
                <button type="button" aria-label={`تعویض رمز ${user.displayName}`} onClick={() => { setDialogIssues([]); setDialog({ mode: "password", id: user.id, displayName: user.displayName, password: "", confirmation: "" }); }}><KeyRound size={16} /></button>
                <button type="button" aria-label={`حذف ${user.displayName}`} disabled={saving} onClick={() => void removeUser(user)}><Trash2 size={16} /></button>
              </div></td>
            </tr>)}
            {userStatus === "loading" ? <tr className="settings-users-message"><td colSpan={5} role="status">در حال بارگذاری کاربران…</td></tr> : null}
            {userStatus === "error" ? <tr className="settings-users-message"><td colSpan={5} role="alert">{USER_LOAD_ERROR_MESSAGE}</td></tr> : null}
            {userStatus === "ready" && users.length === 0 ? <tr className="settings-users-message"><td colSpan={5}>هیچ کاربری ثبت نشده است</td></tr> : null}
          </tbody>
        </table>
      </div>
      <footer><span>{toPersianDigits(userSnapshot?.totalCount ?? 0)} کاربر ثبت‌شده</span><span>تغییرات این بخش ذخیره می‌شوند</span><button type="button" onClick={() => { setDialogIssues([]); setDialog({ mode: "create", displayName: "", username: "", role: "operator", password: "" }); }}><Plus size={16} />دعوت از کاربر</button></footer>
    </section>

    {dialog ? <div className="settings-user-overlay">
      <section className="settings-user-dialog" role="dialog" aria-modal="true" aria-label={dialogTitle(dialog)}>
        <header><h2>{dialogTitle(dialog)}</h2><p>{dialogSubtitle(dialog)}</p></header>
        <div className="settings-user-fields">
          {dialog.mode === "create" || dialog.mode === "edit" ? <>
            <label><span>نام کاربر</span><input value={dialog.displayName} onChange={event => setDialog({ ...dialog, displayName: event.target.value })} /></label>
            <label><span>نام کاربری</span><input dir="ltr" value={dialog.username} onChange={event => setDialog({ ...dialog, username: event.target.value })} /></label>
            <label><span>نقش</span><span className="settings-select"><select value={dialog.role} onChange={event => setDialog({ ...dialog, role: event.target.value as UserRole })}><option value="admin">مدیر سیستم</option><option value="operator">اپراتور</option></select><ChevronDown size={14} /></span></label>
          </> : null}
          {dialog.mode === "edit" ? <label><span>وضعیت</span><span className="settings-select"><select value={dialog.isActive ? "active" : "inactive"} onChange={event => setDialog({ ...dialog, isActive: event.target.value === "active" })}><option value="active">فعال</option><option value="inactive">غیرفعال</option></select><ChevronDown size={14} /></span></label> : null}
          {dialog.mode === "create" || dialog.mode === "password" ? <label><span>رمز عبور</span><input type="password" dir="ltr" value={dialog.password} onChange={event => setDialog({ ...dialog, password: event.target.value })} /></label> : null}
          {dialog.mode === "password" ? <label><span>تکرار رمز عبور</span><input type="password" dir="ltr" value={dialog.confirmation} onChange={event => setDialog({ ...dialog, confirmation: event.target.value })} /></label> : null}
          {dialogIssues.map(issue => <p className="settings-user-error" key={issue.field} role="alert">{issue.message}</p>)}
        </div>
        <footer>
          <button type="button" className="settings-primary" disabled={saving} onClick={() => void submitDialog()}>{saving ? "در حال ذخیره…" : "ذخیره"}</button>
          <button type="button" disabled={saving} onClick={() => { setDialog(null); setDialogIssues([]); }}>انصراف</button>
        </footer>
      </section>
    </div> : null}

    {restoreConfirmation ? <div className="settings-user-overlay">
      <section className="settings-user-dialog" role="dialog" aria-modal="true" aria-label="تأیید بازیابی نسخه پشتیبان">
        <header><h2>تأیید بازیابی نسخه پشتیبان</h2><p>پایگاه داده جاری با این فایل جایگزین می‌شود</p></header>
        <div className="settings-user-fields">
          <p dir="ltr">{restoreConfirmation.path}</p>
          <p>قبل از جایگزینی، یک نسخه امنیتی از پایگاه داده جاری نگه داشته می‌شود و برنامه پس از بازیابی دوباره راه‌اندازی می‌شود.</p>
          {restoreConfirmation.restored ? <p role="status">بازیابی انجام شد؛ برنامه در حال راه‌اندازی مجدد است…</p> : null}
          {lastBackupAction && !lastBackupAction.ok ? <p className="settings-user-error" role="alert">{lastBackupAction.message}</p> : null}
        </div>
        <footer>
          <button type="button" className="settings-primary" disabled={restoreConfirmation.confirming} onClick={() => void confirmRestore()}>{restoreConfirmation.confirming ? "در حال بازیابی…" : "بازیابی نسخه پشتیبان"}</button>
          <button type="button" disabled={restoreConfirmation.confirming} onClick={() => setRestoreConfirmation(null)}>انصراف</button>
        </footer>
      </section>
    </div> : null}

    {settingsNotice ? <p className="settings-visually-hidden" role="alert">{settingsNotice}</p> : null}
    {userNotice ? <p className="settings-visually-hidden" role="alert">{userNotice}</p> : null}
  </main>;
}

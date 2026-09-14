import { useEffect, useState } from "react";
import {
  Cable, CheckCircle2, ChevronDown, Clock3, DatabaseBackup, FolderOpen,
  HardDriveDownload, KeyRound, Pencil, Plus, Printer, ScanLine, Scale,
  ShieldCheck, Trash2, UserPlus, UsersRound,
} from "lucide-react";
import { defaultUserService } from "../../services/users/user-gateway";
import { toPersianDigits, type UserListItem, type UserSnapshot } from "../../services/users/user-contract";
import type { UserMutationResult } from "../../services/users/user-service";
import type { UserValidationIssue } from "../../services/users/user-validation";
import type { UserRole } from "../../types/persistence";
import "./settings-page.css";

const LOAD_ERROR_MESSAGE = "بارگذاری فهرست کاربران ناموفق بود";

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

type DeviceCardProps = {
  title: string;
  subtitle: string;
  icon: typeof Scale;
  fields: readonly [string, string][];
  action: string;
};

function DeviceCard({ title, subtitle, icon: Icon, fields, action }: DeviceCardProps) {
  return <section className="settings-device-card" role="region" aria-label={title}>
    <header><span className="settings-card-icon"><Icon size={22} /></span><div><h2>{title}</h2><p>{subtitle}</p></div><span className="settings-ready"><i />آماده</span></header>
    <div className="settings-fields">
      {fields.map(([label, value]) => <label key={label}><span>{label}</span><span className="settings-select"><select defaultValue={value}><option>{value}</option></select><ChevronDown size={14} /></span></label>)}
    </div>
    <div className="settings-card-footer"><span><Cable size={15} />وضعیت اتصال: <b>متصل</b></span><button type="button" aria-label={action}>{action}</button></div>
  </section>;
}

export function SettingsPage() {
  const [snapshot, setSnapshot] = useState<UserSnapshot | null>(null);
  const [status, setStatus] = useState<UserStatus>("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<UserDialog | null>(null);
  const [dialogIssues, setDialogIssues] = useState<readonly UserValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    defaultUserService()
      .then(service => service.load())
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

  const applyResult = (result: UserMutationResult, insideDialog: boolean): void => {
    if (result.status === "saved") {
      setSnapshot(result.snapshot);
      setDialogIssues([]);
      setDialog(null);
      setNotice(null);
      return;
    }

    const issues = result.status === "invalid"
      ? result.issues
      : [{ field: "general", message: result.message }];

    if (insideDialog) setDialogIssues(issues);
    else setNotice(issues[0]?.message ?? null);
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
      setNotice("ذخیره تغییرات کاربر ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const users = snapshot?.users ?? [];

  return <main className="settings-page" data-testid="settings-page">
    <header className="settings-heading">
      <div><span className="settings-heading-icon"><ShieldCheck size={31} /></span><div><h1>تنظیمات</h1><p>مدیریت دستگاه‌ها، نسخه‌های پشتیبان و دسترسی کاربران</p></div></div>
      <p className="settings-ui-note" data-testid="settings-ui-only-note"><CheckCircle2 size={16} />این بخش صرفاً نمایشی است</p>
    </header>

    <section className="settings-devices" aria-label="تنظیمات دستگاه‌ها">
      <DeviceCard title="تنظیمات ترازو" subtitle="دریافت وزن از ترازوی دیجیتال" icon={Scale} action="تست اتصال" fields={[["مدل ترازو", "A&D GX-3002A"], ["پورت اتصال", "COM3"], ["Baud Rate", "9600"]]} />
      <DeviceCard title="تنظیمات پرینتر" subtitle="چاپ لیبل محصولات و بسته‌ها" icon={Printer} action="تست چاپ" fields={[["پرینتر لیبل", "Zebra ZD421"], ["سایز لیبل", "50 × 30 mm"], ["حالت چاپ", "حرارتی مستقیم"]]} />
      <DeviceCard title="تنظیمات اسکنر" subtitle="ثبت سریع کد QR و بارکد" icon={ScanLine} action="تست اسکن" fields={[["نوع اسکنر", "QR / Barcode"], ["حالت اسکن", "افزودن خودکار"], ["پورت اتصال", "USB HID"]]} />
    </section>

    <section className="settings-backup-grid" aria-label="تنظیمات پشتیبان‌گیری">
      <section className="settings-backup-card" role="region" aria-label="بکاپ‌گیری اتوماتیک">
        <header><span className="settings-card-icon"><DatabaseBackup size={22} /></span><div><h2>بکاپ‌گیری اتوماتیک</h2><p>محافظت زمان‌بندی‌شده از اطلاعات برنامه</p></div><button type="button" className="settings-switch" role="switch" aria-label="فعال‌سازی بکاپ خودکار" aria-checked="true"><i /></button></header>
        <div className="settings-backup-fields">
          <label><span>بازه زمانی</span><span className="settings-select"><select defaultValue="هر روز ساعت ۲۳:۰۰"><option>هر روز ساعت ۲۳:۰۰</option></select><ChevronDown size={14} /></span></label>
          <label><span>مسیر ذخیره</span><span className="settings-path"><input dir="ltr" readOnly value="D:\\GoldLabel\\Backups" /><FolderOpen size={17} /></span></label>
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
            {status === "loading" ? <tr className="settings-users-message"><td colSpan={5} role="status">در حال بارگذاری کاربران…</td></tr> : null}
            {status === "error" ? <tr className="settings-users-message"><td colSpan={5} role="alert">{LOAD_ERROR_MESSAGE}</td></tr> : null}
            {status === "ready" && users.length === 0 ? <tr className="settings-users-message"><td colSpan={5}>هیچ کاربری ثبت نشده است</td></tr> : null}
          </tbody>
        </table>
      </div>
      <footer><span>{toPersianDigits(snapshot?.totalCount ?? 0)} کاربر ثبت‌شده</span><span>تغییرات این بخش ذخیره نمی‌شوند</span><button type="button" onClick={() => { setDialogIssues([]); setDialog({ mode: "create", displayName: "", username: "", role: "operator", password: "" }); }}><Plus size={16} />دعوت از کاربر</button></footer>
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

    {notice ? <p className="settings-visually-hidden" role="alert">{notice}</p> : null}
  </main>;
}

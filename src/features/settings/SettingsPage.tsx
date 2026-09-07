import {
  Cable, CheckCircle2, ChevronDown, Clock3, DatabaseBackup, FolderOpen,
  HardDriveDownload, KeyRound, Pencil, Plus, Printer, ScanLine, Scale,
  ShieldCheck, Trash2, UserPlus, UsersRound,
} from "lucide-react";
import "./settings-page.css";

type DeviceCardProps = {
  title: string;
  subtitle: string;
  icon: typeof Scale;
  fields: readonly [string, string][];
  action: string;
};

const users = [
  ["ادمین", "مدیر سیستم", "admin", "فعال"],
  ["مریم رضایی", "اپراتور", "m.rezaei", "فعال"],
  ["امیر محمدی", "اپراتور", "a.mohammadi", "غیرفعال"],
] as const;

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
      <header className="settings-users-heading"><div><span className="settings-card-icon"><UsersRound size={22} /></span><div><h2>مدیریت کاربران</h2><p>سطح دسترسی و حساب‌های کاربری برنامه</p></div></div><button type="button" className="settings-add-user" aria-label="افزودن کاربر"><UserPlus size={18} />افزودن کاربر</button></header>
      <div className="settings-users-scroll">
        <table aria-label="فهرست کاربران">
          <thead><tr><th>نام کاربر</th><th>نقش</th><th>نام کاربری</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>{users.map(([name, role, username, status]) => <tr key={username}><td><span className="settings-avatar">{name.slice(0, 1)}</span>{name}</td><td><span className={role === "مدیر سیستم" ? "settings-role manager" : "settings-role"}>{role}</span></td><td dir="ltr">{username}</td><td><span className={status === "فعال" ? "settings-active" : "settings-disabled"}><i />{status}</span></td><td><div className="settings-user-actions"><button type="button" aria-label={`ویرایش ${name}`}><Pencil size={16} /></button><button type="button" aria-label={`تعویض رمز ${name}`}><KeyRound size={16} /></button><button type="button" aria-label={`حذف ${name}`}><Trash2 size={16} /></button></div></td></tr>)}</tbody>
        </table>
      </div>
      <footer><span>۳ کاربر ثبت‌شده</span><span>تغییرات این بخش ذخیره نمی‌شوند</span><button type="button"><Plus size={16} />دعوت از کاربر</button></footer>
    </section>
  </main>;
}

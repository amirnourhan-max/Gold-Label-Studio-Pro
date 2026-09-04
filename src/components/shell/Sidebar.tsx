import { BarChart3, Boxes, ClipboardList, Database, Home, LogOut, Palette, Printer, Settings, ShoppingBag, Users, Scale } from "lucide-react";
import { referenceAssets } from "../../assets/reference";

const nav = [
  ["داشبورد", Home], ["محصولات", ShoppingBag], ["چاپ لیبل", Printer],
  ["طراحی لیبل", Palette], ["بسته‌بندی", Boxes], ["مشتریان", Users],
  ["سفارش‌ها", ClipboardList], ["خروج کالا", LogOut], ["گزارش‌ها", BarChart3],
  ["تنظیمات", Settings],
] as const;

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand" dir="ltr">
        <img src={referenceAssets.brandDiamond} alt="" className="brand-mark"/>
        <div><strong>Gold Label Studio Pro</strong><span>سیستم جامع لیبل‌زنی و ردیابی طلا و جواهر</span></div>
        <small>v1.0.0</small>
      </div>

      <nav aria-label="منوی اصلی" className="nav-list">
        {nav.map(([label, Icon], i) => (
          <button key={label} className={i === 0 ? "nav-item active" : "nav-item"} aria-current={i === 0 ? "page" : undefined}>
            <Icon size={18}/><span>{label}</span>{i > 0 && i < 8 ? <span className="nav-chevron">‹</span> : null}
          </button>
        ))}
      </nav>

      <div className="connection-title">دستگاه‌ها و اتصالات</div>
      <div className="connection-stack">
        <div className="connection-card"><Scale size={17}/><div><b>ترازوی دیجیتال</b><span>متصل</span></div><i/></div>
        <div className="connection-card"><Printer size={17}/><div><b>چاپگر لیبل</b><span>متصل</span></div><i/></div>
        <div className="connection-card"><Database size={17}/><div><b>پایگاه داده</b><span>متصل</span></div><i/></div>
      </div>

      <div className="trust-card">
        <img data-testid="trust-artwork" src={referenceAssets.trustArtwork} alt=""/>
      </div>
    </aside>
  );
}

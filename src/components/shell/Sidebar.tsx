import { BarChart3, Boxes, CirclePlus, Database, Home, Palette, Printer, RotateCcw, Settings, ShoppingBag, Scale } from "lucide-react";
import { referenceAssets } from "../../assets/reference";

export type ShellRoute = "dashboard" | "product-registration" | "label-print" | "label-designer" | "packaging" | "returns" | "products" | "reports" | "settings";

type NavigationItem = {
  label: string;
  Icon: typeof Home;
  route?: ShellRoute;
  chevron?: boolean;
};

const nav: readonly NavigationItem[] = [
  { label: "داشبورد", Icon: Home, route: "dashboard" },
  { label: "محصولات", Icon: ShoppingBag, route: "products", chevron: true },
  { label: "ثبت محصول", Icon: CirclePlus, route: "product-registration" },
  { label: "چاپ لیبل", Icon: Printer, route: "label-print", chevron: true },
  { label: "طراحی لیبل", Icon: Palette, route: "label-designer", chevron: true },
  { label: "بسته‌بندی", Icon: Boxes, route: "packaging", chevron: true },
  { label: "مرجوع کالا", Icon: RotateCcw, route: "returns", chevron: true },
  { label: "گزارش‌ها", Icon: BarChart3, route: "reports" },
  { label: "تنظیمات", Icon: Settings, route: "settings" },
] as const;

type SidebarProps = {
  activePage?: ShellRoute;
  onNavigate?: (page: ShellRoute) => void;
};

export function Sidebar({ activePage = "dashboard", onNavigate = () => {} }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand" dir="ltr">
        <img src={referenceAssets.brandDiamond} alt="" className="brand-mark"/>
        <div><strong>Gold Label Studio Pro</strong><span>سیستم جامع لیبل‌زنی و ردیابی طلا و جواهر</span></div>
        <small>v1.0.0</small>
      </div>

      <nav aria-label="منوی اصلی" className="nav-list">
        {nav.map(({ label, Icon, route, chevron }) => (
          <button
            key={label}
            className={route === activePage ? "nav-item active" : "nav-item"}
            aria-current={route === activePage ? "page" : undefined}
            onClick={route ? () => onNavigate(route) : undefined}
          >
            <Icon size={18}/><span>{label}</span>{chevron ? <span className="nav-chevron">‹</span> : null}
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

import { Bell, ChevronDown, Maximize2, Minus, Search, Settings, UserRound, X } from "lucide-react";

async function withWindow(action: "minimize" | "maximize" | "close") {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    if (action === "minimize") await appWindow.minimize();
    if (action === "maximize") await appWindow.toggleMaximize();
    if (action === "close") await appWindow.close();
  } catch {
    // Browser preview and tests do not expose the native Tauri window.
  }
}

export function Topbar() {
  return (
    <header className="topbar" data-testid="window-drag-region" data-tauri-drag-region>
      <div className="search-box">
        <Search size={19}/>
        <input aria-label="جستجو" placeholder="جستجو در محصولات، مشتریان، سفارش‌ها..."/>
        <kbd>Ctrl + K</kbd>
      </div>

      <div className="top-actions">
        <button className="icon-button notification" aria-label="اعلان‌ها"><Bell size={19}/><span>3</span></button>
        <button className="icon-button" aria-label="تنظیمات"><Settings size={20}/></button>
        <div className="top-separator"/>
        <div className="user-block">
          <div className="avatar"><UserRound size={22}/></div>
          <div><b>مدیر سیستم</b><small>مدیر ارشد</small></div>
          <ChevronDown size={15}/>
        </div>
      </div>

      <div className="window-controls" dir="ltr">
        <button aria-label="کمینه" onClick={() => void withWindow("minimize")}><Minus size={17}/></button>
        <button aria-label="بزرگ‌نمایی" onClick={() => void withWindow("maximize")}><Maximize2 size={14}/></button>
        <button className="window-close" aria-label="بستن" onClick={() => void withWindow("close")}><X size={17}/></button>
      </div>
    </header>
  );
}

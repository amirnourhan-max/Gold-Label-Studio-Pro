import { Bell, ChevronDown, Maximize2, Minus, Search, Settings, UserRound, X } from "lucide-react";

async function runWindowAction(action: "minimize" | "maximize" | "close") {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();

  try {
    if (action === "minimize") await appWindow.minimize();
    if (action === "maximize") await appWindow.toggleMaximize();
    if (action === "close") await appWindow.close();
  } catch (error) {
    console.error(`Window action failed: ${action}`, error);
  }
}

export function Topbar() {
  const stopDrag = (event: React.PointerEvent<HTMLButtonElement>) => event.stopPropagation();

  return (
    <header className="topbar" data-testid="window-drag-region" data-tauri-drag-region>
      <div className="search-box">
        <Search size={19}/>
        <input aria-label="جستجو" placeholder="جستجو در محصولات، مشتریان، سفارش‌ها..."/>
        <kbd>Ctrl + K</kbd>
      </div>

      <div className="top-actions">
        <button className="icon-button notification" aria-label="اعلان‌ها" onPointerDown={stopDrag}><Bell size={19}/><span>3</span></button>
        <button className="icon-button" aria-label="تنظیمات" onPointerDown={stopDrag}><Settings size={20}/></button>
        <div className="top-separator"/>
        <div className="user-block">
          <div className="avatar"><UserRound size={22}/></div>
          <div><b>مدیر سیستم</b><small>مدیر ارشد</small></div>
          <ChevronDown size={15}/>
        </div>
      </div>

      <div className="window-controls" dir="ltr">
        <button aria-label="کمینه" onPointerDown={stopDrag} onClick={() => void runWindowAction("minimize")}><Minus size={17}/></button>
        <button aria-label="بزرگ‌نمایی" onPointerDown={stopDrag} onClick={() => void runWindowAction("maximize")}><Maximize2 size={14}/></button>
        <button className="window-close" aria-label="بستن" onPointerDown={stopDrag} onClick={() => void runWindowAction("close")}><X size={17}/></button>
      </div>
    </header>
  );
}

import { Bell, ChevronDown, LogOut, Maximize2, Minus, Search, Settings, UserRound, X } from "lucide-react";
import { roleLabels } from "../../services/users/user-contract";
import { useAuthSession } from "../../features/auth/auth-session";
import { runWindowAction } from "../../services/window/window-actions";

export function Topbar() {
  const stopDrag = (event: React.PointerEvent<HTMLButtonElement>) => event.stopPropagation();
  const { user, signOut } = useAuthSession();

  return (
    <header className="topbar" data-testid="window-drag-region" data-tauri-drag-region>
      <div className="search-box">
        <Search size={19}/>
        <input aria-label="جستجو" placeholder="جستجو در محصولات، کد و مشخصات..."/>
        <kbd>Ctrl + K</kbd>
      </div>

      <div className="top-actions">
        <button className="icon-button notification" aria-label="اعلان‌ها" onPointerDown={stopDrag}><Bell size={19}/><span>3</span></button>
        <button className="icon-button" aria-label="تنظیمات" onPointerDown={stopDrag}><Settings size={20}/></button>
        <div className="top-separator"/>
        <div className="user-block">
          <div className="avatar"><UserRound size={22}/></div>
          <div><b>{user?.displayName ?? "مدیر سیستم"}</b><small>{user ? roleLabels[user.role] : "مدیر ارشد"}</small></div>
          {user ? <button className="icon-button" aria-label="خروج از حساب" onPointerDown={stopDrag} onClick={signOut}><LogOut size={17}/></button> : <ChevronDown size={15}/>}
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

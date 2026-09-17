import { Minus, X } from "lucide-react";
import { runWindowAction } from "../../services/window/window-actions";

export function AuthWindowChrome() {
  const stopDrag = (event: React.PointerEvent<HTMLButtonElement>) => event.stopPropagation();

  return (
    <header className="auth-window-chrome" data-testid="auth-window-drag-region" data-tauri-drag-region>
      <span className="auth-window-title">Gold Label Studio Pro</span>
      <div className="auth-window-controls" dir="ltr">
        <button type="button" aria-label="کمینه" onPointerDown={stopDrag} onClick={() => void runWindowAction("minimize")}>
          <Minus size={16} />
        </button>
        <button type="button" className="auth-window-close" aria-label="بستن" onPointerDown={stopDrag} onClick={() => void runWindowAction("close")}>
          <X size={16} />
        </button>
      </div>
    </header>
  );
}

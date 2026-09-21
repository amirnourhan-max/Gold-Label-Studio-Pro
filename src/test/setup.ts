import { webcrypto } from "node:crypto";
import "@testing-library/jest-dom/vitest";

// jsdom does not expose the WebCrypto SubtleCrypto API that password hashing
// relies on; production (WebView2) always provides it natively.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
} else if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, "subtle", { value: webcrypto.subtle, configurable: true });
}

// jsdom does not implement PointerEvent, which the label designer's drag and
// resize gestures rely on. Production (WebView2) provides it natively; this
// shim only lets the deterministic tests drive the same handlers.
if (typeof window !== "undefined" && !("PointerEvent" in window)) {
  class PointerEventShim extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? "mouse";
      this.isPrimary = params.isPrimary ?? true;
    }
  }

  Object.defineProperty(window, "PointerEvent", { value: PointerEventShim, configurable: true });
}

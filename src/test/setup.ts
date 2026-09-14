import { webcrypto } from "node:crypto";
import "@testing-library/jest-dom/vitest";

// jsdom does not expose the WebCrypto SubtleCrypto API that password hashing
// relies on; production (WebView2) always provides it natively.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
} else if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, "subtle", { value: webcrypto.subtle, configurable: true });
}

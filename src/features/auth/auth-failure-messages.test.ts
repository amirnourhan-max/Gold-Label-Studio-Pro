import { describe, expect, it } from "vitest";
import { PersistenceFailure } from "../../services/database/persistence-failure";
import { CryptoUnavailableError } from "../../services/users/password-hashing";
import { CRYPTO_UNAVAILABLE_MESSAGE, messageForAuthFailure } from "./auth-session";

/**
 * A generic "database connection" message used to hide every failure, including
 * missing platform crypto and an unusable database file. These tests pin the
 * honest classification that replaced it.
 */
describe("authentication failure messages", () => {
  it("names the missing platform crypto provider instead of blaming the database", () => {
    const message = messageForAuthFailure(
      new CryptoUnavailableError("WebCrypto SubtleCrypto API is unavailable"),
    );

    expect(message).toBe(CRYPTO_UNAVAILABLE_MESSAGE);
    expect(message).not.toContain("پایگاه داده");
  });

  it("explains a database file that cannot be used", () => {
    expect(
      messageForAuthFailure(new PersistenceFailure("database-corrupt", "generic", "integrity check failed")),
    ).toBe("فایل پایگاه داده معتبر نیست");
    expect(
      messageForAuthFailure(new PersistenceFailure("schema-incompatible", "generic", "missing column users.username")),
    ).toBe("پایگاه داده موجود با این نسخه سازگار نیست");
    expect(
      messageForAuthFailure(new PersistenceFailure("directory-not-writable", "generic", "access denied")),
    ).toBe("پوشه داده‌های برنامه قابل نوشتن نیست");
  });

  it("keeps the approved message for a database that simply cannot be opened", () => {
    expect(messageForAuthFailure(new PersistenceFailure("load-failed", "generic", "pool error"))).toBe(
      "ارتباط با پایگاه داده برقرار نشد",
    );
  });

  it("falls back to the approved message for an unexpected failure", () => {
    expect(messageForAuthFailure(new Error("something else"))).toBe("ارتباط با پایگاه داده برقرار نشد");
    expect(messageForAuthFailure(undefined)).toBe("ارتباط با پایگاه داده برقرار نشد");
  });
});

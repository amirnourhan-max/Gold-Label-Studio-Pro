import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPasswordHasher,
  createUnavailablePasswordHasher,
  CryptoUnavailableError,
  PASSWORD_ALGORITHM,
  PASSWORD_VERSION,
} from "./password-hashing";

afterEach(() => vi.unstubAllGlobals());

const hasher = createPasswordHasher({ iterations: 1_000 });

describe("password hashing", () => {
  it("stores a derived digest with algorithm metadata and never the password", async () => {
    const result = await hasher.hash("GoldLabel1404");

    expect(result.algorithm).toBe(PASSWORD_ALGORITHM);
    expect(result.version).toBe(PASSWORD_VERSION);
    expect(result.hash).not.toContain("GoldLabel1404");
    expect(result.hash.startsWith(`${PASSWORD_ALGORITHM}$v${PASSWORD_VERSION}$1000$`)).toBe(true);
    expect(result.hash.split("$")).toHaveLength(5);
  });

  it("verifies the correct password and rejects a wrong one", async () => {
    const stored = await hasher.hash("GoldLabel1404");

    expect(await hasher.verify("GoldLabel1404", stored)).toBe(true);
    expect(await hasher.verify("GoldLabel1405", stored)).toBe(false);
    expect(await hasher.verify("", stored)).toBe(false);
  });

  it("uses a fresh random salt so equal passwords produce different digests", async () => {
    const first = await hasher.hash("GoldLabel1404");
    const second = await hasher.hash("GoldLabel1404");

    expect(first.hash).not.toBe(second.hash);
    expect(await hasher.verify("GoldLabel1404", first)).toBe(true);
    expect(await hasher.verify("GoldLabel1404", second)).toBe(true);
  });

  it("rejects missing or mismatched stored metadata", async () => {
    const stored = await hasher.hash("GoldLabel1404");

    expect(await hasher.verify("GoldLabel1404", { hash: null, algorithm: null, version: null })).toBe(false);
    expect(await hasher.verify("GoldLabel1404", { ...stored, algorithm: "argon2id" })).toBe(false);
    expect(await hasher.verify("GoldLabel1404", { ...stored, version: 2 })).toBe(false);
    expect(await hasher.verify("GoldLabel1404", { ...stored, hash: "not-a-valid-hash" })).toBe(false);
  });

  it("reports a missing platform crypto provider instead of a wrong password", async () => {
    const cryptoWithoutSubtle = { getRandomValues: (array: Uint8Array) => array };
    vi.stubGlobal("crypto", cryptoWithoutSubtle);

    expect(() => createPasswordHasher()).toThrow(CryptoUnavailableError);
  });

  it("refuses to hash or verify when no crypto provider is available", async () => {
    const unavailable = createUnavailablePasswordHasher("WebCrypto SubtleCrypto API is unavailable");

    await expect(unavailable.hash("GoldLabel1404")).rejects.toBeInstanceOf(CryptoUnavailableError);
    await expect(
      unavailable.verify("GoldLabel1404", {
        hash: "pbkdf2-sha256$v1$1000$c2FsdA==$ZGlnZXN0",
        algorithm: PASSWORD_ALGORITHM,
        version: PASSWORD_VERSION,
      }),
    ).rejects.toBeInstanceOf(CryptoUnavailableError);
  });

  it("honours the configured work factor", async () => {
    const strong = createPasswordHasher({ iterations: 4_000 });
    const stored = await strong.hash("GoldLabel1404");

    expect(stored.hash).toContain("$4000$");
    expect(await strong.verify("GoldLabel1404", stored)).toBe(true);
  });
});

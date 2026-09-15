import { afterEach, describe, expect, it, vi } from "vitest";
import { PersistenceFailure } from "../database/persistence-failure";

const createPasswordHasher = vi.fn();
const createDefaultUserGateway = vi.fn();

vi.mock("./password-hashing", async () => {
  const actual = await vi.importActual<typeof import("./password-hashing")>("./password-hashing");
  return {
    ...actual,
    createPasswordHasher: (...args: unknown[]) => createPasswordHasher(...args),
  };
});

vi.mock("./user-gateway", async () => {
  const actual = await vi.importActual<typeof import("./user-gateway")>("./user-gateway");
  return {
    ...actual,
    createDefaultUserGateway: (...args: unknown[]) => createDefaultUserGateway(...args),
  };
});

const { bootstrapAuthSession, CRYPTO_UNAVAILABLE_MESSAGE } = await import("./session-bootstrap");
const { createPasswordHasher: realHasher } = await import("./password-hashing");
const { MockUserGateway } = await import("./mock-user-gateway");

const hasher = realHasher({ iterations: 1_000 });
const shell = globalThis as Record<string, unknown>;

afterEach(() => {
  delete shell.__TAURI_INTERNALS__;
  createPasswordHasher.mockReset();
  createDefaultUserGateway.mockReset();
});

describe("session bootstrap", () => {
  it("keeps the gate closed and explains when platform crypto is missing", async () => {
    createPasswordHasher.mockImplementation(() => {
      throw new Error("WebCrypto SubtleCrypto API is unavailable");
    });

    const session = await bootstrapAuthSession();

    expect(session.cryptoAvailable).toBe(false);
    expect(session.preview).toBe(false);
    expect(session.hasCredentials).toBe(false);
    expect(session.unavailableReason).toBe(CRYPTO_UNAVAILABLE_MESSAGE);
  });

  it("keeps the gate closed and names the reason when the desktop database fails", async () => {
    shell.__TAURI_INTERNALS__ = {};
    createPasswordHasher.mockReturnValue(hasher);
    createDefaultUserGateway.mockRejectedValue(
      new PersistenceFailure("database-corrupt", "ارتباط با پایگاه داده برقرار نشد", "integrity check failed"),
    );

    const session = await bootstrapAuthSession();

    expect(session.preview).toBe(false);
    expect(session.hasCredentials).toBe(false);
    expect(session.unavailableReason).toBe("فایل پایگاه داده معتبر نیست");
  });

  it("reports no reason and no credentials for a healthy empty database", async () => {
    shell.__TAURI_INTERNALS__ = {};
    createPasswordHasher.mockReturnValue(hasher);
    createDefaultUserGateway.mockResolvedValue({ list: async () => [] });

    const session = await bootstrapAuthSession();

    expect(session.preview).toBe(false);
    expect(session.hasCredentials).toBe(false);
    expect(session.unavailableReason).toBeNull();
  });

  it("treats the in-memory fallback outside the desktop shell as preview", async () => {
    createPasswordHasher.mockReturnValue(hasher);
    createDefaultUserGateway.mockResolvedValue(new MockUserGateway());

    const session = await bootstrapAuthSession();

    expect(session.preview).toBe(true);
    expect(session.unavailableReason).toBeNull();
  });
});

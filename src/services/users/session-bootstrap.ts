import { PersistenceFailure, persistenceFailureMessage } from "../database/persistence-failure";
import { isTauriEnvironment } from "../hardware/hardware-environment";
import { AuthService, SessionStore } from "./auth-service";
import { MockUserGateway } from "./mock-user-gateway";
import { createPasswordHasher, createUnavailablePasswordHasher, type PasswordHasher } from "./password-hashing";
import { createDefaultUserGateway } from "./user-gateway";

export const CRYPTO_UNAVAILABLE_MESSAGE = "امکان رمزنگاری امن در این نسخه ویندوز فراهم نیست";

export type SessionBootstrapResult = Readonly<{
  auth: AuthService;
  /** True when at least one active user has a stored password hash. */
  hasCredentials: boolean;
  /**
   * True only where no persisted credentials can exist at all (browser preview
   * / jsdom). The gate never locks that environment out, because there is
   * nothing to authenticate against. A desktop database failure is *not* a
   * preview: it keeps the gate closed instead of unlocking the workspace.
   */
  preview: boolean;
  /** False when the platform has no WebCrypto, which blocks authentication. */
  cryptoAvailable: boolean;
  /** Honest reason shown on the login screen when something is unusable. */
  unavailableReason: string | null;
}>;

const resolveHasher = (): Readonly<{ hasher: PasswordHasher; reason: string | null }> => {
  try {
    return { hasher: createPasswordHasher(), reason: null };
  } catch (error) {
    // Never let this throw out of the bootstrap: an exception here used to leave
    // the session marked as a preview, which unlocked the workspace without
    // authenticating anybody.
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[auth] secure password hashing is unavailable: ${detail}`);
    return { hasher: createUnavailablePasswordHasher(detail), reason: CRYPTO_UNAVAILABLE_MESSAGE };
  }
};

const reasonFor = (error: unknown, fallback: string): string =>
  error instanceof PersistenceFailure ? persistenceFailureMessage(error.code) : fallback;

/**
 * Boots the authentication layer from persisted users.
 *
 * Every failure path stays closed and carries a real reason: a database error is
 * not treated as "trusted environment", and a missing platform crypto provider
 * cannot silently become an unlocked workspace.
 */
export const bootstrapAuthSession = async (
  session: SessionStore = new SessionStore(),
): Promise<SessionBootstrapResult> => {
  const { hasher, reason } = resolveHasher();

  if (reason !== null) {
    return {
      auth: new AuthService(new MockUserGateway(), hasher, session),
      hasCredentials: false,
      preview: false,
      cryptoAvailable: false,
      unavailableReason: reason,
    };
  }

  try {
    const gateway = await createDefaultUserGateway();
    const users = await gateway.list();
    const hasCredentials = users.some(
      user => user.isActive && typeof user.passwordHash === "string" && user.passwordHash.length > 0,
    );
    return {
      auth: new AuthService(gateway, hasher, session),
      hasCredentials,
      preview: gateway instanceof MockUserGateway,
      cryptoAvailable: true,
      unavailableReason: null,
    };
  } catch (error) {
    // Fail closed and keep the real reason: reporting it as a generic failure
    // made the installed build undiagnosable.
    const desktop = isTauriEnvironment();
    const detail = reasonFor(error, "ارتباط با پایگاه داده برقرار نشد");
    console.error("[persistence] authentication bootstrap could not read the users table", error);
    return {
      auth: new AuthService(new MockUserGateway(), hasher, session),
      hasCredentials: false,
      preview: !desktop,
      cryptoAvailable: true,
      unavailableReason: desktop ? detail : null,
    };
  }
};

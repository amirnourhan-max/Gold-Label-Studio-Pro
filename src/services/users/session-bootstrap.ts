import { isTauriEnvironment } from "../hardware/hardware-environment";
import { AuthService, SessionStore } from "./auth-service";
import { MockUserGateway } from "./mock-user-gateway";
import { createPasswordHasher } from "./password-hashing";
import { createDefaultUserGateway } from "./user-gateway";

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
}>;

/**
 * Boots the authentication layer from persisted users. A database error is
 * treated as "no credentials yet" rather than "trusted environment", so the app
 * falls back to the login screen instead of becoming unreachable or unlocked.
 */
export const bootstrapAuthSession = async (
  session: SessionStore = new SessionStore(),
): Promise<SessionBootstrapResult> => {
  try {
    const gateway = await createDefaultUserGateway();
    const users = await gateway.list();
    const hasCredentials = users.some(
      user => user.isActive && typeof user.passwordHash === "string" && user.passwordHash.length > 0,
    );
    return {
      auth: new AuthService(gateway, createPasswordHasher(), session),
      hasCredentials,
      preview: gateway instanceof MockUserGateway,
    };
  } catch {
    return {
      auth: new AuthService(new MockUserGateway(), createPasswordHasher(), session),
      hasCredentials: false,
      preview: !isTauriEnvironment(),
    };
  }
};

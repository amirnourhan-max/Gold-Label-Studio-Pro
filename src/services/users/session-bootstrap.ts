import { AuthService, SessionStore } from "./auth-service";
import { MockUserGateway } from "./mock-user-gateway";
import { createPasswordHasher } from "./password-hashing";
import { createDefaultUserGateway } from "./user-gateway";

export type SessionBootstrapResult = Readonly<{
  auth: AuthService;
  /** True when at least one active user has a stored password hash. */
  hasCredentials: boolean;
  /**
   * True on the controlled in-memory fallback (browser preview / tests) where
   * no persisted credentials can exist. The gate never locks that environment
   * out, because there is nothing to authenticate against.
   */
  preview: boolean;
}>;

/**
 * Boots the authentication layer from persisted users. A database error (or a
 * missing SQLite driver) is treated as "no credentials yet" instead of a hard
 * failure, so the app never becomes unreachable.
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
      preview: true,
    };
  }
};

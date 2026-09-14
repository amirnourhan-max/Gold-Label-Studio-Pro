import type { UserRecord, UserRole } from "../../types/persistence";
import type { PasswordHasher } from "./password-hashing";

export type AuthenticatedUser = Readonly<{
  id: string;
  displayName: string;
  username: string;
  role: UserRole;
}>;

export type AuthResult =
  | Readonly<{ status: "authenticated"; user: AuthenticatedUser }>
  | Readonly<{ status: "invalid-credentials" }>
  | Readonly<{ status: "inactive" }>;

export type AuthGateway = Readonly<{
  findByUsername(username: string): Promise<UserRecord | null>;
}>;

/** Holds the signed-in user for the current application session. */
export class SessionStore {
  private current: AuthenticatedUser | null = null;

  get(): AuthenticatedUser | null {
    return this.current;
  }

  isAuthenticated(): boolean {
    return this.current !== null;
  }

  set(user: AuthenticatedUser): void {
    this.current = user;
  }

  clear(): void {
    this.current = null;
  }
}

const toAuthenticatedUser = (user: UserRecord): AuthenticatedUser => ({
  id: user.id,
  displayName: user.displayName,
  username: user.username,
  role: user.role,
});

/**
 * Verifies credentials against persisted users. Passwords are never logged, and
 * verification only ever compares a derived digest inside this service.
 */
export class AuthService {
  constructor(
    private readonly gateway: AuthGateway,
    private readonly hasher: PasswordHasher,
    private readonly session: SessionStore = new SessionStore(),
  ) {}

  async authenticate(username: string, password: string): Promise<AuthResult> {
    const candidate = username.trim();
    if (candidate === "" || password === "") return { status: "invalid-credentials" };

    const user = await this.gateway.findByUsername(candidate);
    if (!user) return { status: "invalid-credentials" };
    if (!user.isActive) return { status: "inactive" };

    const verified = await this.hasher.verify(password, {
      hash: user.passwordHash,
      algorithm: user.passwordAlgorithm,
      version: user.passwordVersion,
    });
    if (!verified) return { status: "invalid-credentials" };

    const authenticated = toAuthenticatedUser(user);
    this.session.set(authenticated);
    return { status: "authenticated", user: authenticated };
  }

  currentUser(): AuthenticatedUser | null {
    return this.session.get();
  }

  isAuthenticated(): boolean {
    return this.session.isAuthenticated();
  }

  signOut(): void {
    this.session.clear();
  }
}

/** Authorization helper for the two roles the current schema supports. */
export const canManageUsers = (user: AuthenticatedUser | null): boolean => user?.role === "admin";

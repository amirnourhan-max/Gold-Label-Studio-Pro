import { openPersistenceDatabase } from "../database/database-bootstrap";
import { UserRepository } from "../../repositories/user-repository";
import { asUtcIsoString } from "../../types/persistence";
import { AuthService, SessionStore, type AuthGateway } from "./auth-service";
import { MockUserGateway } from "./mock-user-gateway";
import { PersistenceUserGateway } from "./persistence-user-gateway";
import { createPasswordHasher } from "./password-hashing";
import { UserService, type UserServiceEnvironment } from "./user-service";
import type { UserGateway } from "./user-contract";

/**
 * Single persistence-aware entry point for users and authentication. UI modules
 * call these factories; they never touch SqlClient or the SQL plugin themselves.
 * The controlled in-memory gateway keeps the approved screen working in preview.
 */
export const createDefaultUserGateway = async (): Promise<UserGateway & AuthGateway> => {
  try {
    const client = await openPersistenceDatabase();
    return new PersistenceUserGateway(new UserRepository(client));
  } catch {
    return new MockUserGateway();
  }
};

const environment: UserServiceEnvironment = {
  now: () => asUtcIsoString(new Date().toISOString()),
  newId: () => globalThis.crypto.randomUUID(),
};

export const createDefaultUserService = async (): Promise<UserService> =>
  new UserService(await createDefaultUserGateway(), createPasswordHasher(), environment);

export const createDefaultAuthService = async (
  session: SessionStore = new SessionStore(),
): Promise<AuthService> =>
  new AuthService(await createDefaultUserGateway(), createPasswordHasher(), session);

let sharedUserService: Promise<UserService> | null = null;

/** One shared service (and therefore one database connection) per application run. */
export const defaultUserService = (): Promise<UserService> => {
  sharedUserService ??= createDefaultUserService();
  return sharedUserService;
};

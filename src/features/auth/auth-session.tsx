import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthenticatedUser } from "../../services/users/auth-service";
import { bootstrapAuthSession, type SessionBootstrapResult } from "../../services/users/session-bootstrap";
import { createDefaultUserService } from "../../services/users/user-gateway";

export type SignInFailureReason = "invalid-credentials" | "inactive" | "error";

export type SignInResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: SignInFailureReason; message: string }>;

export type CreateFirstAdminInput = Readonly<{
  displayName: string;
  username: string;
  password: string;
  confirmation: string;
}>;

export type AuthSessionValue = Readonly<{
  status: "loading" | "ready";
  user: AuthenticatedUser | null;
  hasCredentials: boolean;
  preview: boolean;
  signIn(username: string, password: string): Promise<SignInResult>;
  signOut(): void;
  createFirstAdmin(input: CreateFirstAdminInput): Promise<SignInResult>;
}>;

const failureMessages: Readonly<Record<SignInFailureReason, string>> = {
  "invalid-credentials": "نام کاربری یا رمز عبور نادرست است",
  inactive: "این حساب غیرفعال شده است",
  error: "ارتباط با پایگاه داده برقرار نشد",
};

const failure = (reason: SignInFailureReason): SignInResult => ({
  ok: false,
  reason,
  message: failureMessages[reason],
});

/**
 * Standalone default so components rendered without the provider (unit tests,
 * isolated previews) behave as a signed-out session instead of throwing.
 */
const signedOutSession: AuthSessionValue = {
  status: "ready",
  user: null,
  hasCredentials: false,
  preview: true,
  signIn: async () => failure("error"),
  signOut: () => {},
  createFirstAdmin: async () => failure("error"),
};

/** Exported so tests (and future embedders) can inject a controlled session. */
export const AuthSessionContext = createContext<AuthSessionValue>(signedOutSession);

export const useAuthSession = (): AuthSessionValue => useContext(AuthSessionContext);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const bootstrap = useRef<SessionBootstrapResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [preview, setPreview] = useState(true);

  useEffect(() => {
    let active = true;
    bootstrapAuthSession()
      .then(result => {
        if (!active) return;
        bootstrap.current = result;
        setHasCredentials(result.hasCredentials);
        setPreview(result.preview);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("ready");
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<SignInResult> => {
    const session = bootstrap.current;
    if (!session) return failure("error");
    try {
      const outcome = await session.auth.authenticate(username, password);
      if (outcome.status === "authenticated") {
        setUser(outcome.user);
        return { ok: true };
      }
      return failure(outcome.status === "inactive" ? "inactive" : "invalid-credentials");
    } catch {
      return failure("error");
    }
  }, []);

  const signOut = useCallback((): void => {
    bootstrap.current?.auth.signOut();
    setUser(null);
  }, []);

  const createFirstAdmin = useCallback(async (input: CreateFirstAdminInput): Promise<SignInResult> => {
    try {
      if (input.password !== input.confirmation) {
        return { ok: false, reason: "error", message: "تکرار رمز عبور مطابقت ندارد" };
      }
      const service = await createDefaultUserService();
      const created = await service.createUser({
        displayName: input.displayName,
        username: input.username,
        role: "admin",
        password: input.password,
      });
      if (created.status === "invalid") {
        return { ok: false, reason: "error", message: created.issues[0]?.message ?? failureMessages.error };
      }
      if (created.status === "failed") {
        return { ok: false, reason: "error", message: created.message };
      }
      setHasCredentials(true);
      return signIn(input.username, input.password);
    } catch {
      return failure("error");
    }
  }, [signIn]);

  const value = useMemo<AuthSessionValue>(
    () => ({ status, user, hasCredentials, preview, signIn, signOut, createFirstAdmin }),
    [status, user, hasCredentials, preview, signIn, signOut, createFirstAdmin],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

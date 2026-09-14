import { useState, type FormEvent } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { referenceAssets } from "../../assets/reference";
import { useAuthSession } from "./auth-session";
import "./login-page.css";

export type LoginMode = "sign-in" | "first-run";

/**
 * Real authentication screen. `first-run` is shown when the persisted database
 * has no user with a password yet, so a fresh installation can create its first
 * administrator instead of locking itself out.
 */
export function LoginPage({ mode = "sign-in" }: { mode?: LoginMode }) {
  const { signIn, createFirstAdmin } = useAuthSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const firstRun = mode === "first-run";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = firstRun
      ? await createFirstAdmin({ displayName, username, password, confirmation })
      : await signIn(username, password);

    if (!result.ok) {
      setError(result.message);
      setPassword("");
      setConfirmation("");
    }
    setBusy(false);
  };

  return (
    <div className="login-screen" data-testid="login-page">
      <form className="login-card" onSubmit={event => void submit(event)} noValidate>
        <div className="login-brand">
          <img src={referenceAssets.brandDiamond} alt="" />
          <div>
            <strong>Gold Label Studio Pro</strong>
            <span>سیستم جامع لیبل‌زنی و ردیابی طلا و جواهر</span>
          </div>
        </div>

        <h1 className="login-heading">{firstRun ? "راه‌اندازی اولیه" : "ورود به برنامه"}</h1>
        <p className="login-sub">
          {firstRun
            ? "هنوز رمز عبوری ثبت نشده است. برای شروع، حساب مدیر سیستم را بسازید."
            : "برای دسترسی به فضای کاری، نام کاربری و رمز عبور خود را وارد کنید."}
        </p>

        {firstRun ? (
          <div className="login-field">
            <label htmlFor="login-display-name">نام و نام خانوادگی</label>
            <input
              id="login-display-name"
              name="displayName"
              value={displayName}
              autoComplete="name"
              onChange={event => setDisplayName(event.target.value)}
            />
          </div>
        ) : null}

        <div className="login-field">
          <label htmlFor="login-username">نام کاربری</label>
          <input
            id="login-username"
            name="username"
            value={username}
            autoComplete="username"
            aria-invalid={error !== null}
            onChange={event => setUsername(event.target.value)}
          />
        </div>

        <div className="login-field">
          <label htmlFor="login-password">رمز عبور</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            autoComplete={firstRun ? "new-password" : "current-password"}
            aria-invalid={error !== null}
            onChange={event => setPassword(event.target.value)}
          />
        </div>

        {firstRun ? (
          <div className="login-field">
            <label htmlFor="login-confirmation">تکرار رمز عبور</label>
            <input
              id="login-confirmation"
              name="confirmation"
              type="password"
              value={confirmation}
              autoComplete="new-password"
              onChange={event => setConfirmation(event.target.value)}
            />
          </div>
        ) : null}

        {error ? (
          <div className="login-error" role="alert" data-testid="login-error">
            <ShieldCheck size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        {firstRun ? (
          <div className="login-hint">
            <ShieldCheck size={16} />
            <span>رمز عبور باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد و فقط به‌صورت هش‌شده ذخیره می‌شود.</span>
          </div>
        ) : null}

        <button className="login-submit" type="submit" disabled={busy}>
          <LogIn size={16} />
          {busy ? "در حال بررسی..." : firstRun ? "ایجاد مدیر سیستم و ورود" : "ورود"}
        </button>

        <p className="login-foot">دسترسی فقط برای کاربران فعال و ثبت‌شده در پایگاه داده امکان‌پذیر است.</p>
      </form>
    </div>
  );
}

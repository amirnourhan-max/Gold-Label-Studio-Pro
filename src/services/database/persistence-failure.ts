/**
 * Failure contract shared by the desktop persistence layer and the interface.
 *
 * Kept in its own module so the reason a database is unusable can be classified
 * without pulling in the SQL client (which only exists inside the desktop
 * shell).
 */

/**
 * Reason a database cannot be used, reported by the Rust bootstrap. Stable
 * contract shared with `SchemaFailureCode::label`.
 */
export type PersistenceFailureCode =
  | "directory-unresolved"
  | "directory-not-writable"
  | "database-corrupt"
  | "database-not-writable"
  | "schema-incompatible"
  | "load-failed"
  | "unknown";

/** What the Rust layer did with the production database while starting up. */
export type PersistenceStatusReport = Readonly<{
  databaseUrl: string;
  databasePath: string;
  directory: string;
  initialized: boolean;
  createdFile: boolean;
  appliedSchema: boolean;
  tablesPresent: number;
  tablesExpected: number;
  integrity: string;
  recordedSqlxMigrations: readonly number[];
  warnings: readonly string[];
  errorCode: string | null;
  error: string | null;
}>;

/**
 * A failure that keeps its technical detail. The interface shows a friendly
 * message, but the underlying reason is logged and reported, so an installed
 * build is diagnosable without a debugger attached.
 */
export class PersistenceFailure extends Error {
  constructor(
    readonly code: PersistenceFailureCode,
    message: string,
    readonly detail: string,
  ) {
    super(message);
    this.name = "PersistenceFailure";
  }
}

const messages: Readonly<Record<PersistenceFailureCode, string>> = {
  "directory-unresolved": "پوشه داده‌های برنامه پیدا نشد",
  "directory-not-writable": "پوشه داده‌های برنامه قابل نوشتن نیست",
  "database-corrupt": "فایل پایگاه داده معتبر نیست",
  "database-not-writable": "فایل پایگاه داده قابل نوشتن نیست",
  "schema-incompatible": "پایگاه داده موجود با این نسخه سازگار نیست",
  "load-failed": "ارتباط با پایگاه داده برقرار نشد",
  unknown: "ارتباط با پایگاه داده برقرار نشد",
};

export const persistenceFailureMessage = (code: PersistenceFailureCode): string => messages[code];

const isFailureCode = (value: string | null): value is PersistenceFailureCode =>
  value !== null && Object.prototype.hasOwnProperty.call(messages, value);

export const toPersistenceFailureCode = (value: string | null): PersistenceFailureCode =>
  isFailureCode(value) ? value : "unknown";

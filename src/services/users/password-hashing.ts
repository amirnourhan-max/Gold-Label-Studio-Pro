export type PasswordHash = Readonly<{
  hash: string;
  algorithm: string;
  version: number;
}>;

/** Stored hash metadata as persisted by the users table. */
export type StoredPasswordHash = Readonly<{
  hash: string | null;
  algorithm: string | null;
  version: number | null;
}>;

export type PasswordHasher = Readonly<{
  hash(password: string): Promise<PasswordHash>;
  verify(password: string, stored: StoredPasswordHash): Promise<boolean>;
}>;

/**
 * Raised when the platform WebCrypto implementation is missing. Password
 * derivation needs a secure context, so this must surface as its own reason
 * instead of looking like a wrong password or a database problem.
 */
export class CryptoUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoUnavailableError";
  }
}

export const PASSWORD_ALGORITHM = "pbkdf2-sha256";
export const PASSWORD_VERSION = 1;
/** OWASP-recommended PBKDF2-HMAC-SHA256 work factor. */
export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const DERIVED_BITS = 256;

type HasherOptions = Readonly<{
  iterations?: number;
  subtle?: SubtleCrypto;
  randomBytes?: (length: number) => Uint8Array;
}>;

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

/** Length-independent comparison so verification does not leak the digest prefix. */
const constantTimeEquals = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
};

const parseHash = (value: string): Readonly<{ iterations: number; salt: Uint8Array; digest: Uint8Array }> | null => {
  const [algorithm, version, iterations, salt, digest] = value.split("$");
  if (algorithm !== PASSWORD_ALGORITHM || version !== `v${PASSWORD_VERSION}`) return null;
  const rounds = Number.parseInt(iterations, 10);
  if (!Number.isFinite(rounds) || rounds <= 0 || !salt || !digest) return null;
  try {
    return { iterations: rounds, salt: fromBase64(salt), digest: fromBase64(digest) };
  } catch {
    return null;
  }
};

/**
 * PBKDF2-HMAC-SHA256 through the platform WebCrypto implementation (available in
 * the Tauri WebView and Node). Hashing and verification stay in the service
 * layer; only the derived digest and its metadata ever reach persistence.
 */
/**
 * Fail-closed stand-in used when the platform has no WebCrypto: hashing and
 * verification both refuse, so nobody can be authenticated and no plaintext or
 * weak digest is ever produced as a substitute.
 */
export const createUnavailablePasswordHasher = (reason: string): PasswordHasher => ({
  hash: async () => {
    throw new CryptoUnavailableError(reason);
  },
  verify: async () => {
    throw new CryptoUnavailableError(reason);
  },
});

export const createPasswordHasher = (options: HasherOptions = {}): PasswordHasher => {
  const iterations = options.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const randomBytes = options.randomBytes
    ?? ((length: number) => globalThis.crypto.getRandomValues(new Uint8Array(length)));
  const subtle = options.subtle ?? globalThis.crypto?.subtle;
  if (!subtle) throw new CryptoUnavailableError("WebCrypto SubtleCrypto API is unavailable");

  const derive = async (password: string, salt: Uint8Array, rounds: number): Promise<Uint8Array> => {
    const key = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await subtle.deriveBits(
      { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: rounds, hash: "SHA-256" },
      key,
      DERIVED_BITS,
    );
    return new Uint8Array(bits);
  };

  return {
    async hash(password: string): Promise<PasswordHash> {
      const salt = randomBytes(SALT_BYTES);
      const digest = await derive(password, salt, iterations);
      return {
        hash: [PASSWORD_ALGORITHM, `v${PASSWORD_VERSION}`, iterations, toBase64(salt), toBase64(digest)].join("$"),
        algorithm: PASSWORD_ALGORITHM,
        version: PASSWORD_VERSION,
      };
    },

    async verify(password: string, stored: StoredPasswordHash): Promise<boolean> {
      if (!stored.hash || !stored.algorithm || stored.version === null) return false;
      if (stored.algorithm !== PASSWORD_ALGORITHM || stored.version !== PASSWORD_VERSION) return false;
      const parsed = parseHash(stored.hash);
      if (!parsed) return false;
      const digest = await derive(password, parsed.salt, parsed.iterations);
      return constantTimeEquals(digest, parsed.digest);
    },
  };
};

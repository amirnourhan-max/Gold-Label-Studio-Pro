/**
 * The project intentionally does not depend on @types/node. Vitest runs in Node,
 * so the test setup polyfills jsdom's missing SubtleCrypto from node:crypto and
 * needs this minimal ambient declaration for it.
 */
declare module "node:crypto" {
  export const webcrypto: Crypto;
}

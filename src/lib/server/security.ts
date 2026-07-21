import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison of two secrets/tokens.
 *
 * Guards against the two ways `timingSafeEqual` can throw or leak:
 *  - it throws if the two buffers differ in length, so we length-check first
 *    (returning false) instead of letting it throw;
 *  - a plain `a === b` short-circuits on the first differing byte, leaking a
 *    timing signal an attacker can use to recover the secret byte-by-byte.
 *
 * Both inputs are hashed to a fixed length would be ideal, but comparing the
 * raw UTF-8 bytes in constant time is sufficient here and avoids extra work.
 * The early length check is itself a (tiny) side channel on secret *length*,
 * which is not sensitive for our fixed-length webhook secrets.
 */
export function safeSecretEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // timingSafeEqual requires equal-length buffers or it throws.
  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
}

/**
 * Convenience for `Authorization: Bearer <secret>` header checks.
 * Compares the full header value against `Bearer ${expected}` in constant time.
 */
export function safeBearerEqual(
  authHeader: string | null | undefined,
  expectedSecret: string | null | undefined
): boolean {
  if (typeof expectedSecret !== 'string' || expectedSecret.length === 0) return false;
  return safeSecretEqual(authHeader, `Bearer ${expectedSecret}`);
}

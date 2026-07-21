import type { RequestEvent } from '@sveltejs/kit';

/**
 * In-memory fixed-window rate limiter — zero external dependencies.
 *
 * KNOWN LIMITATIONS (acceptable pre-launch on a single Railway instance):
 *  - State lives in process memory, so counters RESET ON EVERY DEPLOY/restart.
 *  - It is PER-INSTANCE: if the app is ever scaled horizontally, each instance
 *    tracks its own window and the effective limit multiplies by instance count.
 *  - It is best-effort abuse mitigation, NOT a security boundary. The real
 *    protection for webhooks is the constant-time secret check; this just caps
 *    brute-force / spam volume.
 *
 * When moving beyond a single instance, swap the `buckets` Map for a shared
 * store (Upstash/Redis) behind the same `rateLimit()` signature.
 */

// ── Tunable limits ──────────────────────────────────────────────────────────
// Each preset is { windowMs, max } — at most `max` requests per `windowMs` per key.
export const RATE_LIMITS = {
  // Contact form: emails hello@saltgoat.co + inserts a row per submit.
  contact: { windowMs: 60_000, max: 3 },
  // Webhook secret checks: cap brute-force attempts per IP.
  webhook: { windowMs: 60_000, max: 10 },
  // User-generated content creation (forum topics/replies, comments).
  ugc: { windowMs: 60_000, max: 20 }
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

interface Bucket {
  count: number;
  resetAt: number;
}

// key = `${name}:${clientKey}` → bucket
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the Map doesn't grow unbounded across a long-lived
// process. Runs at most once per sweep interval, on access.
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 5 * 60_000;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets (for Retry-After). */
  retryAfter: number;
}

/**
 * Record a hit for `key` under the named limit and report whether it's allowed.
 * `key` is typically a client IP (see `clientKey`).
 */
export function rateLimit(name: RateLimitName, key: string): RateLimitResult {
  const { windowMs, max } = RATE_LIMITS[name];
  const now = Date.now();
  sweep(now);

  const bucketKey = `${name}:${key}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit: max, remaining: max - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const allowed = existing.count <= max;
  return {
    allowed,
    limit: max,
    remaining: Math.max(0, max - existing.count),
    retryAfter: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000)
  };
}

/**
 * Derive a client key (IP) from the request. Honors the Railway/edge proxy
 * `x-forwarded-for` chain (first hop = original client), falling back to
 * SvelteKit's `getClientAddress()`.
 */
export function clientKey(event: Pick<RequestEvent, 'request' | 'getClientAddress'>): string {
  const forwarded = event.request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  try {
    return event.getClientAddress();
  } catch {
    return 'unknown';
  }
}

/**
 * Build a 429 JSON Response with a Retry-After header. Callers that use SvelteKit
 * form actions should instead branch on `result.allowed` and return `fail(429, ...)`.
 */
export function tooManyRequests(result: RateLimitResult, message = 'Too many requests. Please slow down.'): Response {
  return new Response(JSON.stringify({ error: message, retryAfter: result.retryAfter }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfter)
    }
  });
}

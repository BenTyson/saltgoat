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
 * Derive a client key (IP) from the request.
 *
 * FIX (R-H1 / Fable review, S1-S2-webhooks-infra-review.md#H1): this used to
 * read the FIRST hop of `x-forwarded-for`, which is attacker-supplied — a
 * client can put anything there, so keying on it made the limiter both
 * bypassable (spoof a new "IP" per request) and a DoS lever (spoof a
 * legitimate caller's IP, e.g. RevenueCat/Supabase's egress address, to burn
 * their bucket and 429 real webhook traffic).
 *
 * We now key exclusively on SvelteKit's `event.getClientAddress()`, which is
 * the platform-trusted client address rather than a raw header we parse
 * ourselves. On adapter-node this reads the socket's remote address UNLESS
 * `ADDRESS_HEADER` + `XFF_DEPTH` are set, in which case it walks the
 * `x-forwarded-for` chain from the *right* (proxy-appended) end by the
 * configured depth — the trustworthy hop, not the client-controlled one.
 *
 * ACTION REQUIRED on Railway: set `ADDRESS_HEADER=x-forwarded-for` and
 * `XFF_DEPTH=1` (one trusted proxy hop) so this resolves real per-client IPs.
 * Until those env vars are set, every request behind Railway's proxy shares
 * one address (the proxy's), which coarsens rate limits (shared bucket) but
 * — importantly — is not spoofable, so it fails safe rather than open.
 */
export function clientKey(event: Pick<RequestEvent, 'getClientAddress'>): string {
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

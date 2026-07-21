# Adversarial Review — Sessions 1 & 2 (non-auth): webhooks, rate limiting, observability, types barrel

**Scope:** commits `4ff2f2e` (types barrel restore, T1-1) and `2d26df4` (webhook hardening, rate limiting, observability — T1-3/T1-4/T1-7/T1-8). Auth/`getUser()` swap reviewed separately.
**Reviewed:** `src/lib/server/{security,rateLimit,logger}.ts`, `src/hooks.server.ts`, the 3 webhooks, `src/lib/types/database.ts`, rate-limited call sites.
**Date:** 2026-07-21 · Reviewer: Fable adversarial pass

## Verdict

**Directionally right, two real holes.** `security.ts` is correct and idiomatic — no findings above informational. The logger/`handleError` seam is sound in shape. But the rate limiter is keyed on an attacker-controlled header (making it both bypassable and weaponizable against legitimate webhook callers), and the RevenueCat "5xx-on-failure" fix has a gap that recreates the exact silent-failure class T1-4 set out to kill (`UPDATE` matching 0 rows is not an error). The T1-1 barrel restore is runtime-safe but points at **stale** shared types missing 9 relations — the type safety it "restored" is partly illusory.

**Counts:** 2 High · 3 Medium · 6 Low · 3 Info/notes.

---

## High

### H1 — `clientKey()` trusts the first (attacker-controlled) `x-forwarded-for` hop: rate limit is bypassable AND a DoS lever against legit webhook callers

**File:** `src/lib/server/rateLimit.ts:92-103`; consumed at `src/routes/api/webhooks/revenuecat/+server.ts:32`, `user-signup/+server.ts:21`, `weather/+server.ts:89,221`, `contact/+page.server.ts:17`, the 3 UGC endpoints.

```ts
const forwarded = event.request.headers.get('x-forwarded-for');
if (forwarded) {
  const first = forwarded.split(',')[0]?.trim();   // ← first hop = client-supplied
  if (first) return first;
}
```

Behind Railway's edge, the proxy **appends** the real client IP to whatever `x-forwarded-for` the client already sent. The first element of the chain is therefore chosen by the attacker; only the **rightmost** hop (minus trusted proxies) is trustworthy. The docstring's claim "first hop = original client" is the classic XFF mistake.

Two concrete failure scenarios:

1. **Total bypass.** `for i in $(seq 1 100000); do curl -H "X-Forwarded-For: 10.0.$((i/256)).$((i%256))" https://saltgoat.co/api/webhooks/revenuecat ...; done` — every request lands in a fresh bucket. Webhook-secret brute-force capping (the stated purpose, `rateLimit.ts:23`) and contact-form throttling are both nullified. Side effect: each spoofed IP allocates a Map entry; with 60s windows and a 5-min sweep (`rateLimit.ts:42`), sustained 1k req/s holds ~300k live entries — not fatal, but attacker-controlled memory.
2. **Targeted 429 DoS of legitimate callers.** RevenueCat and Supabase webhooks egress from a small, discoverable IP set. An attacker sends 10 junk req/min with `X-Forwarded-For: <RC egress IP>` (no secret needed — the limiter runs **before** the auth check, `revenuecat/+server.ts:32-43`). The bucket for RC's real IP stays exhausted, so every legitimate `INITIAL_PURCHASE`/`RENEWAL` gets 429. RC retries non-2xx, so entitlements are *delayed* under intermittent attack and *dropped after the retry horizon* under sustained attack. Same lever silences welcome emails (user-signup) and the weather cron.

**Fix (pick one, prefer both):**
- Key on the trustworthy hop: with adapter-node, set `ADDRESS_HEADER=x-forwarded-for` + `XFF_DEPTH=1` env vars on Railway (currently unset — verified no `ADDRESS_HEADER` anywhere in the repo) and use `event.getClientAddress()` **only** — delete the first-hop XFF parse. If Railway ever adds a hop, bump `XFF_DEPTH`.
- For the three secret-guarded webhooks, drop the pre-auth IP limiter entirely or move it **after** a failed secret check (count only auth *failures* per IP). The constant-time compare is cheap; rate-limiting successful, authenticated webhook traffic only creates the DoS surface in scenario 2 while adding nothing (an attacker without the secret gets 401s forever anyway; with the secret, 10/min doesn't stop them).

### H2 — RevenueCat: `UPDATE … eq(user_id)` matching **zero rows** returns no error → RENEWAL/EXPIRATION/CANCELLATION/BILLING_ISSUE silently 200 with no state change

**File:** `src/routes/api/webhooks/revenuecat/+server.ts:89-137` (all four `.update()` branches), gate at `:148`.

PostgREST does not error on an `UPDATE` that matches 0 rows — `error` is `null`, `dbError` stays `null`, the handler returns `{ received: true }` (`:158`). The commit's own invariant ("A paying customer must not silently miss Pro", `:149`) is violated on every non-`INITIAL_PURCHASE` event for a user with no `user_subscriptions` row:

- **Scenario A (lost upgrade):** `INITIAL_PURCHASE` delivery fails past RC's retry horizon (outage > retry window, or 429-starved per H1). The subsequent `RENEWAL` a month later — which carries everything needed to grant Pro — matches 0 rows, 200s, and the paying customer never gets Pro. No log, no retry, exactly the T1-4 failure mode, one event later.
- **Scenario B (zombie Pro):** row deleted/reset out-of-band; `EXPIRATION` matches 0 rows and 200s. Harmless today, but combined with any code path that recreates the row as `pro/active`, the downgrade is lost.

**Fix:** make every branch an **upsert** keyed on `user_id` (RENEWAL carries `expiration_at_ms`; EXPIRATION/CANCELLATION can upsert `plan/status` with `onConflict: 'user_id'`), or append `.select('user_id')` and treat `data.length === 0` as `dbError` so it hits the 5xx path and RC retries. Upsert is strictly better for RENEWAL (heals scenario A automatically).

---

## Medium

### M1 — RevenueCat: non-UUID `app_user_id` now produces a guaranteed-failure 500 retry loop

**File:** `src/routes/api/webhooks/revenuecat/+server.ts:45-52, 66-78, 148-156.`

`app_user_id` is passed straight into `user_id` (a `uuid` column). RC sends events with anonymous IDs (`$RCAnonymousID:…`) for purchases made before/without `Purchases.logIn`, and TRANSFER-adjacent flows can surface alias IDs. Pre-change these 200'd silently (bad); post-change the Postgres `invalid input syntax for type uuid` error trips the new 5xx path, so RC retries an event that **can never succeed** for its full retry window — log spam at error level, wasted retries, and (per H1's shared 10/min bucket) retry traffic that crowds out deliverable events behind the same IP key.

**Fix:** validate `app_user_id` against a UUID regex up front; if it doesn't parse, `logger.warn` + return **200** (`{ received: true, skipped: 'non-uuid app_user_id' }`) — it's undeliverable by construction, so retrying is pure waste. Keep 5xx strictly for transient DB failures.

### M2 — RevenueCat: no event-ordering guard — a retried stale event can resurrect Pro after EXPIRATION

**File:** `src/routes/api/webhooks/revenuecat/+server.ts:60-146.`

The 5xx-retry change makes out-of-order delivery a live concern: RC retries a failed event for up to ~24h while newer events succeed in between. Sequence: `RENEWAL` fails transiently (5xx, queued for retry) → `EXPIRATION` arrives and succeeds (`plan=free, status=canceled`) → the stale `RENEWAL` retry lands and flips `status='active'` with an old `current_period_end`. Whether the user regains Pro depends on how `isPro`/`getSubscription` weighs `status` vs `current_period_end`; at minimum the row is internally inconsistent (`plan=free, status=active`). Writes are individually idempotent, but idempotent ≠ commutative.

**Fix:** persist the event timestamp (RC sends `event.event_timestamp_ms`) in a `last_event_at` column and make every write conditional: `.gte`-guard in the upsert/update (`WHERE last_event_at IS NULL OR last_event_at <= :event_ts`), skipping (200) when the incoming event is older than the applied state.

### M3 — T1-1: the restored barrel points at **stale** shared types — 9 relations missing; nothing caught it because the type safety was already bypassed

**Files:** `src/lib/types/database.ts:1-2` (barrel), `packages/shared/src/types/database.ts` (stale), `src/lib/server/forum/utils.ts:4-5`, `src/lib/server/supabase.ts:37`.

Diffing the table list of the deleted raw-gen file (`4ff2f2e^:src/lib/types/database.ts`) against `@saltgoat/shared/types/database`:

Missing from shared: `contact_submissions`, `forum_bookmarks`, `forum_categories`, `forum_mentions`, `forum_reactions`, `forum_replies`, `forum_topic_views`, `forum_topics`, plus the `search_forum` function. The "corrupted" file was corrupted in *format* but **newer in content** — it was regenerated after the forum + contact migrations; the shared package never was.

Why `svelte-check` didn't flinch (verified: 31 errors, none forum/contact-typed):
- `forum/utils.ts:5` — `return supabase as unknown as SupabaseClient;` — every one of the 33 `db()` call sites is fully untyped.
- `supabase.ts:37` — `createSupabaseServiceClient()` calls `createClient(...)` **without** `<Database>`, so `contact_submissions` inserts (`contact/+page.server.ts:56`, `admin/contact/+page.server.ts:8`) are unchecked too.

No active runtime bug (types are erased), but the restore's stated win — "clears ~70 svelte-check errors" — partly reflects pointing the barrel at types that don't know these tables exist. Column typos, nullability mistakes, and schema drift in the entire forum module and contact path are invisible.

**Fix:** run the documented command (`supabase gen types typescript --project-id seywnbufuewbiwoouwkk 2>/dev/null > packages/shared/src/types/database.ts`), verify the output starts with `export type Json` (not a CLI notice), then delete the `db()` cast in `forum/utils.ts` and add `<Database>` to `createSupabaseServiceClient` and fix the fallout. Until then, treat forum/contact queries as untested-by-types.

---

## Low

### L1 — `handleError` logs error-level (and will Sentry-report) every expected 404
`src/hooks.server.ts:45-61`. SvelteKit invokes `handleError` for unmatched routes (status 404, "Not Found"). Every crawler probe / stale link becomes a structured `error` line and, once a DSN is set, a `captureException` — noise now, Sentry quota burn later, and real errors drown. **Fix:** early-return `{ message, errorId }` without logging when `status === 404` (or downgrade 4xx to `logger.info`).

### L2 — `logger.emit` can itself throw inside the error path
`src/lib/server/logger.ts:46` — `JSON.stringify(line)` throws on circular context or `BigInt` values; `serialize()` only special-cases `Error` instances. A circular object thrown by a dependency reaches `handleError → logger.error → emit` and the stringify throw masks the original error. **Fix:** wrap the stringify in try/catch with a `String(value)` fallback (or a safe-stringify with a seen-set).

### L3 — Rate-limit coverage is asymmetric: web form actions for the same UGC are unlimited
`community/[category]/[topic]/+page.server.ts:59` (`createReply`) and `community/[category]/new/+page.server.ts` (`createTopic` action) have no `rateLimit` call — only the `/api/v1` twins do (`forum/topics/+server.ts:11`, `replies/+server.ts:41`, `comments/+server.ts:11`). A spammer with a session posts through the web action at full speed. Summits/reviews/image-upload endpoints are also uncovered (image upload is the most expensive uncovered write). **Fix:** add the same `ugc` check to both form actions; key on `user.id` instead of IP where auth exists (also sidesteps H1 for these paths).

### L4 — user-signup webhook: `Promise.allSettled` results are never inspected
`src/routes/api/webhooks/user-signup/+server.ts:55-63`. `allSettled` never rejects, so the `catch` at `:64` only covers `getUserById`. A Sparrow outage silently kills welcome emails + newsletter subscribes with zero log lines — the exact silent-failure pattern Session 2 was eliminating. **Fix:** iterate the settled results and `logger.error` each rejection with `{ userId, which: 'subscribe'|'welcomeEmail' }`.

### L5 — Weather GET handler: secret in query string + fragile synthetic event
`src/routes/api/webhooks/weather/+server.ts:224-237`. (a) `?secret=` lands in Railway access logs / any intermediary — pre-existing, but this session touched the auth path and kept it. (b) `POST({ request, url } as Parameters<RequestHandler>[0])` omits `getClientAddress`; today `clientKey`'s try/catch (`rateLimit.ts:98-102`) rescues it into the shared `'unknown'` bucket (and double-counts the run), but any future use of the event object in POST breaks at runtime with no type error. **Fix:** extract the pipeline body into a shared function both handlers call; retire the query-param GET once the cron uses the header.

### L6 — PII/log-hygiene nits
`contact/+page.server.ts:59` logs the submitter's `email` at error level (PII in Railway logs, will be Sentry `extra` later). `logger.ts:75-78`: when a DSN is set, `logger.error` double-emits (error line + stub warn line with the same error) — intended for staging verification, but remember to remove with the SDK. **Fix:** log a hash/prefix of the email; keep the stub's double-emit on a `debug` level.

---

## Info / verified-sound

- **`security.ts` — sound.** `src/lib/server/security.ts:17-27`: non-string inputs → `false` (no throw on null/undefined); UTF-8 `Buffer.from` is correct for these ASCII secrets; the length pre-check prevents `timingSafeEqual`'s unequal-length throw and leaks only *length*, which is acceptable for fixed-length high-entropy secrets (and correctly documented at `:14-15`). `safeBearerEqual` (`:33-39`) rejects empty expected secrets, so `safeSecretEqual('','') === true` is unreachable via callers (weather guards `!webhookSecret` at `weather/+server.ts:98,227`). One residual: it compares the whole `Bearer <secret>` string, so a mismatched prefix (`bearer`, `Token`) fails — matches previous behavior; if RC's dashboard header is configured without the `Bearer ` prefix, every legit event 401s. Verify the dashboard value on deploy.
- **rateLimit window mechanics correct** for single-threaded Node: no await between read/mutate (`rateLimit.ts:64-85`), denied hits don't extend `resetAt`, sweep math is right. Fixed-window admits a 2× boundary burst (10 at :59 + 10 at :01) — fine at these stakes. Per-instance reset-on-deploy is documented honestly (`:6-9`).
- **RevenueCat email placement is right:** Pro email fires only on successful write, fire-and-forget with its own error log (`revenuecat/+server.ts:82-86`). Duplicate emails are possible when a retry follows a committed-but-unacked write — acceptable; dedupe only if it shows up.
- **`handleError` response shape is safe:** internal message suppressed for 5xx, `errorId` correlates user report ↔ log line (`hooks.server.ts:57-60`), `App.Error` typed (`app.d.ts`). Good pattern.
- **Adjacent (pre-existing, out of scope):** `contactHtml` escapes only `message` — `subject`/`name` are interpolated raw into the internal email (`contact/+page.server.ts:79,86,90`), an HTML-injection vector into hello@saltgoat.co's inbox. One-line fix: run all four fields through the same escape.

## Recommended execution order

1. **H1** — key limiter on trusted hop (`ADDRESS_HEADER`/`XFF_DEPTH` + `getClientAddress()`), and stop pre-auth-limiting the secret-guarded webhooks. (S)
2. **H2** — upsert-or-verify-rowcount in all four RC update branches. (S)
3. **M1** — UUID-validate `app_user_id`, 200-skip otherwise. (XS)
4. **M3** — regenerate shared types, then remove `db()` cast + type the service client. (M — fallout fixing)
5. **M2** — `last_event_at` guard column. (S, needs migration)
6. L1–L6 batched as one hygiene pass. (S)

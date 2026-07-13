# B — Backend / Infra / Code Quality Audit

**Auditor:** Fable (Domain B) · **Date:** 2026-07-13 · **Scope:** web app only (`src/`, `supabase/migrations/`, deploy config)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| P0 (launch-blocker) | 1 |
| P1 (pre-scale) | 4 |
| P2 (should-do) | 8 |
| P3 (future) | 3 |
| **Total** | **16** |

**Domain health verdict: MODERATELY HEALTHY — good architecture, blind in production.**

The server-module architecture is genuinely good: consistent `SupabaseClient<Database>`-first signatures, disciplined batch-fetching (no classic per-row N+1 anywhere), cursor-based forum pagination, and a well-designed weather pipeline with rate limiting and fallbacks. The real problems are: (1) a webhook secret committed to git inside three migration files — the one P0; (2) total production blindness (no error monitoring, no `handleError` hook, 69 raw `console.*` calls in server code as the only telemetry); (3) a payment webhook that silently ignores DB failures and returns 200; and (4) a family of "fetch the whole table, aggregate in JS" patterns (leaderboard, suggestions, feeds) that are fine at 0 users and become a problem at ~1k+ active users. Pre-launch is also the one free window to delete the legacy `peak_conditions` dual-write — the documented deprecation plan assumes deployed mobile clients that don't exist yet.

---

## Findings (severity-ordered)

### Finding B1: Webhook secret hardcoded in three committed migrations
- **Severity:** P0
- **Category:** security (cross-cutting with Domain A — flagging because it lives in migration hygiene territory)
- **Evidence:** `supabase/migrations/20260420000000_user_signup_webhook.sql:19`, `20260420000002_fix_signup_webhook_trigger.sql` (headers line), `20260421000000_fix_signup_search_path.sql:53` — all three embed `Authorization: Bearer 7755…0e21` (a 48-hex-char secret) plus the hardcoded production URL `https://saltgoat.co/api/webhooks/user-signup` inside `notify_user_signup()`.
- **Impact:** The `SUPABASE_WEBHOOK_SECRET` that authenticates `POST /api/webhooks/user-signup` (`src/routes/api/webhooks/user-signup/+server.ts:22`) is in git history permanently and readable by anyone with repo access or `pg_catalog` read on the DB function source. Anyone holding it can forge signup events → send arbitrary "welcome" emails via Sparrow and subscribe arbitrary addresses to the newsletter. Bonus defect: any staging/dev database created from these migrations will fire signup webhooks at **production** saltgoat.co.
- **Recommendation:** Rotate the secret now (it's burned regardless). Move secret + URL out of the function body into Supabase Vault (`vault.decrypted_secrets`) or per-environment DB settings (`current_setting('app.settings.webhook_secret')`), and ship a new migration that recreates `notify_user_signup()` reading from there. Alternatively drop the pg_net trigger entirely and use the Supabase Dashboard Database-Webhook (already documented in CLAUDE.md as the intended config), which keeps the secret out of SQL.
- **Effort:** S
- **Suggested executor:** Sonnet

### Finding B2: RevenueCat webhook ignores every DB error — paid users can silently not get Pro
- **Severity:** P1 (becomes P0 the day payments go live)
- **Category:** correctness
- **Evidence:** `src/routes/api/webhooks/revenuecat/+server.ts:53-118` — all five `await supabase.from('user_subscriptions').upsert/update(...)` calls discard the result; no `error` check on any of them. The handler then unconditionally returns `json({ received: true })` (line 121) with HTTP 200.
- **Impact:** If the upsert fails (RLS, constraint, transient outage, type drift), a customer who just paid gets no Pro entitlement, RevenueCat sees 200 so it **never retries**, and nothing is logged — with no error monitoring (B3) there is zero trace. Same for RENEWAL/EXPIRATION: entitlement state silently drifts from billing state.
- **Recommendation:** Check `error` on every write; on failure, log with context and return 500 so RevenueCat retries (it retries non-2xx for up to 24h). Also handle unknown `event.type` with a log line rather than silence.
- **Effort:** S
- **Suggested executor:** Sonnet

### Finding B3: Zero observability — no error monitor, no handleError hook, console.* is the only telemetry
- **Severity:** P1
- **Category:** quality (observability)
- **Evidence:**
  - No Sentry/monitoring dependency in `package.json` (grep for `sentry` = 0 hits).
  - `src/hooks.server.ts` (36 LOC) defines only `handle` — **no `handleError`** hook, so every unhandled server exception becomes SvelteKit's default behavior (opaque 500 + stderr line) with no aggregation, no stack capture, no alerting.
  - 100 `console.*` calls in `src/`, 69 of them in `src/lib/server/` + `src/routes/api/` — no structured logger, no request IDs, no log levels.
  - The weather pipeline's only health signal is `console.log` inside the webhook (`src/routes/api/webhooks/weather/+server.ts:135,170`).
- **Impact:** Quantified blindness: (1) a failed deploy or crashed route surfaces only if a human happens to browse the site; (2) the conditions.ts deprecation plan (step 2: "track request volume to /conditions via Railway logs") is **unexecutable** — nothing logs per-endpoint request volume; (3) payment failures (B2), achievement-award failures, and email failures all die in unaggregated stdout that Railway rotates away. For a solo operator, this is the difference between fixing a launch-day bug in 10 minutes vs. discovering it from a user complaint days later.
- **Recommendation:** Minimal concrete setup (≈half a day): (1) add `@sentry/sveltekit` — its wizard wires `handleError` on both server and client, captures load/action/endpoint exceptions, free tier is ample pre-launch; (2) add a `handleError` hook that tags URL, route ID, and user ID; (3) add a tiny `src/lib/server/log.ts` (pino or even a 20-line JSON-line wrapper) and mechanically replace the 69 server `console.*` calls; (4) log one structured line per weather-webhook run (success/error counts already computed at `weather/+server.ts:170`) so cron health is grep-able.
- **Effort:** M
- **Suggested executor:** Sonnet

### Finding B4: Full-table-scan aggregation in leaderboard and follow suggestions
- **Severity:** P1
- **Category:** perf
- **Evidence:**
  - `src/lib/server/leaderboard.ts:28-35` — `getLeaderboard()` selects **every row of `user_summits`** (with a `routes` join), plus **every row of `profiles`** (line 43-45), plus all pro subscriptions (line 59-63), then aggregates ranks in JS. 3 queries/request, two unbounded.
  - `src/lib/server/follows.ts:169-176` — `getSuggestedUsers()` selects **every `user_summits` row of every other user** (with a `profiles` join) to compute peak overlap in JS. Called on every profile "buddies" tab load (`src/routes/profile/+page.server.ts:144`).
- **Impact:** At 1,000 users × 20 summits this is a 20k-row transfer with joins on every `/leaderboard` view and every buddies-tab load — Supabase will also cap responses (default max rows 1,000), meaning **the leaderboard silently becomes wrong** before it becomes slow. No caching layer exists.
- **Recommendation:** Move both to SQL: a `leaderboard` view / RPC (`GROUP BY user_id` with `count(distinct peak_id)`, window-function rank) and an overlap RPC for suggestions. Both are single-query, index-friendly, and immune to the row cap. Add `setHeaders({ 'cache-control': ... })` or an in-memory TTL for the leaderboard page.
- **Effort:** M
- **Suggested executor:** Opus

### Finding B5: Achievement check runs 6–7 sequential queries synchronously on every summit/review/trail-report
- **Severity:** P1
- **Category:** perf
- **Evidence:** `src/lib/server/achievements.ts:54-153` — `getAchievementStats()` awaits **5 queries sequentially** (user summits with joins :59, all peaks :71, all standard routes :73, review count :79, trail-report count :85 — none parallelized). `checkAndAwardAchievements()` (:157) adds a 6th (earned achievements :166) plus an insert. Called synchronously before responding in `src/routes/api/v1/summits/+server.ts:67`, and equivalently in the reviews and trail-reports endpoints and web form actions. Total for `POST /api/v1/summits`: requireAuth (1) + canLogSummit (2, `subscriptions.ts:53,61`) + insert (1) + achievements (6–7) ≈ **10–11 sequential DB round trips per summit log**.
- **Impact:** At 20–50 ms per Railway→Supabase round trip, achievements alone add ~150–400 ms to the hottest write path in the product; the whole request sits at ~300–600 ms server time. It also *must* stay on the request path (the response contract returns `newAchievements` for the celebration UI), so the fix is parallelization, not backgrounding.
- **Recommendation:** (1) `Promise.all` the 5 stats queries + the earned-set query → 6–7 trips become 2 waves (~60–70% latency cut for the achievement phase, effort: trivial). (2) Skip queries irrelevant to the trigger (review/trail-report triggers don't need peaks/routes/summits). (3) Longer-term, a single RPC returning all stats in one trip.
- **Effort:** S
- **Suggested executor:** Sonnet

### Finding B6: Free-tier summit limit is check-then-insert (TOCTOU) — bypassable and unenforced at the DB
- **Severity:** P1
- **Category:** correctness (overlaps Domain A)
- **Evidence:** `src/routes/api/v1/summits/+server.ts:46-55` — `canLogSummit()` (a `count` query, `subscriptions.ts:61-64`) and `createSummit()` (insert) are two separate, non-atomic operations. No DB constraint or trigger enforces the 5-summit free cap.
- **Impact:** N parallel requests all pass the pre-check and all insert — a free user scripts unlimited summits, undermining the sole free→Pro conversion lever. Pre-launch severity is about monetization integrity, not data corruption.
- **Recommendation:** Enforce in the DB: a BEFORE INSERT trigger on `user_summits` that counts existing rows for non-pro users (cheap at a 5-row cap), or route inserts through an RPC that locks + checks + inserts. Keep the API pre-check for UX only.
- **Effort:** M
- **Suggested executor:** Sonnet

### Finding B7: Legacy `peak_conditions` dual-write — pre-launch is the free removal window, and the plan's gating metric can't be measured
- **Severity:** P2
- **Category:** scope / quality
- **Evidence:** `src/lib/server/conditions.ts:53-74` documents a careful 5-step deprecation gated on "<10% of mobile clients on v1.x, measured via Railway logs". The dual-write executes at `src/routes/api/webhooks/weather/+server.ts:55-61` (plus a v1 fallback fetch at :66-74). Legacy readers: `/api/v1/peaks/[slug]/conditions` and the `conditions` field of `/api/v1/peaks/[slug]` (`+server.ts:33`).
- **Impact:** Two contradictions: (1) the gating metric (per-endpoint request volume) is unmeasurable — nothing logs it (see B3); (2) the plan protects "old mobile clients in the wild," but the app is **pre-launch with no users** — there are no clients in the wild. Every day the legacy path survives past launch, real clients accrue and the documented multi-month deprecation becomes genuinely necessary. The dual-write itself is well-built and safe today (summit-band down-conversion via `periodsToLegacyForecast`, conditions.ts:521); the cost is 698-LOC module complexity, an extra 58 upserts/run, and a second table to keep coherent.
- **Recommendation:** Decide **before launch**: if the mobile app hasn't shipped to any store, jump straight to step 4 — point the aggregated peak endpoint and `/conditions` at a `peak_forecasts`-derived response (the down-conversion function already exists), delete the legacy write, drop the table. If a TestFlight/beta cohort already exists, ship the forecast-based endpoint now and force-update. Either way, add the endpoint-volume log line (B3) so the metric exists.
- **Effort:** M
- **Suggested executor:** Opus

### Finding B8: Systematic error-swallowing — failures return empty data or null with no signal
- **Severity:** P2
- **Category:** quality
- **Evidence (representative, not exhaustive):**
  - `src/lib/server/comments.ts:42` — `createComment` returns `null` on error with **no logging at all**; callers (`profile/+page.server.ts:427`) don't check, so a failed comment reports `{ success: true }` to the user.
  - `src/lib/server/comments.ts:62` — `deleteComment` ignores the error entirely (fire-and-forget delete).
  - `src/lib/server/forum/topics.ts:38,64,75,93` — `const { data } = await query` discards `error`; a failed query renders an empty category page indistinguishable from a genuinely empty one.
  - `src/lib/server/leaderboard.ts:37-40`, `follows.ts:60-63`, `images.ts:32-35`, `conditions.ts:677-680` — catch → `console.error` → return `[]`/`null` (silent-degrade pattern; tolerable only once B3 exists).
  - `src/lib/server/achievements.ts:193-196` — a failed award insert logs and returns `[]`; user never sees the earned achievement toast (self-healing on the next trigger, but silent).
  - 14 bare `catch {}` blocks across server/API code (grep `catch {`), most legitimately optional (auth-optional endpoints), but `contact/+page.server.ts:46` and `subscribe/+server.ts:9,23` swallow email-delivery failures.
- **Impact:** Combined with B3, failures are not just unmonitored — they're actively converted into fake success/empty states. Debugging "my comment disappeared" is impossible.
- **Recommendation:** Sweep pass: every discarded `error` either throws (mutations) or logs-with-context and degrades (reads). Make `createComment`/`deleteComment` throw and let form actions `fail(500)`. Cheap, mechanical, high forensic value.
- **Effort:** M
- **Suggested executor:** Haiku (mechanical sweep) with Sonnet review

### Finding B9: Activity feeds fetch unbounded row sets and trim in JS
- **Severity:** P2
- **Category:** perf
- **Evidence:** `src/lib/server/activity.ts:75-120` — `getUserActivityFeed` runs 4 parallel queries with **no `.limit()`** (all summits, all reviews, all reports, all achievements for the user), then sorts and `slice(0, limit)` in JS (:190-193). `getFollowingActivityFeed` (:228-280) is 30-day-bounded but also un-limited per source; it runs 6 queries + 2 social batch queries = **8 queries per `GET /api/v1/activity?feed=following`**. The home page (`src/routes/+page.server.ts`) runs the following-feed on every logged-in visit.
- **Impact:** Bounded by per-user data volume today; a power user with 500 summits ships 500 joined rows to render 50. The 8-query fan-out is fine (batched, no N+1) — the missing per-source `.limit(limit)` is the gap.
- **Recommendation:** Add `.limit(limit)` to each source query (correct because each is already sorted desc — the merged top-N can only come from each source's top-N). One-line-per-query fix.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding B10: Profile page load is a ~10-query waterfall with duplicate full-summit fetches
- **Severity:** P2
- **Category:** perf
- **Evidence:** `src/routes/profile/+page.server.ts:29-150` — sequential awaits: profile (:29), favorite peak (:38), peaks-for-selector (:47), `getUserSummitStats` (:53 — internally fetches **all** summits with joins, `summits.ts:322`), allPeaks (:56), user_summits **again** (:62), routes (:86), achievements (:97), markNotified (:100), then tab data; overview+Pro adds `getAdvancedStats` (:123) which **re-fetches all summits with joins a second time** (`summits.ts:217`). Similarly `/api/v1/profile/+server.ts:25-26` calls `getUserSummitStats` and `getUserSummits` in the same `Promise.all` — two full summit fetches per request.
- **Impact:** ~10 mostly-sequential round trips ≈ 300–500 ms server time on the most-visited authenticated page; 2–3× redundant transfer of the same summit rows.
- **Recommendation:** Fetch summits-with-stats once and pass into both stat computations (both are pure aggregation over the same array); `Promise.all` the independent loads. No schema change needed.
- **Effort:** S
- **Suggested executor:** Sonnet

### Finding B11: Type-drift in `database.ts` forces untyped Supabase clients in 3+ server modules
- **Severity:** P2
- **Category:** quality (backend impact of Domain C's root cause)
- **Evidence:** `src/lib/server/reactions.ts:11-13`, `src/lib/server/comments.ts:23-25`, `src/lib/server/forum/utils.ts:4-6` — identical `db()` helpers casting `as unknown as SupabaseClient` because `summit_reactions`, `summit_comments`, and forum tables are missing from generated types. All forum modules route through `forum/utils.ts:db()`, so the **entire forum server layer plus reactions/comments runs untyped** — column typos and shape mismatches compile clean. Also `activity.ts:284-332` falls back to `(s: any)` row types.
- **Impact:** The strongest correctness tool in a no-test codebase (the type checker) is disabled exactly where the newest, least-battle-tested code lives.
- **Recommendation:** After Domain C regenerates types (`supabase gen types … > src/lib/types/database.ts` + shared-package sync), delete all three `db()` helpers and the `as any` casts, then `npm run check` to catch what was hiding.
- **Effort:** S (after the regen lands)
- **Suggested executor:** Haiku

### Finding B12: Non-atomic read-modify-write on image flag_count (+ minor write races)
- **Severity:** P2
- **Category:** correctness
- **Evidence:** `src/lib/server/images.ts:210-228` — `flagImage` reads `flag_count`, increments in JS, writes back; concurrent flags lose increments, so the auto-flag-at-3 moderation threshold (:221) can be evaded by lost updates. Same pattern class: `uploadPeakImage` display_order max+1 (:93-100) and `reorderImages` firing N parallel single-row updates (:173-181).
- **Impact:** Moderation threshold unreliability is the only one with teeth; the others are cosmetic ordering glitches.
- **Recommendation:** One RPC or `update ... set flag_count = flag_count + 1 returning flag_count` for the increment (or a trigger on `content_flags` insert that recounts). Low urgency pre-launch, cheap to fix.
- **Effort:** S
- **Suggested executor:** Sonnet

### Finding B13: Deploy config gaps — heavy healthcheck path, no /health endpoint, capped restarts
- **Severity:** P2
- **Category:** infra
- **Evidence:** `railway.toml:6-9` — `healthcheckPath = "/"` hits the home page, whose load (`src/routes/+page.server.ts:16-21`) runs 4+ Supabase queries including a `getFollowingActivityFeed` branch; `restartPolicyMaxRetries = 3` with `on_failure`. No dedicated health route exists (no `src/routes/health*`). `svelte.config.js` and `vite.config.ts` are otherwise sound (adapter-node + `precompress: true`; PWA `navigateFallback: null` correctly set after the recent SW fix; `CacheFirst` on Supabase storage is appropriate for content-hashed uploads).
- **Impact:** (1) A Supabase blip during deploy fails the healthcheck and can roll back a good deploy; the check also costs 4 DB queries per probe. (2) After 3 crash-restarts the app **stays down** until manual intervention — with no monitoring (B3), indefinitely.
- **Recommendation:** Add `src/routes/health/+server.ts` returning 200 with no DB dependency (optionally a `?deep=1` variant that pings Supabase), point `healthcheckPath` at it, and raise `restartPolicyMaxRetries` (or switch to `always`).
- **Effort:** S
- **Suggested executor:** Haiku

### Finding B14: Weather webhook GET variant puts the secret in the URL
- **Severity:** P3
- **Category:** security-hygiene (overlap with Domain A)
- **Evidence:** `src/routes/api/webhooks/weather/+server.ts:204-218` — `GET` accepts `?secret=<WEBHOOK_SECRET>` "for manual testing" and forwards to POST.
- **Impact:** Secrets in query strings persist in Railway request logs, proxies, and browser history. Also both GET and POST compare secrets with `!==` (non-constant-time) — cosmetic at this threat level but free to fix.
- **Recommendation:** Delete the GET handler (curl -X POST with a header is just as easy) or gate it to dev. The pipeline design itself is healthy — see verdict notes.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding B15: `generateUniqueSlug` — unbounded loop, query-per-suffix, race on insert
- **Severity:** P3
- **Category:** correctness
- **Evidence:** `src/lib/server/forum/utils.ts:21-43` — `while (true)` issuing one SELECT per candidate suffix; a discarded query `error` makes `data` null and returns a possibly-duplicate slug; two concurrent same-title posts race between check and insert.
- **Impact:** Worst case is a unique-violation on insert surfaced as a 500 — rare and low-stakes. The loop is only unbounded in adversarial duplicate-title scenarios.
- **Recommendation:** Single query for `slug LIKE base || '%'` then compute the suffix in JS; or append a short random suffix on collision; cap iterations.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding B16: Migration hygiene — sound ordering, but implicit extension dependency and env-coupled data
- **Severity:** P3
- **Category:** quality
- **Evidence:** 62 migrations reviewed by inventory + destructive-statement scan. Ordering is monotonic (the `00001_` prefix sorts before all timestamps; the 2024→2025→2026 timestamp jumps are cosmetic). Destructive statements are all guarded (`DROP POLICY IF EXISTS` only — `public_profiles.sql:11`, `ugc_photo_moderation.sql:12-15`, `ugc_storage_policies.sql:4,15`; the one `DELETE FROM` at `route_traces.sql:72` is inside a trigger function, not migration-time). Remaining issues: (1) **no `CREATE EXTENSION IF NOT EXISTS pg_net`** anywhere, yet `net.http_post` is called in 3 migrations — a fresh `supabase db push` to a project without pg_net enabled yields a signup trigger that silently no-ops (exception-swallowed per `20260420000002`); (2) ~15 data/content migrations (peak seeds, hero-image URL updates) are environment-coupled but acceptable for a single-prod setup; (3) the hardcoded secret (B1).
- **Impact:** Fresh-environment reproducibility gap: signups on a new environment silently skip welcome emails; no error surfaces (by design of the exception wrapper).
- **Recommendation:** Add a migration with `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;` (or document the dashboard toggle in `docs/ben.md`). Resolve B1 in the same pass.
- **Effort:** S
- **Suggested executor:** Haiku

---

## Answers to the key questions

**N+1 in feed/leaderboard/follows/forum?** No classic per-row N+1 exists — batching discipline is genuinely good (`getReactionsForSummits`/`getCommentsForSummits` batch by ID set; `enrichWithAuthors` batches profiles + summit counts in 2 queries). The real pattern is **unbounded full-set fetches aggregated in JS**: leaderboard = 3 queries but 2 full-table (B4); suggestions = full `user_summits` scan (B4); activity feeds = 4–6 un-limited source queries per request (B9). Queries per request: `GET /api/v1/activity?feed=following` = 8; `/leaderboard` = 3 (two unbounded); forum category page = 4; `POST /api/v1/summits` = 10–11.

**Achievements synchronous?** Yes — 6–7 sequential queries inside the request, ~150–400 ms added to every summit/review/trail-report write (B5). Must stay on-path (response includes `newAchievements`) but parallelizes to 2 waves trivially.

**Error handling?** The single worst spot is the RevenueCat webhook (B2). Below that, a systematic silent-degrade pattern (B8): mutations that report success on failure (`createComment`, `deleteComment`), reads that return empty on error (leaderboard, forum lists, images, forecasts), 14 bare `catch {}` blocks. External calls (Open-Meteo, Sparrow) are mostly well-wrapped — the weather pipeline has real fallback logic, and Sparrow failures in the signup webhook use `Promise.allSettled` correctly.

**Legacy dual-write safe to remove?** Technically gated on mobile clients that, pre-launch, don't exist — so yes, and now is the cheapest moment (B7). The documented blocker (traffic measurement) is itself blocked on B3.

**Migration hygiene?** Structurally sound (monotonic order, guarded drops, no unguarded destructive statements). Two real issues: committed secret (B1/P0) and the implicit pg_net dependency (B16).

**Observability?** None — no monitor, no `handleError`, 69 server `console.*` calls as sole telemetry. Concrete minimal fix in B3 (~half a day).

**Deploy config?** `svelte.config.js`/`vite.config.ts` healthy; `railway.toml` needs a cheap health endpoint and a restart-policy rethink (B13).

## Healthy areas (called out honestly)

- **Module architecture:** the `SupabaseClient<Database>`-first convention is applied consistently across all 24 modules; web actions and API endpoints genuinely share one code path.
- **Batching:** reactions, comments, forum author enrichment, and image uploader lookups all batch correctly — zero per-row query loops found.
- **Weather pipeline design:** concurrency-limited (2 peaks), inter-batch pauses, per-peak error isolation, v1 fallback on v2 failure, stale-row cleanup, meaningful success/error accounting in the response (`weather/+server.ts` throughout). Best-engineered subsystem in the backend.
- **Aggregated peak-detail endpoint:** fully parallelized public + auth queries (`api/v1/peaks/[slug]/+server.ts:29-38,62-66`).
- **Forum pagination:** proper cursor-based (`lt('last_reply_at', cursor)`, limit+1 hasMore) — no offset pagination anywhere.
- **`imageOptimizer.ts`:** graceful sharp-unavailable fallback with a documented Vite workaround.
- **`sparrow.ts`:** small, throws on failure, thoughtful 422-suppression handling.
- **Storage rollback:** `uploadPeakImage` deletes the uploaded object if the DB insert fails (`images.ts:117`).

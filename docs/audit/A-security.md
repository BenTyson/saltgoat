# A — Security & Data Integrity Audit

**Auditor:** Fable (Domain A) · **Date:** 2026-07-13 · **Scope:** WEB APP ONLY (mobile/ excluded)
**Context:** Pre-launch, no live users. Owner optimizing for "do it right."

---

## Executive Summary

**Overall domain health: MODERATE — solid foundation, three secret/auth issues to fix before launch.**

The core authorization model is sound: every `/api/v1` mutation derives `user_id` from the
authenticated token (never from the request body), and the database enforces per-row ownership via
RLS. I could not find an IDOR: the `[id]` endpoints that omit an explicit `user_id` filter are still
protected because they use the token-scoped Supabase client and RLS blocks cross-user writes. The
service-role key is correctly confined to server-only webhook/contact paths via `$env/dynamic/private`
and is never reachable from a client bundle. No `.env` is committed and env files are gitignored.

The real weaknesses are (1) the entire SSR/admin auth surface trusts `getSession()` — the pattern
Supabase explicitly warns against — with a hardcoded admin UUID as a known target; (2) a live
webhook bearer secret is committed to three migration files in git; (3) the RevenueCat entitlement
webhook is protected by a placeholder secret compared non-constant-time, and there is no rate limiting
anywhere.

**Findings by severity:** P0: 0 · P1: 4 · P2: 4 · P3: 2

| # | Severity | Title |
|---|----------|-------|
| A1 | P1 | Admin + all SSR auth trust `getSession()` (unverified) instead of `getUser()` |
| A2 | P1 | Live webhook bearer secret hardcoded in committed migration files |
| A3 | P1 | RevenueCat entitlement webhook: placeholder secret → free Pro grants for anyone |
| A4 | P1 | No rate limiting on any endpoint (email-bomb, spam, secret brute-force) |
| A5 | P2 | Two SECURITY DEFINER functions still not `search_path`-pinned |
| A6 | P2 | Webhook secret comparisons are not constant-time |
| A7 | P2 | Weather webhook accepts secret via URL query string (GET) |
| A8 | P2 | Public REST API is fully open CORS (`*`) with no abuse controls |
| A9 | P3 | `user_summits` UPDATE policy has no `WITH CHECK` clause |
| A10 | P3 | Generic 500s swallow RLS-denial vs. real errors (defense-in-depth / observability) |

---

## Findings

### Finding A1: Admin and all SSR auth rely on `getSession()` instead of `getUser()`
- **Severity:** P1 (treat as P0 if session-cookie forgery is confirmed in this `@supabase/ssr` version)
- **Category:** security
- **Evidence:**
  - `src/routes/admin/+layout.server.ts:7-9` — admin guard: `const { data: { session } } = await supabase.auth.getSession(); assertAdmin(session);`
  - `src/lib/server/admin.ts:5-15` — `assertAdmin` compares `session.user.id` to a **hardcoded** `ADMIN_USER_ID = 'c983d602-d0e0-4da6-be9d-f91a456bfdb0'` (this UUID is committed in source, so the target identity is public).
  - `getSession()` is used across ~30 SSR loads and form actions (grep: `+page.server.ts` in admin/, profile/, community/, peaks/, checkout, export, portal).
  - The auth-required `/api/v1` endpoints correctly use `getUser()` (via `requireAuth`), so the pattern is inconsistent — the mobile API is safe, the web SSR surface is not.
- **Impact:** Supabase's own guidance: *never trust `getSession()` in server code — it does not revalidate the JWT.* `getSession()` returns the session decoded from the cookie without contacting the auth server or verifying the signature. Because the admin UUID is known, an attacker who can place a crafted `sb-*-auth-token` cookie with `sub` = the admin UUID may pass `assertAdmin` and reach the admin dashboard (all-user PII, moderation, content deletion). Every mutating form action shares the same weak boundary.
- **Recommendation:** Replace `getSession()` with `getUser()` for all authorization decisions, starting with `admin/+layout.server.ts`. Best practice: do the `getUser()` validation once in `hooks.server.ts` and stash the verified user in `event.locals`, then have loads/actions read `locals.user`. Keep admin identity check as-is but feed it a verified user id.
- **Effort:** M
- **Suggested executor:** Sonnet

### Finding A2: Live webhook bearer secret hardcoded in committed migration files
- **Severity:** P1
- **Category:** security
- **Evidence:** The `SUPABASE_WEBHOOK_SECRET` value `7755037c...ac0e21` is embedded in the `notify_user_signup()` trigger in three committed files:
  - `supabase/migrations/20260420000000_user_signup_webhook.sql:19`
  - `supabase/migrations/20260420000002_fix_signup_webhook_trigger.sql:19`
  - `supabase/migrations/20260421000000_fix_signup_search_path.sql:53`
  - This is the exact `Bearer` token that `src/routes/api/webhooks/user-signup/+server.ts:22` checks against `env.SUPABASE_WEBHOOK_SECRET`.
- **Impact:** Anyone with repo read access (or anyone who obtains the git history) holds the credential that authorizes the signup webhook. An attacker can POST forged `INSERT` payloads to `/api/webhooks/user-signup` to trigger welcome emails and subscribe arbitrary email addresses to the newsletter (Listmonk) — reputational/deliverability abuse. The secret also cannot be rotated cleanly because it is baked into a DB trigger; rotation requires a new migration plus an env change kept in lockstep.
- **Recommendation:** Rotate the secret. Store it in Postgres via `vault` or a DB setting and reference it in the trigger (e.g. `current_setting('app.signup_webhook_secret')`) rather than a literal, so the value lives outside source control. At minimum, scrub the literal from new migrations and treat the current value as burned. Purge from history is nice-to-have but the rotation is the real fix.
- **Effort:** M
- **Suggested executor:** Sonnet

### Finding A3: RevenueCat entitlement webhook protected by a placeholder secret
- **Severity:** P1
- **Category:** security
- **Evidence:** `src/routes/api/webhooks/revenuecat/+server.ts:27-35` gates on `authHeader !== 'Bearer ' + env.REVENUECAT_WEBHOOK_SECRET`. Per the hub's verified config facts, `REVENUECAT_WEBHOOK_SECRET` in Railway is a **placeholder/dummy** value. On `INITIAL_PURCHASE` the handler upserts `user_subscriptions` to `plan='pro', status='active'` for the `app_user_id` in the request body (lines 48-65).
- **Impact:** The `app_user_id` is fully attacker-controlled. If the protecting secret is a guessable placeholder, anyone can POST a forged `INITIAL_PURCHASE` and grant Pro to any user id (including their own) — bypassing the entire paywall. Pro unlocks the weather feature and unlimited summit logging on the web app, so this is a web revenue-integrity hole, not just a mobile concern. (A placeholder also breaks legitimate webhooks, so it must be set correctly regardless.)
- **Recommendation:** Set a strong, random `REVENUECAT_WEBHOOK_SECRET` in Railway that matches the RevenueCat dashboard Authorization header before launch. Ideally also verify RevenueCat's signature if available. Do not ship with a placeholder.
- **Effort:** S
- **Suggested executor:** Ben (config) / Haiku (verify)

### Finding A4: No rate limiting on any endpoint
- **Severity:** P1
- **Category:** security
- **Evidence:** Confirmed no rate-limit middleware in `hooks.server.ts` (only CORS + security headers) and none in any endpoint. Documented in CLAUDE.md "Known Issues." High-value abuse surfaces:
  - `src/routes/contact/+page.server.ts` — sends email to `hello@saltgoat.co` and inserts a row per submit (honeypot only; no throttle) → email-bomb.
  - `/api/webhooks/user-signup`, `/api/webhooks/revenuecat`, `/api/webhooks/weather` — unauthenticated attackers can hammer the secret check (see A6, brute-forceable without lockout).
  - `/api/v1/peaks/[slug]/images` — 10MB uploads, authenticated but unthrottled → storage cost / abuse.
  - `/api/v1/comments`, `.../reviews`, `.../forum/topics`, `.../summits` — content spam.
- **Impact:** Denial-of-wallet (Open-Meteo calls, Supabase storage, email quota), spam flooding, and unbounded brute-force attempts against webhook secrets. Combined with A3/A6 this is what makes a placeholder/weak secret practically attackable.
- **Recommendation:** Add lightweight rate limiting — per-IP for public/webhook routes (e.g. a Railway/edge limiter or an in-memory/Upstash token bucket in `hooks.server.ts`), and per-user for authed mutations. Prioritize the contact form and the three custom webhooks.
- **Effort:** M
- **Suggested executor:** Sonnet

### Finding A5: Two SECURITY DEFINER functions not `search_path`-pinned
- **Severity:** P2
- **Category:** security
- **Evidence:** The 2026-04-21 fix (`20260421000000_fix_signup_search_path.sql`) correctly pinned the three signup-path functions (`handle_new_user`, `create_default_subscription`, `notify_user_signup`) with `SET search_path = ...`. But two other `SECURITY DEFINER` functions remain **unpinned**:
  - `toggle_trace_vote(p_trace_id, p_user_id)` — `supabase/migrations/20250313100000_route_traces.sql:58-61` (`SECURITY DEFINER`, no `SET search_path`).
  - the forum search function — `supabase/migrations/20260403000000_community_forum.sql:440` (`... STABLE SECURITY DEFINER`, no `SET search_path`).
- **Impact:** This is the Supabase `function_search_path_mutable` lint. A definer function with a mutable `search_path` can be hijacked if an attacker can create a same-named object in a schema that resolves earlier than `public`, running attacker code with the definer's (elevated) privileges. Exploitation requires object-creation rights, so real-world risk is bounded — but it is a genuine privilege-escalation footgun and inconsistent with the fix already applied to the signup functions.
- **Recommendation:** Add `SET search_path = public, pg_temp` (add `extensions` if needed) to both functions in a new migration, matching the pattern in `20260421000000`.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding A6: Webhook secret comparisons are not constant-time
- **Severity:** P2
- **Category:** security
- **Evidence:**
  - `src/routes/api/webhooks/weather/+server.ts:89` — `secret !== webhookSecret`
  - `src/routes/api/webhooks/revenuecat/+server.ts:33` — `authHeader !== 'Bearer ' + secret`
  - `src/routes/api/webhooks/user-signup/+server.ts:22` — `authHeader !== 'Bearer ' + secret`
  - (The Stripe webhook is fine — it uses `stripe.webhooks.constructEvent`, an HMAC verification: `src/lib/server/stripe.ts:45-57`.)
- **Impact:** `!==` short-circuits on first differing byte, leaking a timing signal. On its own this is low-risk over a network, but it compounds with A4 (no rate limit) and A3 (placeholder secret): an attacker with unlimited attempts and a timing oracle has a materially easier path to the secret.
- **Recommendation:** Compare with a constant-time function (`crypto.timingSafeEqual` over equal-length buffers, guarding length first). Small, mechanical change across the three custom webhooks.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding A7: Weather webhook accepts its secret via URL query string
- **Severity:** P2
- **Category:** security
- **Evidence:** `src/routes/api/webhooks/weather/+server.ts:204-209` — `GET` handler reads `url.searchParams.get('secret')` and forwards it.
- **Impact:** Secrets in URLs land in server access logs, proxy logs, browser history, and `Referer` headers — a common way secrets leak. The `WEBHOOK_SECRET` protects a service-role-backed job that writes weather for all peaks (not user data), so blast radius is limited, but it's an unnecessary exposure.
- **Recommendation:** Require the secret in a header for GET too (as POST already does), or drop the GET testing path before launch.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding A8: Public REST API is fully open CORS with no abuse controls
- **Severity:** P2
- **Category:** security
- **Evidence:** `src/hooks.server.ts:9-27` sets `Access-Control-Allow-Origin: *` for all `/api/v1/*`. Auth is via `Authorization: Bearer` (not cookies), and no `Allow-Credentials` is set — so classic cookie-CSRF is not the risk here.
- **Impact:** Mostly acceptable for a token-based mobile API. The concern is that `*` + no rate limiting (A4) means any origin/script can drive the API at will. Not a data-leak by itself (RLS still applies), but it broadens the abuse surface.
- **Recommendation:** Acceptable to keep `*` for a public read API, but pair it with rate limiting (A4). Optionally scope write endpoints more tightly. No change needed if A4 lands.
- **Effort:** S
- **Suggested executor:** — (covered by A4)

### Finding A9: `user_summits` UPDATE policy lacks a `WITH CHECK` clause
- **Severity:** P3
- **Category:** correctness
- **Evidence:** `supabase/migrations/20241220400000_user_summits.sql:47-49` — `CREATE POLICY "Users can update own summits" ON user_summits FOR UPDATE USING (auth.uid() = user_id);` (no `WITH CHECK`). Same shape appears on `user_reviews`.
- **Impact:** Without `WITH CHECK`, the policy validates only the *existing* row, not the post-update row. A user could in principle reassign their own row's `user_id` to another user. The web/API mutation code (`updateSummit` in `src/lib/server/summits.ts:124-138`) does not expose `user_id` in updates, so this is not currently exploitable — but it's a latent gap if a future endpoint passes `user_id` through.
- **Recommendation:** Add `WITH CHECK (auth.uid() = user_id)` to the UPDATE policies on `user_summits` and `user_reviews`.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding A10: Generic 500s conflate RLS denial with real failures
- **Severity:** P3
- **Category:** quality
- **Evidence:** e.g. `src/routes/api/v1/summits/[id]/+server.ts:33-38` returns `500 "Failed to update summit"` for any thrown error, including an RLS denial (which surfaces as a "no rows" error from `.single()`). No structured logging distinguishes the cases.
- **Impact:** Not a vulnerability, but it masks authorization failures as server errors and gives no signal to detect probing/abuse in production (there is no error monitoring — cross-cutting lead #7). Defense-in-depth and observability gap.
- **Recommendation:** Map "no rows / RLS denied" to `404`/`403` distinctly from `500`, and add structured logging so unauthorized attempts are visible. Fold into the broader observability work (Domain B).
- **Effort:** S
- **Suggested executor:** Sonnet

---

## Areas verified healthy (explicitly)

- **No IDOR in `[id]` endpoints.** `PATCH/DELETE /api/v1/summits/[id]` and `DELETE /api/v1/comments` do not filter by `user_id` in the query, but they use the token-scoped client and RLS (`auth.uid() = user_id` for UPDATE/DELETE on `user_summits`, `summit_comments`) blocks cross-user mutation at the DB. Verified policies in `20241220400000_user_summits.sql` and `20250327000000_summit_reactions_comments.sql`.
- **No `user_id` forgery.** Every authed mutation sets ownership from `user.id` returned by `requireAuth` → `getUser()` (token-validated), never from the request body. Checked summits, reviews, comments, follows, forum topics/replies, images. `follows` even blocks self-follow (`+server.ts:51`).
- **RLS is enabled on all user tables** with public-read / own-write policies; `user_subscriptions` and bookmarks are own-read only. Writes to `user_subscriptions` happen only through service-role webhooks (no client write policy), so users cannot self-upgrade via the DB directly — the only Pro-grant path is the webhooks (see A3).
- **Service-role key containment.** `SUPABASE_SERVICE_ROLE_KEY` is read only in `createSupabaseServiceClient` via `$env/dynamic/private` (server-only) and used only in the 4 webhooks + contact form + admin/contact load — never in a client-reachable path. No `PUBLIC_` prefix, so it cannot be inlined into the browser bundle.
- **Stripe webhook signature verification is correct** (`stripe.webhooks.constructEvent`, HMAC) — unlike the three hand-rolled webhooks.
- **Private profiles are respected** in `/api/v1/users/[id]` (`is_public` check at `+server.ts:42-48`).
- **Secrets hygiene at rest:** no `.env` committed, `.env.*` gitignored (verified), `.env.example` contains only key *names*.
- **Contact form** HTML-escapes user message before emailing (`contact/+page.server.ts:61-65`) and has a honeypot — good, just missing rate limiting (A4).

---

## Note on pre-seeded config facts (security assessment)

- **STRIPE_SECRET_KEY is a real LIVE key in Railway.** Acceptable *if* it stays server-only — it does (`$env/dynamic/private`, `src/lib/server/stripe.ts`). Ensure the live key is never logged; the Stripe webhook path is the only consumer and it's signature-verified. No code issue found; just confirm Railway var scoping and that `STRIPE_WEBHOOK_SECRET` is the live-mode signing secret.
- **REVENUECAT_WEBHOOK_SECRET placeholder** → Finding A3 (P1).
- **SPARROW_API_KEY placeholder** → lower security impact (email gateway auth). Fix before launch so email works, but not a data-exposure risk; not separately scored.

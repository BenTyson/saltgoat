# Red-team: `getSession()` → `getUser()` authz conversion (commit `2d26df4`)

**Reviewer:** Fable-tier adversarial pass · **Date:** 2026-07-21
**Scope:** 75 call sites across 24 files converting SSR/admin authorization from
`supabase.auth.getSession()` (unvalidated cookie decode) to `supabase.auth.getUser()`
(JWT revalidated against the auth server). Live on `main`, logged-out-verified only.

---

## Verdict

**SAFE TO KEEP AS-IS (security).** No authz inversion, no admin bypass, no live
reshaping data-loss bug. The conversion is a genuine, correct hardening: every
authorization decision now rests on a server-validated JWT instead of a forgeable
cookie decode. The known target (hardcoded admin UUID `admin.ts:6`) is now protected
by a validated user id, closing finding A1 from `A-security.md`.

**BUT: NEEDS RELIABILITY FIXES BEFORE SCALING TRAFFIC.** The conversion was done by
inlining `getUser()` into 24 files rather than adopting the canonical
`@supabase/ssr` pattern (validate once in `hooks.server.ts`, stash in `event.locals`).
That leaves three non-security regressions that will surface under real authenticated
traffic: an availability coupling of *public* pages to the auth server, a
concurrent-refresh race that can cause intermittent spurious logouts, and 2–3×
redundant auth round-trips per navigation. None block security launch; all should be
fixed before the app carries meaningful logged-in load.

**Confirmed issues:** 0 Critical · 0 High · 2 Medium · 3 Low

---

## What is NOT wrong (cleared during red-team)

These are the things the task asked me to hunt for. I confirmed each is safe:

1. **No authz inversion.** `getUser()` is strictly stronger than `getSession()`.
   Every guard is `if (!session?.user ...)` where `session = user ? { user } : null`.
   `session` is truthy iff a *validated* user exists — never truthy when it shouldn't be.
   Fail direction on error is **closed** (auth-server error → `user = null` → treated
   as logged out), not open. No path grants access it previously denied.
2. **Admin guard intact.** `admin/+layout.server.ts:7-9` now feeds `assertAdmin`
   a validated `user`. `assertAdmin` (`admin.ts:12-16`) and `isAdmin` (`admin.ts:8-10`)
   compare `user.id` to the hardcoded UUID. The cookie-forgery bypass described in
   A1 is closed: a crafted `sb-*-auth-token` with `sub` = admin UUID no longer passes,
   because `getUser()` verifies the JWT signature server-side. Admin mutation actions
   in `admin/content` and `admin/moderation` independently re-check `isAdmin(user.id)`
   with a validated user — good defense-in-depth.
3. **Root layout still serves the client everything.** `+layout.server.ts:11-14`
   uniquely keeps the **real** Session (calls `getUser()` to validate, then
   `getSession()` to fetch the full object) and returns it as `data.session`.
   `Header.svelte` only reads `{#if session}` truthiness (lines 140, 322); it receives
   `profile`/`isAdmin` as separate props. `+layout.svelte:29` passes the full session.
   Client is not starved of any field.
4. **No downstream reads of discarded session fields.** Grep for
   `.access_token` / `.refresh_token` / `.expires_at` / `.provider_token` across
   `src/**` returns **zero** hits. The reshape `{ user }` discards those fields but
   nothing server-side consumes them, and the client gets the full object from the
   root layout. So the reshape is currently harmless (see L1 for the residual footgun).
5. **No left-behind authz `getSession()`.** Only three `getSession()` references
   remain: `+layout.server.ts:13` (intentional, full-session fetch after validation),
   a comment in `peaks/+page.server.ts:10`, and
   `api/v1/forum/topics/[id]/replies/+server.ts:25` (known-intentional — optional
   reaction highlighting on a GET, not an authz decision). All correct.

---

## Confirmed issues (ranked)

### M1 — Public SSR pages now hard-depend on the auth server (availability + latency)
- **Severity:** Medium
- **Where:** `map/+page.server.ts:7-8`, `ranges/+page.server.ts:33`,
  `ranges/[slug]/+page.server.ts:52`, `peaks/+page.server.ts:14-17`,
  `peaks/[slug]/+page.server.ts:39`, `+page.server.ts:13-14`, plus every other
  converted load.
- **Regression:** `getSession()` was a **local** operation (decode the JWT from the
  cookie, no network). `getUser()` makes a **blocking network round-trip** to
  Supabase GoTrue (`/auth/v1/user`) on **every** render — including fully public,
  logged-out pages that only need the session for optional "have you summited this?"
  decoration.
- **Failure scenario:** Supabase auth has a latency spike or brief outage.
  Previously: `/peaks`, `/map`, `/ranges`, home — all pure content pages — render
  fine for anonymous visitors. Now: every one of those pages blocks on the auth
  round-trip, so a GoTrue slowdown degrades the *entire* public site (including SEO
  crawls and anonymous traffic), and a GoTrue outage takes public pages down or makes
  them crawl. This is new coupling that did not exist pre-commit.
- **Fix:** Adopt the canonical pattern — validate the user **once** in
  `hooks.server.ts`, cache on `event.locals.user` (and a `safeGetSession()` helper),
  and have loads read `locals`. Public loads that only need "is anyone logged in"
  should not each pay a network hop. This also fixes M2 and L2 in one refactor.

### M2 — Concurrent token-refresh race across per-load client instances
- **Severity:** Medium
- **Where:** structural — `+layout.server.ts:11`, every `+page.server.ts` load, no
  `event.locals`, no `await parent()` anywhere (confirmed: grep for `await parent()`
  = 0 hits; grep for `locals` in hooks/layout = 0 hits).
- **Regression:** SvelteKit runs the root layout load and the page load **in
  parallel**. Each converted load calls `createSupabaseServerClient(cookies)` and gets
  its **own** GoTrue client instance, then calls `getUser()`. When the access token is
  expired at the moment of navigation, **both** instances independently try to refresh
  using the **same** refresh token. `@supabase/supabase-js` serializes refreshes with
  an in-process lock *within one client instance* — but these are separate instances,
  so the lock does not span them.
- **Failure scenario:** A logged-in user's access token (typ. 1 h TTL) expires, then
  they navigate. Root layout `getUser()` and page `getUser()` fire concurrently; both
  POST `/auth/v1/token?grant_type=refresh_token` with the same token. With refresh
  token **rotation** enabled (Supabase default), the first rotates the token and the
  second gets `refresh_token_not_found` / "already used" → that client returns
  `user = null`, the load treats the user as logged out, and in the worst case the
  now-revoked refresh token churns the session → **spurious logout / login flicker**
  that self-heals on the next navigation but looks like random session instability.
  The window is narrow (only at token-expiry boundary) but recurs for every active
  user roughly hourly and is exactly the failure `@supabase/ssr`'s "one client per
  request" guidance is designed to prevent.
- **Fix:** Same as M1 — one client + one `getUser()` per request in `hooks.server.ts`,
  reused via `locals`. That serializes the single refresh and eliminates the race.

### L1 — Reshape `{ user }` discards the real Session (latent footgun, not a live bug)
- **Severity:** Low
- **Where:** the `const session = user ? { user } : null` line in all 23 non-root
  converted files (e.g. `peaks/[slug]/+page.server.ts:40`,
  `profile/+page.server.ts:20`, `api/checkout/+server.ts:8`).
- **Issue:** These shadow objects have only `.user`; `.access_token`, `.expires_at`,
  `.refresh_token`, `.provider_token` are `undefined`. **No current code reads them**
  (grep clean), so nothing breaks today. The risk is future maintenance: a later edit
  that does `session.access_token` (e.g. to call an external API as the user, or to
  hand a token to a client component) will silently get `undefined` with no type
  error, because the object is inferred as `{ user }`. The root layout keeping the
  real session while 23 siblings keep a stub is an inconsistency that invites this.
- **Fix:** After the M1/M2 refactor, expose a typed `locals.user` (a `User`, not a
  fake Session) and drop the `session`-shaped stubs entirely, so the shape can't be
  mistaken for a full Session. If keeping the stubs short-term, name them `authUser`
  and gate on `if (!user)` to remove the misleading `session` framing.

### L2 — Redundant auth round-trips per navigation (perf)
- **Severity:** Low
- **Where:** `+layout.server.ts:11-13` (getUser + getSession) plus each page/child-layout load.
- **Issue:** A logged-in navigation to a normal page fires: root layout `getUser()`
  (network) + `getSession()` (local) + page load `getUser()` (network) = **2 network
  auth calls**. An admin page fires root `getUser()` + admin-layout `getUser()` = 2
  network calls as well. All redundant — they validate the same cookie. `getSession()`
  at `:13` is also technically a second GoTrue-client call right after `getUser()`,
  though it resolves from memory.
- **Fix:** Collapse to a single `getUser()` in `hooks.server.ts`; read `locals`
  everywhere. (Subsumed by M1.)

### L3 — Auth-server outage silently logs everyone out (fail-closed behavior change)
- **Severity:** Low (arguably correct-by-design; documenting the behavior delta)
- **Where:** all converted loads; `admin/+layout.server.ts:7-9`.
- **Issue:** Pre-commit, `getSession()` returned a cookie-cached session even if GoTrue
  was unreachable, so users stayed "logged in" during an auth outage. Post-commit,
  `getUser()` returns `null` on any auth-server error, so **every** user (including the
  admin) is treated as logged out for the duration of an outage — admin dashboard
  becomes unreachable, logged-in-only pages 303 to `/auth`. This is a *safer* failure
  mode (fail closed) and not a vulnerability, but it is a real availability/UX change
  the owner should know about: auth-server health is now a hard dependency for all
  authenticated functionality.
- **Fix:** Accept as-is (fail-closed is correct), but monitor GoTrue availability now
  that it gates the whole authenticated surface, and ensure the `/auth` redirect loop
  degrades gracefully (an outage must not trap a user in a redirect cycle).

---

## Authenticated-path manual test script

Run against the live deploy. You need: (a) a normal logged-in test account, (b) the
admin account (user id `c983d602-d0e0-4da6-be9d-f91a456bfdb0`), and browser devtools
(Application → Cookies, Network tab).

### A. Logged-in normal user — happy path
1. Log in as the test user. **Expect:** header shows the profile link / avatar (not
   "Sign in"). Confirms root layout returns a real session.
2. Visit `/profile`. **Expect:** 200, your dashboard. (Guard: `profile/+page.server.ts:20`.)
3. Visit `/peaks/<slug>` and log a summit (form action `logSummit`). **Expect:**
   success; summit appears. Confirms `getUser()` in the action returns your id.
4. Submit a review, upload a photo, add to watchlist on the same peak. **Expect:**
   each succeeds. Confirms all converted actions on `peaks/[slug]/+page.server.ts`.
5. Create a forum topic (`/community/<cat>/new`) and a reply. **Expect:** success.
6. Visit `/pricing`. **Expect:** if the account is Pro, "current plan" state renders;
   confirms `isPro` still resolves with the reshaped session.
7. Visit `/users/<your-own-id>`. **Expect:** 200 even if your profile is private
   (own-profile bypass at `users/[id]/+page.server.ts:27`). Then set profile private,
   open the same URL in an incognito/logged-out window. **Expect:** 404/redirect.

### B. Token-refresh / expiry (the M2 race — most important authenticated test)
1. Log in. In devtools, note the `sb-*-auth-token` cookie.
2. Force the access token to be expired: either wait past the access-token TTL
   (default 3600 s) **or** in Supabase dashboard shorten JWT expiry to ~60 s for the
   test, then idle past it.
3. With an expired-but-refreshable session, **hard-navigate** (full page load, not
   client nav) to a page whose root layout + page load both run — e.g. `/peaks/<slug>`.
   Repeat 8–10 times across different pages.
4. **Expect (pass):** you stay logged in every time; header stays authenticated; no
   bounce to `/auth`. **Watch for (fail = M2 confirmed):** intermittent flashes of the
   logged-out header, a redirect to `/auth`, or the session cookie getting cleared —
   especially if refresh-token rotation is on. Check the Network tab for two concurrent
   `token?grant_type=refresh_token` calls and any `400` on the second.
5. If it fails even occasionally, prioritize the M1/M2 `hooks.server.ts` refactor
   before opening to traffic.

### C. Admin
1. Log in as admin. Visit `/admin`. **Expect:** 200 overview dashboard.
2. Visit `/admin/moderation`, `/admin/content`, `/admin/users`,
   `/admin/subscriptions`. **Expect:** all 200.
3. Perform one mutating admin action per screen: approve/remove a photo
   (`admin/content` / `admin/moderation`), resolve a flag, pin/lock/move a forum topic,
   delete a review. **Expect:** each succeeds. Confirms `isAdmin(user.id)` re-checks
   pass with the validated user.
4. **Negative:** log in as the **normal** user and directly GET `/admin`. **Expect:**
   302 → `/`. Then, still as the normal user, POST directly to an admin action (e.g.
   via devtools `fetch` to `/admin/content?/removePhoto` with a form body). **Expect:**
   `403`. Confirms actions are not protected by the layout guard alone.
5. **Forgery attempt (validates A1 is closed):** as a logged-out or normal user, hand-craft
   a `sb-<ref>-auth-token` cookie whose decoded `sub` = the admin UUID (unsigned/garbage
   signature) and GET `/admin`. **Expect:** 302 → `/` (getUser rejects the invalid JWT).
   Pre-commit this could have reached the dashboard; it must not now.

### D. Logout
1. As any logged-in user, sign out. **Expect:** header flips to "Sign in";
   `/profile` and `/admin` both redirect away. Confirms the null branch of the reshape.

---

## Recommended follow-up (single fix closes M1, M2, L1, L2)

Refactor to the canonical `@supabase/ssr` SvelteKit pattern:
- In `hooks.server.ts`, create the server client, call `getUser()` **once**, and set
  `event.locals.user` (+ a `safeGetSession()` that validates before returning the
  session). Attach the client to `event.locals.supabase`.
- Replace the 23 inline `getUser()` + reshape blocks with reads of `locals.user`.
- Keep the root layout as the one place that returns the full session to the client.

This removes the per-load network fan-out (M1/L2), serializes token refresh so the
parallel-load race disappears (M2), and lets you type `locals.user` as `User` so the
discarded-field footgun (L1) can't recur.

# SaltGoat Audit — Consolidated Backlog

**Compiled:** 2026-07-13 (Phase 2, hub). Sources: `A-security.md` `B-backend.md` `C-frontend.md`
`D-uiux.md` `E-features.md` `F-growth.md`. Raw finding counts across the six reports: **76**
(A 10 · B 16 · C 10 · D 12 · E 13 · F 15). Deduped into the prioritized items below.

**Executor legend:** 👤 You (dashboard/decision — I can't do it) · ⚙️ Haiku (mechanical) ·
🔧 Sonnet (standard) · 🧠 Opus (design/architecture). Effort: S < 1h · M ½-day · L multi-day.

---

## Executive read

The app is **more built than it is finished-for-launch**. Code quality is genuinely good (no N+1s,
clean architecture, polished design system, sound authorization core). **Almost every true
launch-blocker lives in config/infra, not in the code** — and three separate Fable agents (A, B, F)
plus E converged on the same handful of issues, which is high-confidence signal.

**The revenue + trust pipeline is broken at several independent links right now:**
Stripe checkout 500s · weather (the Pro wedge) serves stale data · email silently no-ops ·
a forgeable webhook grants free Pro · garbage content sits on the public forum.

**Do-first set (all fast, mostly you):** Tier 0 below — ~30–45 min of dashboard work + two ~5-min
code fixes clears every P0 except the deeper auth/observability P1s.

---

## Tier 0 — Immediate config & content (mostly 👤 you, do today)

These are the launch-blockers. None require real engineering; most are Railway/dashboard changes.

| # | Item | Sev | Source | Fix | Who |
|---|------|-----|--------|-----|-----|
| T0-1 | **Stripe `STRIPE_PRICE_ID` holds a `prod_` (product) ID** — every web checkout 500s ("No such price", `stripe.ts:16,22`) | P0 | E,F | Replace with the `price_…` ID from Stripe → that product. Update Railway **and** local `.env`. | 👤 S |
| T0-2 | **Weather cron unscheduled** — forecasts (the Pro wedge) decay to stale within a day | P0 | E,F | Add cron (Railway cron / cron-job.org) → `POST /api/webhooks/weather` w/ `x-webhook-secret`, 4×/day. `ben.md:77` | 👤 S |
| T0-3 | **`SPARROW_URL` missing in Railway** — welcome email, newsletter, contact form all silently no-op | P0 | E,F | Add `SPARROW_URL=https://sparrow-production-b53e.up.railway.app` to Railway. | 👤 S |
| T0-4 | **RevenueCat + Sparrow secrets are placeholders** — forgeable Pro entitlement (see A/T1-2) + broken email auth | P0 | A,F | Set the real `REVENUECAT_WEBHOOK_SECRET` and `SPARROW_API_KEY` in Railway + `.env`. | 👤 S |
| T0-5 | **`SUPABASE_WEBHOOK_SECRET` committed to git** — live Bearer token hardcoded in 3 migration files' triggers | P0 | A,B | Rotate the secret; move to Supabase Vault / dashboard webhook. Then the trigger reads it indirectly. (code help below: T1-6) | 👤+🔧 M |
| T0-6 | **Garbage content is the top public `/community` post** ("asdjk asldkj…") | P0 | D | Delete via admin moderation UI. | 👤 S |
| T0-7 | **Open-Meteo on non-commercial tier** — licensing risk once you charge for weather | P0/P1 | F | Buy the commercial key (~€10/mo) before taking real Pro payments. | 👤 S |

**After Tier 0, the only remaining P0-code item is the type-corruption cleanup (C1 → T1-1), which is a
5-minute fix that also clears ~68 of the 101 `svelte-check` errors.**

---

## P1 — Fix before launch / before real traffic

| # | Item | Source | Fix | Who |
|---|------|--------|-----|-----|
| T1-1 | **`src/lib/types/database.ts` is corrupted** — commit `46f8188` overwrote the 2-line re-export barrel with raw `gen types` output + a leaked CLI update notice (root of ~68/101 check errors) | C | Regen into shared pkg (`… gen types … 2>/dev/null > packages/shared/src/types/database.ts`), restore barrel to the 2 `export *` lines. Shared copy also stale (missing `contact_submissions`). | ⚙️ S |
| T1-2 | **Regen command in CLAUDE.md re-breaks the barrel every run** (no `2>/dev/null`, points at the barrel) | C | Fix the documented command so T1-1 can't recur. | ⚙️ S |
| T1-3 | **RevenueCat webhook forgeable** — placeholder secret + attacker-controlled `app_user_id` ⇒ free Pro | A | Depends on T0-4 (real secret) + constant-time compare. | 🔧 S |
| T1-4 | **RevenueCat webhook swallows all DB errors, returns 200** — paying customer silently not upgraded, no retry (`revenuecat/+server.ts:53-121`) | B | Return non-2xx on upsert failure so RevenueCat retries; log it. | 🔧 S |
| T1-5 | **SSR + admin auth use `getSession()` not `getUser()`** — decodes cookie JWT without revalidating (Supabase-warned); admin UUID hardcoded (`admin.ts:5`) | A | Switch web SSR/admin guards to `getUser()`. Escalate to P0 if cookie forgery reproduces in this `@supabase/ssr` version. | 🧠 M |
| T1-6 | **Move webhook secret out of DB trigger** (pairs with T0-5) | A,B | Refactor `notify_user_signup()` to read secret from Vault/setting, new migration. | 🔧 M |
| T1-7 | **Zero observability** — no Sentry, no `handleError` hook, 69 raw `console.*` as sole telemetry | B | Add `handleError` in `hooks.server.ts` + minimal error monitoring. | 🔧 M |
| T1-8 | **No rate limiting anywhere** — contact-form email-bomb, content spam, webhook-secret brute force | A | Add lightweight rate limiting on public POST/webhooks. | 🧠 M |
| T1-9 | **Full-table scans** — leaderboard fetches all `user_summits`+`profiles`; follow-suggestions scan all users → silently *wrong* at Supabase's 1,000-row cap | B | Push aggregation to SQL (RPC/view) with limits. | 🧠 M |
| T1-10 | **Achievement check = 6–7 sequential queries on the summit hot path** (~150–400ms; whole POST = 10–11 round trips) | B | Parallelize to ~2 waves. | 🔧 S |
| T1-11 | **`/pricing` unreachable from nav & footer** — only found after hitting a paywall | D,F | Add to `Header.svelte` navLinks + footer. | ⚙️ S |
| T1-12 | **`/pricing` never mentions weather** — the most-enforced Pro gate & actual wedge is unadvertised | E,F | Rewrite pricing to lead with elevation-banded forecasts. | 🔧 S |
| T1-13 | **Mobile: `/pricing` "SaltGoat Pro" heading clipped under fixed header** | D | Scroll-offset / padding fix. | ⚙️ S |
| T1-14 | **`/map` renders broken for ~2s on load** — tiles in a narrow strip, markers scattered (Leaflet/MapLibre resize timing) | D | `invalidateSize()` after mount/layout. | 🔧 S |
| T1-15 | **Peak rank numbers out of sequence on `/peaks`** (#20, #22, #21) — data-trust issue on flagship page | D | Fix sort/tie-break. | ⚙️ S |
| T1-16 | **Forum is a fully-built ghost town in primary nav** — strongest "dead app" signal + solo-moderation liability | D,E,F | Seed 15–30 real topics OR demote `/community` to footer until there's a base. | 👤+🔧 M |
| T1-17 | **Route pages (66, highest search intent) ship with only title+description** — no canonical/OG/JSON-LD; forum topics absent from sitemap | F | Add structured data + canonical/OG to route pages; add topics to sitemap. | 🔧 M |
| T1-18 | **GSC never set up / sitemap unsubmitted** | F | Verify property, submit sitemap, request indexing. `ben.md:65` | 👤 S |
| T1-19 | **`NewsletterSignup.svelte` mounted on zero pages** — no email capture despite the component existing | F | Mount on home/footer/post-signup. | ⚙️ S |

---

## P2 — Should-do (quality, pre-scale hygiene)

| # | Item | Source | Who |
|---|------|--------|-----|
| T2-1 | Delete legacy `peak_conditions` dual-write now (pre-launch is the free window; gated on non-existent mobile clients) | B | 🧠 M |
| T2-2 | 2 SECURITY DEFINER fns still not `search_path`-pinned (`toggle_trace_vote`, forum search) | A | 🔧 S |
| T2-3 | One real reactivity bug: `peaks/[slug]/[route]/+page.svelte:17` stale on client-nav (other 30+ warnings benign) | C | ⚙️ S |
| T2-4 | 17 unassociated form `<label>`s (a11y) across form components | C | ⚙️ S |
| T2-5 | SummitModal Escape handler likely dead (`tabindex="-1"` backdrop keydown never fires) | D | ⚙️ S |
| T2-6 | Raw Supabase auth error strings shown to users | D | ⚙️ S |
| T2-7 | Service-worker registration 404 console errors on every page | D | 🔧 S |
| T2-8 | No onboarding after signup — user lands cold, no path to first summit | D,F | 🧠 M |
| T2-9 | Email digest / notifications absent — no retention loop pulls users back | F | 🧠 L |
| T2-10 | Stale docs: `CLAUDE.md`/`CURRENT-STATUS.md` say Stripe stubbed & GPX dead — both false now | E | ⚙️ S |
| T2-11 | Map-lib consolidation (leaflet+maplibre both lazy-loaded — optional, not bloat) | C | 🔧 M |

---

## P3 — Future / post-launch

| # | Item | Source |
|---|------|--------|
| T3-1 | Defer/gate the 1,185-LOC 3D terrain viewer — self-hides w/o trace data; 2D map is the honest launch experience | E,C |
| T3-2 | Source real GPX traces for priority routes (unlocks the 3D/trail feature) | E,F |
| T3-3 | Decompose giant components (`peaks/[slug]/+page.svelte` 756, home 624, profile 604) | C |
| T3-4 | Pricing/packaging experiments; monthly option; founder's-rate | F |
| T3-5 | Content expansion on `/learn` + `/blog` as acquisition assets | F |

---

## Recommended execution order

1. **Session 1 — "Green the launch" (mostly you + one agent):** Tier 0 (T0-1…T0-7) + T1-1/T1-2 type
   fix + T1-11 pricing-in-nav. Clears every P0 and the worst quick wins in ~1–2 hrs.
2. **Session 2 — Security & webhooks (🔧/🧠):** T1-3…T1-8 (RevenueCat integrity, getUser, secret move,
   observability, rate limiting).
3. **Session 3 — Scale & correctness (🧠):** T1-9, T1-10, T2-1, T1-14/T1-15.
4. **Session 4 — Launch UX & growth (🔧):** T1-12, T1-16, T1-17…T1-19, T2-8.
5. **Ongoing:** P2/P3 as capacity allows.

Each session spins off scoped subagents from the hub and reports back here; move completed items to the
README execution log.

---

## Addendum — Fable deep-bank findings (2026-07-14)

Six Fable agents banked durable artifacts (`docs/audit/{reviews,specs,growth}/`, draft SQL in
`docs/audit/specs/drafts/`). New actionable items surfaced — **including real holes in the code we just
shipped in Sessions 1–2.** Auth red-team verdict on the `getUser()` change: **SAFE on security** (0 crit/
0 high, no authz inversion, admin guard closed); the findings are reliability.

### NEW — live-code fixes from the reviews (our own S1/S2 changes)
| # | Item | Sev | Evidence | Fix | Who |
|---|------|-----|----------|-----|-----|
| R-H1 | Rate limiter trusts the *first* `x-forwarded-for` hop → bypassable + attacker can 429-DoS legit RevenueCat/Supabase webhooks (limiter runs before secret check) | **P1** | `rateLimit.ts:92-103` | trust the correct/last proxy hop or `getClientAddress`; consider secret-check-before-limit on webhooks | 🔧 S |
| R-H2 | RevenueCat RENEWAL/EXPIRATION/CANCELLATION use `.update().eq()` → silent 200 on 0 rows (T1-4 recurs one event later) | **P1** | `revenuecat/+server.ts:89-137` | upsert or rowcount-check | 🔧 S |
| R-M3 | Restored types barrel points at **stale** shared types (missing `contact_submissions` + 7 forum tables); safety is illusory (untyped clients hide it) | **P1** | `packages/shared/src/types/database.ts` | run the `supabase gen types` regen (the real T1-1 fix) | 👤 CLI + ⚙️ S |
| R-A | Auth reliability: `getUser()` per-request → public pages hard-depend on auth server + concurrent-refresh race (flicker/logout) + reshape footgun + redundant round-trips | **P1** | `hooks.server.ts`, 23 `+page.server.ts` | centralize: validate once in `hooks.server.ts`, stash `locals.user`, read `locals` everywhere | 🧠 M |
| R-RC1 | Non-UUID `app_user_id` (RC anon ids) → guaranteed-fail 500 retry loop | P2 | `revenuecat/+server.ts` | validate/skip non-UUID | 🔧 S |
| R-RC2 | No event-ordering guard → a retried stale RENEWAL can resurrect Pro after EXPIRATION | P2 | `revenuecat/+server.ts` | ordering/timestamp guard | 🔧 M |
| R-L1 | `handleError` error-logs every crawler 404 (noise) | P3 | `hooks.server.ts` | skip 404s / log at info | ⚙️ S |

### NEW — latent bugs found during spec work
| # | Item | Sev | Evidence | Who |
|---|------|-----|----------|-----|
| B-1 | `isPro()` rejects `status === 'trialing'` → trials grant no Pro (blocks the trial pricing experiment) | P2 | `subscriptions.ts:45-47` | 🔧 S |
| B-2 | `og:url` hardcoded to homepage → every page shares as `saltgoat.co` | P2 | `app.html:15` | ⚙️ S |
| B-3 | `robots.txt` is bare `Allow: /` — should disallow `/admin`, `/api/`, `/profile`, `/auth` | P2 | robots | ⚙️ S |
| B-4 | Leaderboard `isPro` badge wrong for all but viewer (RLS own-read) | — | folded into T1-9 (DEFINER RPC fixes it) | — |
| B-5 | Achievement concurrent-duplicate-award kills the batch | — | folded into T1-10 (upsert) | — |

### Ready-to-execute specs (post-Fable, cheap models)
- **T1-6** rotation → migration draft `specs/drafts/…rotate_signup_webhook_secret.sql` + `specs/T1-6-rotation-runbook.md` (Vault approach). Needs Supabase CLI + lockstep flip.
- **T1-9/T1-10** scale → `specs/T1-9-T1-10-scale-specs.md` + draft SQL. Sonnet-implementable, zero call-site signature changes.
- **Growth** → `growth/seo-content-execution.md` (8 SEO tickets + 12 content briefs) and `growth/monetization-retention.md` (pricing experiments + digest architecture + A72 activation).

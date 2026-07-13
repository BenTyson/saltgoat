# 00 — Repo Map & Evidence Pack

**Produced:** 2026-07-13 (Opus, Phase 0). **Purpose:** give each domain auditor a *curated* reading
list so they read the 5–15 files that matter, not the whole repo. Keeps premium (Fable) tokens focused.

Everything here is cheap-to-gather structural evidence: file inventories, health-check output, and
grep-level signals. It is NOT analysis — that's the domain reports' job. Treat findings below as
*leads to verify*, not conclusions.

---

## 1. Shape of the codebase (web only)

| Metric | Value |
|--------|-------|
| Web LOC (TS + Svelte) | ~39.4k across 243 files |
| Server modules | 24 top-level + 12 forum submodules — 6.27k LOC |
| API endpoints (`+server.ts`) | 32 (28 under `/api/v1`, 4 webhooks) |
| Route pages with server loads | 26 |
| Svelte components | ~130 across 18 domains (`src/lib/components/*`) |
| DB migrations | 62 (98 `create policy` statements, 7 `SECURITY DEFINER` fns) |
| Commits | 79 |
| Schema-validation library | **none** (no zod/valibot/yup — validation is hand-rolled) |
| Test suite | **none** (verification = build + manual) |

**Server modules by size** (analysis hotspots):
`conditions.ts` 698 · `admin.ts` 589 · `summits.ts` 372 · `activity.ts` 351 · `trips.ts` 345 ·
`images.ts` 339 · `gpx.ts` 302 · `follows.ts` 296 · `achievements.ts` 296 · `forum/topics.ts` 252.

**Largest components** (perf/complexity hotspots):
`map/TerrainViewer3D.svelte` 934 · `peaks/[slug]/+page.svelte` 756 · `map/PeakMap.svelte` 753 ·
`+page.svelte` (home) 624 · `map/TrailMap.svelte` 617 · `profile/+page.svelte` 604 ·
`profile/EditProfileModal.svelte` 595 · `profile/ActivityFeed.svelte` 545.

**Highest-churn files** (git, most-changed = risk/instability):
`peaks/[slug]/+page.svelte` (14) · `layout/Header.svelte` (14) · `profile/+page.svelte` (11) ·
`peaks/[slug]/[route]/+page.svelte` (11) · `types/database.ts` (11) · `+page.svelte` (10).

---

## 2. Health signals

- **`npm run build`** → fails ONLY because `.env` is absent on this machine (SvelteKit inlines
  `PUBLIC_*` at build time; errors on `PUBLIC_SUPABASE_URL`). **Environmental, not a code defect.**
  Re-verify once `.env` is restored. Build otherwise reached the SW/manifest stage cleanly.
- **`npm run check` (svelte-check)** → **131 errors, 69 warnings, 63 files.** Breakdown:
  - 38 errors in `src/lib/types/database.ts` — "Module has no exported member" → generated Supabase
    types are out of sync with the `@saltgoat/shared` re-export layer. Many downstream errors cascade
    from this one root cause. **Fix this first; recount afterward.**
  - Form components heavy: `EditProfileModal` 14, `TrailReportForm` 10, `ReviewForm` 9, `CreateTripModal` 7.
  - Themes: `no exported member` (60), `Cannot find name` (16), implicit-any params (9), unsafe casts (7).
- **Build warnings:** multiple `state_referenced_locally` Svelte 5 warnings (e.g. `$state(data.x)` that
  should be `$derived`) in community + admin pages — reactivity smell, domain C.
- **~100 `console.*` calls** in `src/` — logging hygiene; no structured logger.
- **No `TODO/FIXME/HACK`** markers — either clean or undocumented debt.
- **20 `: any`** annotations in server modules — type-safety gaps.

---

## 3. Cross-cutting leads (verify in domain reports)

1. **Two map stacks bundled** — `leaflet` (2 files) + `maplibre-gl` (3 files) + `@types/leaflet`.
   Redundant runtime + bundle weight? (C/B)
2. **No input-validation library and no rate limiting** — 28 public/authed API endpoints validate by
   hand; DB CHECK constraints are the only backstop. (A)
3. **`database.ts` type drift** — root cause of 38 check errors; regen + shared-sync needed. (B/C)
4. **`conditions.ts` (698 LOC)** dual-writes legacy `peak_conditions` — documented deprecation not yet
   executed. (B)
5. **Forum** = 7 tables + 12 server submodules + full spec, shipped pre-users — scope vs. launch focus. (E)
6. **Half-configured launch infra** (from docs): weather cron not scheduled, Open-Meteo on
   non-commercial tier, GPX `trail_geometry` empty, Stripe web checkout stubbed. (E/B/F)
7. **No error monitoring / no structured logging** — blind in production. (A/B)

---

## 4. Per-domain curated reading lists

Each auditor should read its list + skim adjacencies as needed. File paths are load-bearing.

### A — Security & data integrity  · **Auditor: Fable**
Focus: authn/authz, RLS correctness, API input validation, webhook secret verification, secret handling,
subscription/entitlement enforcement, the recent SECURITY DEFINER signup fixes.
Read:
- `src/hooks.server.ts` (36 LOC — CORS, headers, entry)
- `src/lib/server/supabase.ts` (SSR + admin/service-role client + `requireAuth`)
- `src/lib/server/subscriptions.ts`, `src/lib/server/admin.ts` (`isAdmin`/`assertAdmin`)
- API sample for validation patterns: `src/routes/api/v1/summits/+server.ts`,
  `.../peaks/[slug]/reviews/+server.ts`, `.../comments/+server.ts`, `.../forum/topics/+server.ts`
- Webhooks (secret checks): `src/routes/api/webhooks/{weather,stripe,revenuecat,user-signup}/+server.ts`
- RLS: `supabase/migrations/00001_initial_schema.sql`, `..._user_summits.sql`, `..._peak_images.sql`,
  `..._ugc_photo_moderation.sql`, `..._community_forum.sql`, `20260420000002_fix_signup_webhook_trigger.sql`,
  `20260421000000_fix_signup_search_path.sql`
Key questions: Can a user forge `user_id`? Are all mutations RLS-guarded server-side, not just UI? Do
webhooks verify signatures/secrets constant-time? Is `SUPABASE_SERVICE_ROLE_KEY` ever reachable from a
client path? Are the 7 SECURITY DEFINER functions `search_path`-pinned? Any IDOR in `[id]` endpoints?

### B — Backend / infra / code quality  · **Auditor: Fable**
Focus: query efficiency (N+1), error handling, module cohesion, migration hygiene, the weather pipeline,
observability, deploy config.
Read:
- `src/lib/server/activity.ts` (351 — feed joins), `src/lib/server/leaderboard.ts` (aggregation),
  `src/lib/server/follows.ts`, `src/lib/server/forum/topics.ts` (pagination/counts)
- `src/lib/server/conditions.ts` (698 — weather v2 + legacy dual-write) + `api/webhooks/weather/+server.ts`
- `src/lib/server/achievements.ts` (check/award on every mutation — hot path)
- `src/lib/server/summits.ts`, `src/lib/server/images.ts` + `imageOptimizer.ts`
- `railway.toml`, `svelte.config.js`, `vite.config.ts`
Key questions: Where are N+1s in feed/leaderboard/forum? Is achievement-checking synchronous on the
request path? Error handling: swallowed errors, missing try/catch, unlogged failures? Is the legacy
`peak_conditions` dual-write safe to remove? Migration ordering/idempotency risks? What's the
observability story (there's none — quantify the risk)?

### C — Web frontend quality & performance  · **Auditor: Opus/Sonnet**
Focus: Svelte 5 runes correctness (the `state_referenced_locally` + type errors), component size/splitting,
map-library redundancy, bundle, loading/SSR, image handling.
Read:
- The 131-error hotspots: `src/lib/types/database.ts`, `components/profile/EditProfileModal.svelte`,
  `components/trail/TrailReportForm.svelte`, `components/review/ReviewForm.svelte`,
  `components/profile/CreateTripModal.svelte`
- Reactivity smells: `routes/community/[category]/+page.svelte`, `routes/admin/users/+page.svelte`
- Map stack: `components/map/{TerrainViewer3D,PeakMap,TrailMap,ElevationProfile}.svelte`
- Biggest routes: `routes/peaks/[slug]/+page.svelte`, `routes/profile/+page.svelte`, `routes/+page.svelte`
Key questions: Which `$state(data.x)` should be `$derived`? Can `database.ts` drift be fixed at the
source (regen + shared sync)? Do we need both leaflet AND maplibre? Which giant components should split?
Bundle size once build runs with `.env`.

### D — UI/UX  · **Auditor: Opus/Sonnet (+ live-site browse)**
Focus: onboarding/first-run, auth flow, empty states, design-system consistency, responsive behavior,
accessibility, conversion surfaces (pricing/upgrade).
Read/inspect:
- `routes/+page.svelte` (home), `routes/auth/+page.svelte`, `routes/pricing/+page.svelte`
- `components/layout/{Header,Footer}.svelte`, `routes/+layout.svelte`
- Core flows: `routes/peaks/+page.svelte`, `routes/peaks/[slug]/+page.svelte`,
  `components/summit/SummitModal.svelte`, `routes/profile/+page.svelte`
- Design tokens: `tailwind.config.js`, `src/app.html`, `components/ui/`
- Live: browse saltgoat.co for real UX/perf/broken-flow evidence.
Key questions: What does a brand-new user see and do first? Is there an onboarding path to first summit?
Empty states across social/forum/profile? A11y (the docs flag an outstanding audit). Where does the
free→Pro upgrade actually surface?

### E — Features & scope coherence  · **Auditor: Opus/Sonnet**
Focus: what's half-built, dead, or over-scoped for launch; feature-to-value mapping; Pro gating coherence.
Read:
- `docs/CURRENT-STATUS.md`, `docs/ben.md` (open checkboxes = incomplete launch infra), `docs/forum.md`
- `src/lib/server/gpx.ts` + `traces.ts` (GPX empty — is this dead weight?), `stripe.ts` (stub)
- Forum surface: `src/lib/server/forum/*`, `routes/community/*`
- `src/lib/server/subscriptions.ts` (free-tier limits) vs. where gating is enforced
Key questions: Which shipped features have zero payoff pre-launch (forum? 3D terrain? trips?)? What's
genuinely launch-blocking vs. deferrable? Any dead code (GPX pipeline, stubbed Stripe paths)? Is the
free/Pro split coherent and defensible?

### F — Growth & product strategy  · **Auditor: Fable**
Focus: SEO/discoverability, monetization model, retention/engagement loops, acquisition, forward roadmap.
Read/inspect:
- SEO infra: `routes/sitemap.xml/+server.ts`, JSON-LD pages (`peaks/[slug]`, `learn/*`, `blog/*`),
  `src/app.html` meta
- Content surfaces: `routes/learn/*` (6 guides), `routes/blog/*`, `routes/ranges/*`, `routes/leaderboard`
- Monetization: `routes/pricing/+page.svelte`, `subscriptions.ts` (free = 5 summits, Pro = $29.99/yr)
- Retention: `activity.ts`, `achievements.ts`, `follows.ts`, forum, weather (the recurring-use hook)
Key questions: Is the SEO foundation strong enough to win "Colorado 14ers" long-tail search? Is $29.99/yr
the right model, and is the free→Pro value ladder compelling (weather is the wedge)? What retention loops
exist and which are missing (notifications, email digests — both listed as not-built)? What are the 3–5
highest-leverage growth bets for a solo pre-launch app?

---

## 5. Output contract for domain reports

Each report (`A-security.md` … `F-growth.md`) should return findings in this shape so Phase 2 can
compile a clean backlog:

```
### Finding <id>: <title>
- Severity: P0 (launch-blocker) | P1 (pre-scale) | P2 (should-do) | P3 (future)
- Category: security | correctness | perf | quality | ux | scope | growth
- Evidence: file:line or concrete repro
- Impact: what breaks / what's the upside
- Recommendation: the fix or bet
- Effort: S / M / L
- Suggested executor: Haiku (mechanical) | Sonnet (feature) | Opus (architecture) | Fable (re-verify)
```

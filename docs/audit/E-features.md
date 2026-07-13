# E — Features & Scope Coherence Audit

**Auditor:** Opus (Domain E) · **Date:** 2026-07-13 · **Scope:** WEB APP ONLY (mobile/ ignored)
**Context:** Pre-launch, zero live users, solo owner, wants to launch soon.

---

## Executive Summary

**Scope-coherence verdict: SCOPE HAS SPRAWLED — but the sprawl is well-built, not half-built.**
The codebase is more *complete* than a solo pre-launch app needs, not less. Almost nothing is
genuinely half-coded or dead — the risk is the opposite: several large, fully-built features (forum,
3D terrain viewer, GPX trace system, trips) carry ongoing maintenance and "ghost-town" perception
cost with **zero payoff until a user base exists**. The real launch blockers are not in the app code
at all — they are **runtime configuration** (Stripe price ID, weather cron, email gateway). The code
mostly works; the *wiring to the outside world* is the exposure.

Two important corrections to the audit brief's priors:
- **Stripe web checkout is NOT stubbed.** `stripe.ts` is a full, real Stripe SDK integration
  (checkout + portal + webhook signature verification). `CLAUDE.md`, `CURRENT-STATUS.md`, and
  `.env.example` all still call it "stubbed" — the docs are stale, the code is live.
- **The GPX / trail-map / 3D pipeline is NOT dead code.** `gpx.ts` + `traces.ts` are wired
  end-to-end (upload UI → form actions → storage → voting → 2D/3D render → download) and the trail
  map has a graceful "Be the first to contribute a GPS trace" empty state. It ships *without seed
  data*, not without function.

### Counts by severity

| Severity | Count | Items |
|----------|-------|-------|
| **P0 — launch-blocker** | 4 | Stripe price-ID mismatch, weather cron unscheduled, Sparrow email unconfigured, placeholder integration secrets |
| **P1 — pre-scale** | 3 | Open-Meteo non-commercial tier, forum ghost-town risk, 3D viewer scope-vs-payoff |
| **P2 — should-do** | 4 | Pricing page omits weather (the Pro wedge), stale "stubbed" docs, trips low pre-launch payoff, 3D UI-only Pro gate |
| **P3 — future** | 2 | Single hardcoded admin ID, watchlist has no dedicated surface |

### Must-work-for-launch checklist (credible launch)

1. **Stripe checkout succeeds end-to-end** — `STRIPE_PRICE_ID` in Railway must be a `price_...` ID, not a `prod_...` product ID. (Currently a product ID per hub intel → checkout throws "No such price"; **no revenue path**.)
2. **Weather refresh cron scheduled** — hit `POST /api/webhooks/weather` 4×/day. Weather is the Pro wedge; without cron, forecasts decay to stale within a day.
3. **Sparrow email configured in Railway** (`SPARROW_URL`, `SPARROW_API_KEY`) — welcome email, newsletter subscribe, and the contact form all silently no-op without it.
4. **Verify the two placeholder-looking integration secrets** (hub intel) resolve to real values.
5. **Open-Meteo commercial key** — non-commercial tier is a ToS violation the moment a paid subscription exists.

Everything below #5 is deferrable without damaging a credible launch.

---

## Findings (severity-ordered)

### Finding E1: Stripe checkout will fail — env holds a product ID, not a price ID
- **Severity:** P0
- **Category:** scope / correctness (config)
- **Evidence:** `src/lib/server/stripe.ts:16` reads `env.STRIPE_PRICE_ID` and passes it directly as
  `line_items: [{ price: priceId }]` (`stripe.ts:22`). Per hub intel, the Railway value is a
  `prod_...` product ID. Stripe's `checkout.sessions.create` requires a `price_...` ID and throws
  `No such price` otherwise. The checkout route (`src/routes/api/checkout/+server.ts:14`) surfaces
  this as a 500 to the user mid-upgrade.
- **Impact:** The *only* web revenue path is dead. Every "Upgrade to Pro" click
  (`pricing/+page.svelte:141`) errors. Silent until someone tries to pay.
- **Recommendation:** Set `STRIPE_PRICE_ID` in Railway to the `$29.99/yr` recurring **price** ID
  (Stripe Dashboard → Product → Pricing → the `price_...` under the product). Do one live test
  checkout before launch. Also fix the stale `.env.example:29` comment context ("currently stubbed").
- **Effort:** S
- **Suggested executor:** Ben (config) + Haiku (verify test checkout)

### Finding E2: Weather refresh cron is not scheduled — the Pro wedge decays day one
- **Severity:** P0
- **Category:** scope / infra
- **Evidence:** `docs/ben.md:77` open checkbox — no cron hits `POST /api/webhooks/weather`.
  `railway.toml` contains only build/deploy config, no cron service. `peak_forecasts` was populated
  once manually (`ben.md:76` checked) but nothing refreshes it. `CURRENT-STATUS.md:118` lists it as a
  Known Issue.
- **Impact:** Weather is the documented Pro upsell wedge and the primary recurring-use hook. Forecasts
  more than ~24h old are worse than useless for a mountaineering audience (safety-relevant). A paying
  user's first Pro experience is stale data.
- **Recommendation:** Add a Railway cron service (or cron-job.org) hitting
  `POST https://saltgoat.co/api/webhooks/weather` with header `x-webhook-secret: <WEBHOOK_SECRET>` at
  00:00/06:00/12:00/18:00 MT. This is a 15-minute setup task, already fully coded server-side.
- **Effort:** S
- **Suggested executor:** Ben (config)

### Finding E3: Production email likely broken — Sparrow not configured in Railway
- **Severity:** P0
- **Category:** scope / infra
- **Evidence:** Hub intel: `SPARROW_URL` missing in Railway. `.env.example:44` documents it. Consumers:
  welcome email + newsletter subscribe fire from `POST /api/webhooks/user-signup` (Supabase DB webhook
  on `profiles` INSERT), and the contact form (`POST /contact` → `sendRaw`). All route through
  `src/lib/server/sparrow.ts`.
- **Impact:** New signups get no welcome email and aren't added to the newsletter list; contact-form
  submissions vanish. All fail silently (no user-visible error), so it looks fine until you check for
  the missing emails.
- **Recommendation:** Set `SPARROW_URL` and `SPARROW_API_KEY` in Railway; send one test signup + one
  test contact submission and confirm delivery. Confirm the Supabase `profiles` INSERT webhook is
  actually registered (per `CLAUDE.md` email section — this is a dashboard config, not code).
- **Effort:** S
- **Suggested executor:** Ben (config)

### Finding E4: Two integration secrets look like placeholders
- **Severity:** P0
- **Category:** scope / infra (config)
- **Evidence:** Hub intel flags two integration secrets in Railway that resemble placeholders rather
  than real values. Cannot verify actual Railway values from source. Candidate blast radius (any
  unset/placeholder secret degrades silently): `WEBHOOK_SECRET` (weather auth),
  `SUPABASE_WEBHOOK_SECRET` (signup webhook auth), `REVENUECAT_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`.
- **Impact:** Depends which two — could mean weather webhook rejects the cron, signup webhook rejects
  Supabase, or subscription webhooks fail to record purchases (user pays, never gets Pro).
- **Recommendation:** Audit all Railway secrets against `.env.example`; replace any placeholder with a
  real value; test each webhook path once. Fold into the pre-launch config pass with E1–E3.
- **Effort:** S
- **Suggested executor:** Ben (config)

### Finding E5: Open-Meteo is on the non-commercial free tier
- **Severity:** P1
- **Category:** scope / legal
- **Evidence:** `docs/ben.md:78` + `CURRENT-STATUS.md:127` — free tier is non-commercial; commercial
  key (~10 EUR/mo) required. Weather is gated behind a paid ($29.99/yr) Pro plan.
- **Impact:** Charging for a feature built on a non-commercial-only data source is a ToS violation and
  a (small but real) legal/vendor-cutoff risk. Not user-visible, but it undermines the paid product.
- **Recommendation:** Buy the commercial key before enabling paid Pro subscriptions. Cheap insurance.
- **Effort:** S
- **Suggested executor:** Ben (config)

### Finding E6: Forum is fully built but will be an empty ghost town at launch
- **Severity:** P1
- **Category:** scope
- **Evidence:** 7 tables (`forum_*`), 11 server submodules (~1,100 LOC — `src/lib/server/forum/`),
  15 components (`src/lib/components/forum/`), 5 routes (`src/routes/community/*`), full-text search
  (`search.ts`), reactions, bookmarks, view tracking, mentions, and a 641-line spec (`docs/forum.md`).
  Linked prominently in the primary nav (`Header.svelte:33`). Fully free by design
  (`forum.md`: "Community is the growth engine").
- **Impact:** An empty forum front-and-center in the nav is the single strongest "this app is dead"
  signal a first visitor can get. For a solo owner it is also an unbounded moderation/spam surface
  (`content_flags`, admin moderation queue) the moment it gets any traffic — real liability, zero
  payoff until there's a critical mass of posters. This is the largest single scope investment in the
  app relative to its pre-launch value.
- **Recommendation:** **KEEP the code, but do not launch it cold.** Either (a) seed 15–30 genuine
  topics/replies across the 6 categories before launch so it reads as alive, or (b) soft-hide it —
  demote from primary nav to footer until there's a user base, keeping routes reachable. Do **not**
  cut it (it's the intended growth engine and already paid-for), but a cold empty forum in the nav is
  net-negative at zero users. Recommend **(a) seed + keep in nav** if the owner will invest a few
  hours of content; otherwise **(b) hide-behind-nav-demotion**.
- **Effort:** M (seeding) or S (nav demotion)
- **Suggested executor:** Ben (content) or Sonnet (nav change)

### Finding E7: 3D terrain viewer — 1,185 LOC that renders nothing at launch
- **Severity:** P1
- **Category:** scope / perf
- **Evidence:** `TerrainViewer3D.svelte` (934 LOC) + `CameraControls.svelte` (251 LOC), plus
  MapTiler dependency and `PUBLIC_MAPTILER_API_KEY`. It renders only when `activeGeometry` exists
  (`TrailMapSection.svelte:113-121`): official `routes.trail_geometry` (empty —
  `20241230140000_remove_bad_gpx_data.sql` wiped it) OR a community-uploaded trace (zero at launch,
  no users). So at launch **every** route page shows the "No trail data yet" empty state and the 3D
  toggle never appears (`TrailMapSection.svelte:195` gates the toggle on `webglSupported` AND the
  whole section on `hasTrail`). The 3D flythrough / weather-overlay / community-trace-overlay Pro
  features (`TerrainViewer3D.svelte:416,430,497`) are unreachable with no geometry.
- **Impact:** ~1.2k LOC of high-complexity WebGL/MapTiler code (churny per repo-map, a maintenance and
  bundle cost) with **zero rendered output at launch**. It's not broken — it's dormant pending data
  that only arrives after users start uploading GPX.
- **Recommendation:** **DEFER the 3D toggle, keep the 2D path.** 2D `TrailMap` + `ElevationProfile`
  is the honest launch experience once traces exist. Options, cheapest first: (a) leave as-is — it
  self-hides, costs nothing at runtime until data exists (acceptable); (b) if trimming bundle/MapTiler
  spend matters, feature-flag the 3D import off until you have traces. Do **not** invest more in 3D
  pre-launch. The higher-value move is seeding `routes.trail_geometry` with real CalTopo GPX for a
  handful of popular routes (`docs/gpx-import-guide.md`, `ben.md:86-87` open) so the map shows
  *something* — but that's a growth task, not a blocker.
- **Effort:** S (flag) / M (seed real GPX)
- **Suggested executor:** Sonnet (flag) or Ben (GPX sourcing)

### Finding E8: Pricing page never mentions weather — the actual Pro wedge is unadvertised
- **Severity:** P2
- **Category:** scope / growth (Pro-gating coherence)
- **Evidence:** `pricing/+page.svelte` Pro feature list (lines 24-30): "Unlimited summit logging,
  Advanced stats dashboard, Export summit history, Pro badge." **No mention of weather/forecast**
  (grep for "weather"/"forecast" in the page returns nothing). Yet the full mountain-grade forecast
  *is* the most-enforced Pro gate in code (`peaks/[slug]/weather/+page.server.ts:74` ships only a
  stripped `toFreeForecast` to non-Pro). The **free** column even lists "Trail reports & conditions"
  (`pricing/+page.svelte:20`), implying weather is free.
- **Impact:** The single feature most likely to justify $29.99/yr to a 14er hiker (safety-relevant,
  recurring, elevation-banded forecasts) is invisible on the one page whose job is to sell Pro. This
  is a coherence gap between what's *enforced* and what's *marketed*, and it directly suppresses
  conversion.
- **Recommendation:** Add weather to the Pro list ("Full mountain weather: 3 elevation bands,
  sub-daily, hiker insights") and reword the free "conditions" line so it doesn't imply the full
  forecast is free. Lead with weather — it's the wedge.
- **Effort:** S
- **Suggested executor:** Sonnet (copy + layout)

### Finding E9: Stale docs claim Stripe/web-payments are stubbed — they're fully built
- **Severity:** P2
- **Category:** scope / quality (docs)
- **Evidence:** `stripe.ts` is a complete real integration (checkout `10-29`, portal `31-43`,
  signature verify `45-58`), wired through `api/checkout`, `api/portal`, and a fully-handled
  `api/webhooks/stripe/+server.ts` (checkout.completed → upsert Pro, subscription.updated/deleted,
  invoice.payment_failed). Yet `CLAUDE.md` ("Stripe integration is stubbed"), `CURRENT-STATUS.md:124`
  ("Stripe integration stubbed"), and `.env.example:27` ("currently stubbed") all say otherwise.
- **Impact:** The owner may under-invest in the *actual* blocker (E1 config) because the docs imply
  the whole thing is unbuilt. Misdirects launch prioritization.
- **Recommendation:** Update the three docs to "implemented; requires correct `STRIPE_PRICE_ID` +
  webhook registration." Cross-link E1.
- **Effort:** S
- **Suggested executor:** Haiku (mechanical doc edit)

### Finding E10: Planned trips — fully built, near-zero payoff pre-users
- **Severity:** P2
- **Category:** scope
- **Evidence:** `trips.ts` (345 LOC, full CRUD), profile "Trips" tab (`profile/+page.svelte:65,573`),
  `CreateTripModal.svelte`, public shareable trip view (`routes/trips/[id]/`), `planned_trips` +
  `planned_trip_peaks` tables. Complete and self-contained.
- **Impact:** Low maintenance burden (isolated, no external deps) but a single-user planning tool has
  little value and no network effect at zero users. Not harmful, just non-load-bearing.
- **Recommendation:** **KEEP** (low cost, already done, harmless). Don't feature it in
  onboarding/marketing pre-launch; it's a nice-to-have that earns its keep only once users have logged
  summits and want to plan the next. No action required beyond not prioritizing it.
- **Effort:** —
- **Suggested executor:** —

### Finding E11: 3D-map Pro features are gated UI-only (minor, low-value bypass)
- **Severity:** P2
- **Category:** scope / correctness (Pro-gating coherence)
- **Evidence:** Flythrough, community-trace overlay, and weather-overlay in the 3D viewer are gated
  purely client-side (`TerrainViewer3D.svelte:416,430,497`; `CameraControls.svelte` "(Pro)" labels).
  The route load (`peaks/[slug]/[route]/+page.server.ts`) passes `allTraces` and `forecast` to the
  page regardless of Pro status; the `uploadTrace`/`voteTrace` form actions check login but not Pro
  (by design — trace upload is free). So a determined non-Pro user could unlock 3D toggles via
  client tampering over data already in the payload.
- **Impact:** Low. These are presentation toggles over already-fetched, largely non-sensitive data
  (community traces are public; trailhead forecast is low-res). No privileged endpoint is exposed.
  Unlike summit-limit / export / weather-tier (all correctly enforced server-side), this is the one
  Pro gate that lives only in the client — but it protects the least valuable thing.
- **Recommendation:** Accept for launch. If you later monetize 3D seriously, move the overlay-data
  fetch behind a Pro server check. Not worth engineering pre-launch. Note the *core* gates
  (E-summit-limit, E-export, E-weather) are all server-authoritative — this is the sole exception and
  it's benign.
- **Effort:** S (if ever)
- **Suggested executor:** Sonnet (deferred)

### Finding E12: Single hardcoded admin ID; watchlist has no dedicated surface
- **Severity:** P3
- **Category:** scope / quality
- **Evidence:** `src/lib/server/admin.ts:5` — `ADMIN_USER_ID = 'c983d602-...'`, a single hardcoded
  UUID; admins are treated as Pro across weather/route pages. Fine for a solo owner, but not
  multi-admin and not env-driven. Separately, watchlist (`watchlist.ts`) is surfaced only as an
  add/remove toggle on peak pages + a list in the profile Overview (`profile/+page.svelte:353`), with
  no dedicated tab/route — minor discoverability gap.
- **Impact:** Negligible pre-launch. The admin ID is a future scaling papercut (adding a second admin
  = code change + deploy). Watchlist is fully functional, just quietly placed.
- **Recommendation:** Leave both. If/when a second admin is needed, move to an env allowlist or an
  `is_admin` column. No launch action.
- **Effort:** S (future)
- **Suggested executor:** Haiku (future)

---

## Scope verdict (bottom line)

For a solo pre-launch app, the codebase is **over-complete, not under-complete**. There is essentially
no half-built code and almost no dead code — the "half-built" items from the brief (Stripe, GPX/3D)
are actually finished and either mis-documented (Stripe) or gracefully data-gated (trail maps). The
genuine risk is that **~2,300+ LOC of forum + 3D-terrain machinery ships to an audience of zero**,
carrying maintenance, bundle, moderation, and "dead app" perception costs with no offsetting value
until there is a user base.

**Keep / defer / cut calls:**
- **Forum** → **KEEP the code, but seed it or demote it from primary nav.** A cold empty forum in the
  header is the sharpest single scope mistake at launch. (Sharpest call in this audit.)
- **3D terrain viewer** → **DEFER** (self-hides with no data; don't invest further; consider
  flagging the import off to trim MapTiler/bundle). 2D map is the launch experience.
- **GPX trace upload/vote** → **KEEP** (it's the mechanism that eventually feeds the maps; graceful).
- **Planned trips** → **KEEP** (harmless, done) but don't feature it.
- **Watchlist** → **KEEP** (tiny).
- **Cut nothing** — everything is built; deleting working code is wasted prior effort. The lever is
  *what to put in front of a first-time visitor*, not what to delete.

The four P0s are all **outside the app code** (Stripe price ID, weather cron, Sparrow email,
placeholder secrets). The app is more ready than its configuration. Fix the config, seed-or-demote
the forum, and put weather on the pricing page — that's a credible launch.

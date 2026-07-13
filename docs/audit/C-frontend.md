# C — Web Frontend Quality & Performance

**Domain:** Web app only (SvelteKit 5 runes + Tailwind 3). **Auditor:** Opus. **Date:** 2026-07-13.
**Method:** `npm run check` (svelte-check), `npm run build` (real `.env` present), targeted reads of the
curated hotspots + adjacencies, git archaeology on the type-drift root cause.

---

## Executive Summary

**Overall domain health: GOOD, with one embarrassing-but-trivial root-cause defect.**

The frontend is in better shape than the raw error count suggests. Of **101 svelte-check errors / 69
warnings**, **68 errors (67%) trace to a single corrupted file** (`src/lib/types/database.ts`) and
evaporate with a two-line fix. The map stack — flagged as redundant bloat — is actually **correctly
lazy-loaded** and never touches the initial bundle. The "form components carry the most errors" claim is a
mis-read: those files have **zero blocking type errors**, only reactivity/a11y *warnings*, most of which
are benign-by-design. Real, genuine type errors after the root-cause fix number **~33**, almost all
low-severity (implicit-any callbacks, a few unsafe casts, one nullable mismatch).

Code-splitting hygiene is a genuine strength. The main debt is (1) the type-generation workflow that keeps
re-breaking the barrel, (2) a handful of oversized page components, and (3) a11y label associations.

**Counts by severity:**

| Severity | Count | Summary |
|----------|-------|---------|
| **P0** | 0 | No launch-blockers. |
| **P1** | 2 | Type-system root-cause fix; document/guard the regen workflow. |
| **P2** | 5 | Real reactivity bug on route nav, genuine type errors, a11y labels, ReloadPrompt types, giant-component split. |
| **P3** | 3 | Map-library consolidation, image lazy-loading coverage, `console.*` hygiene. |

The single highest-leverage action clears 67% of the error count in ~5 minutes.

---

## Findings (severity-ordered)

### Finding C1: `src/lib/types/database.ts` is corrupted — barrel overwritten + CLI prose leaked in (root cause of 68 of 101 errors)

- **Severity:** P1 (pre-scale; not a runtime blocker because `svelte-check` is advisory, but it poisons
  type safety across the app and hides real errors in the noise)
- **Category:** correctness / quality
- **Evidence:**
  - `src/lib/types/database.ts:1566-1567` contains two lines of English prose:
    `A new version of Supabase CLI is available: v2.90.0 (currently installed v2.72.7)` /
    `We recommend updating regularly...`. TypeScript parses this as code, producing **all 38 errors in
    the file**: `Cannot find name 'v2'`, `Cannot find name 'Supabase'`, `Cannot find name 'CLI'`,
    `A type predicate is only allowed in return type position` (from "CLI **is** available"), etc.
  - `git log -p -1 -- src/lib/types/database.ts` (commit `46f8188`) shows the change **deleted** the two
    lines that made this file a barrel:
    ```
    -export * from '@saltgoat/shared/types/database';
    -export * from '@saltgoat/shared/types/helpers';
    ```
    Someone ran the documented command `supabase gen types typescript --project-id ... > src/lib/types/database.ts`
    (CLAUDE.md, Stack section), which **overwrote the barrel with raw generated output** and captured the
    CLI's update notice into the file.
  - Because the `helpers` re-export was destroyed, **30 downstream `Module '$lib/types/database' has no
    exported member` errors** appear for domain types that live in `packages/shared/src/types/helpers.ts`:
    `ForecastResponse` (6), `DayForecast` (6), `PeriodForecast` (4), `ElevationBandForecast` (4), `Route`
    (3), `PeakWithStandardRoute` (2), `Peak` (2), `PeakWithRoutes` (1), `PeakForecastRow` (1),
    `HikerInsight` (1). All are confirmed exported by `helpers.ts` (verified).
  - The clean shared copy (`packages/shared/src/types/database.ts`) has **no prose**, but is now **stale**
    — it is missing `contact_submissions` (and possibly other newer tables) that the corrupted lib copy has.
- **Impact:** 68 of 101 errors are noise from this one file. It also means the whole app currently gets
  degraded IDE/type checking on Supabase rows. Every future `supabase gen types` run per the documented
  command will re-break it.
- **Recommendation (the fix — do this first):**
  1. Regenerate **into the shared package**, stripping stderr:
     `supabase gen types typescript --project-id seywnbufuewbiwoouwkk 2>/dev/null > packages/shared/src/types/database.ts`
  2. Restore `src/lib/types/database.ts` to the two-line barrel:
     ```ts
     export * from '@saltgoat/shared/types/database';
     export * from '@saltgoat/shared/types/helpers';
     ```
  3. **Fix the CLAUDE.md command** so this cannot recur — point it at the shared file and redirect stderr:
     `supabase gen types typescript --project-id seywnbufuewbiwoouwkk 2>/dev/null > packages/shared/src/types/database.ts`
- **Estimated resolution:** **68 of 101 errors clear** (38 parse errors in the file + 30 no-exported-member
  downstream). Remaining ≈33 are genuine (see C3). Recount after the fix.
- **Effort:** S
- **Suggested executor:** Haiku (mechanical) — but verify the regen includes all current tables.

---

### Finding C2: Type-generation workflow has no guardrail — the barrel breakage is a repeat hazard

- **Severity:** P1 (pre-scale)
- **Category:** quality / DX
- **Evidence:** The documented command in CLAUDE.md writes raw generated output directly over the
  hand-maintained barrel at `src/lib/types/database.ts`. There is no `2>/dev/null`, and the target is the
  barrel rather than the shared source of truth. This is the exact mechanism that caused C1.
- **Impact:** Any contributor (or agent) following the documented workflow silently re-corrupts type safety
  and re-introduces ~68 errors.
- **Recommendation:** Fix the CLAUDE.md command (see C1.3). Optionally add an npm script,
  `"gen:types": "supabase gen types typescript --project-id seywnbufuewbiwoouwkk 2>/dev/null > packages/shared/src/types/database.ts"`,
  so nobody hand-types the redirect. Consider a CI/`check` gate so a corrupted regen fails loudly.
- **Effort:** S
- **Suggested executor:** Sonnet.

---

### Finding C3: ~33 genuine type errors remain after the root-cause fix — mostly implicit-any and unsafe casts

- **Severity:** P2 (should-do)
- **Category:** correctness / quality
- **Evidence (representative):**
  - Implicit-any callback params — `src/routes/peaks/[slug]/+page.svelte:34` (`peak.routes?.find((r) => ...)`),
    `:534` (`.sort((a, b) => ...)`); `src/lib/components/pwa/ReloadPrompt.svelte` (4×).
  - Unsafe casts flagged as non-overlapping — `src/routes/users/[id]/+page.svelte:153-154`
    (`summit.peak as {...}` where the source is an array).
  - Nullable mismatch — `src/routes/profile/+page.svelte:292`: `UserAchievementWithDef[]` → `EarnedAchievement[]`
    fails because `earned_at: string | null` is not assignable to `earned_at: string`. (Real: the
    `EarnedAchievement` type or the mapping needs to tolerate null.)
  - Design-system type gap — `src/routes/peaks/[slug]/[route]/+page.svelte:160` and
    `src/lib/components/ui/Badge.svelte`: `variant="class-{route.difficulty_class}"` produces
    ``class-${any}`` which is not assignable to the `Badge` variant union. (Real: `difficulty_class` is a
    number; the template literal loses the literal type.)
  - `src/lib/components/pwa/ReloadPrompt.svelte`: `Cannot find module 'virtual:pwa-register/svelte'` — the
    vite-plugin-pwa virtual-module types aren't referenced in the check tsconfig.
- **Impact:** Individually minor, but they mask regressions and keep `check` non-green. None are runtime
  bugs today.
- **Recommendation:** After C1, do a focused pass: annotate callback params (`(r: Route) => ...`), fix the
  `EarnedAchievement.earned_at` nullability at the type or mapping site, coerce the Badge variant
  (`variant={\`class-\${route.difficulty_class}\` as BadgeVariant}` or a lookup), add
  `/// <reference types="vite-plugin-pwa/svelte" />` (or add it to `app.d.ts`) for the PWA virtual module,
  and replace the `users/[id]` array-casts with proper single-object mapping. Target: green `check`.
- **Effort:** M
- **Suggested executor:** Sonnet.

---

### Finding C4: One real reactivity bug — route detail page destructures `data` once (stale on client-side nav)

- **Severity:** P2 (should-do; narrow trigger)
- **Category:** correctness (Svelte 5 runes)
- **Evidence:** `src/routes/peaks/[slug]/[route]/+page.svelte:17` —
  `const { peak, route } = data;` destructures the load `data` a single time and uses `peak`/`route`
  read-only throughout. There is **no `$derived` and no re-sync `$effect`** in the file. svelte-check flags
  it: `This reference only captures the initial value of 'data'`.
- **Impact:** On client-side navigation between two route pages (SvelteKit reuses the component instance and
  updates `data` via invalidation), the page keeps rendering the **previous** peak/route. Fresh loads are
  fine, so it's easy to miss in dev but wrong in real browsing (e.g. following related-route links).
- **Recommendation:** Replace with `const peak = $derived(data.peak); const route = $derived(data.route);`.
- **Effort:** S
- **Suggested executor:** Haiku.

#### Sub-analysis: the other 30+ `state_referenced_locally` warnings are mostly BENIGN

Classified all reactivity warnings:

- **Benign — infinite-scroll with correct re-sync `$effect`:** `routes/community/[category]/+page.svelte`
  (lines 18-22) and `routes/community/[category]/[topic]/+page.svelte`. These use `$state(data.x)` for
  locally-mutated lists (append-on-scroll) **and** have an explicit `$effect(() => { topics = data.topics; ... })`
  reset block (`[category]/+page.svelte:24-29`). This is the *recommended* Svelte 5 pattern for
  "reset-on-nav + locally-mutable." Warning is unavoidable noise here.
- **Benign — editable form state seeded from props:** `EditProfileModal.svelte` (12 warnings on `profile`)
  has an `$effect` that re-seeds every field when `open`/`profile` changes (`:41+`); `ReviewForm.svelte`
  (7 warnings on `existingReview`) is a remount-per-open modal. You *want* local editable copies here, not
  `$derived` (which would be read-only and clobber typing). Intentional.
- **Benign — re-sync present:** `routes/admin/users/+page.svelte:12` has `$effect(() => { searchInput = data.search; })` on the next line.
- **Low-risk:** `routes/profile/+page.svelte:31` (`isPublic` toggle, single-instance page) and
  `routes/community/search/+page.svelte:14-15` (search inputs, no re-sync) — could go stale on programmatic
  nav but are user-driven; cosmetic.
- **Verdict:** Only **C4 is a real bug.** The rest are correct patterns that trip a conservative linter.
  Not worth chasing to zero; fix C4 and optionally suppress the rest with a comment where the pattern is
  deliberate.

---

### Finding C5: Accessibility — 17 unassociated form labels + missing button aria-labels

- **Severity:** P2 (should-do; pre-launch polish)
- **Category:** ux / a11y
- **Evidence (warnings):** `A form label must be associated with a control` — `TrailReportForm.svelte` (9),
  `EditProfileModal.svelte` (2), `ReviewForm.svelte` (2), `CreateTripModal.svelte` (2), + others (17
  total). `Buttons/links should have text or aria-label` — `TrailReportForm` (1), `CreateTripModal` (3),
  others (6 total). `CreateTripModal.svelte`: dialog role missing `tabindex`; a non-interactive element
  with a click handler lacks a keyboard handler.
- **Impact:** Screen-reader users can't reliably associate labels with inputs; icon-only buttons are
  unlabelled. Also a mild SEO/quality signal. No functional break for mouse users.
- **Recommendation:** Add `for`/`id` pairs (or wrap inputs in `<label>`), add `aria-label` to icon buttons,
  give the modal dialog `tabindex="-1"` and proper keyboard handling. Mechanical.
- **Effort:** M
- **Suggested executor:** Haiku.

---

### Finding C6: Giant page/component files should be decomposed (maintainability, not perf)

- **Severity:** P2 (should-do)
- **Category:** quality
- **Evidence (LOC):** `map/TerrainViewer3D.svelte` 934 · `routes/peaks/[slug]/+page.svelte` 756 ·
  `map/PeakMap.svelte` 753 · `routes/+page.svelte` (home) 624 · `map/TrailMap.svelte` 617 ·
  `routes/profile/+page.svelte` 604 · `profile/EditProfileModal.svelte` 595 · `profile/ActivityFeed.svelte` 545.
- **Assessment / priority to split:**
  - **`routes/peaks/[slug]/+page.svelte` (756) — highest value.** Also the highest-churn file in the repo
    (14 changes) and one carrying inline implicit-any errors. It bundles hero, quick-facts, routes list,
    reviews, weather card, trail reports, and gallery into one file. Extract section components
    (`PeakRoutesSection`, `PeakReviewsSection`, etc.); several sub-components already exist to lean on.
    Churn + size = the clearest split candidate.
  - **`routes/profile/+page.svelte` (604) — high value.** Declares 30+ `$derived` slices of `data` and
    hosts 4 tabs (activity/photos/trips/buddies). Split per-tab panels; 11 prior changes = active surface.
  - **`routes/+page.svelte` (home, 624) — medium.** Long but mostly static marketing sections; lower churn.
    Split for readability, not urgency.
  - **`map/TerrainViewer3D.svelte` (934) & map components — leave as-is for now.** They're genuinely complex
    (maplibre lifecycle, camera, waypoints) and already lazy-loaded (see C7). Splitting risks the imperative
    map lifecycle for little gain. Refactor only if actively worked on.
- **Impact:** Faster iteration and fewer merge conflicts on the two highest-churn pages. No bundle/runtime
  impact (SvelteKit already code-splits per route).
- **Recommendation:** Decompose `peaks/[slug]` and `profile` into section components; defer the rest.
- **Effort:** L
- **Suggested executor:** Sonnet.

---

### Finding C7: Map stack — leaflet + maplibre-gl are both used, both lazy-loaded (HEALTHY); consolidation is optional

- **Severity:** P3 (future)
- **Category:** perf / quality
- **Evidence:**
  - `package.json`: `leaflet ^1.9.4`, `@types/leaflet ^1.9.21`, `maplibre-gl ^5.21.1`.
  - **Distinct roles, not redundant runtime:** leaflet → 2D maps (`PeakMap.svelte`, `TrailMap.svelte`);
    maplibre-gl → 3D terrain only (`TerrainViewer3D.svelte`, `flythrough.ts`, `terrain-styles.ts`). No
    `three.js`.
  - **Both are correctly code-split (the key point):**
    - maplibre: `TerrainViewer3D.svelte:165` `maplibregl = await import('maplibre-gl')` — and the component
      itself is dynamically imported by `TrailMapSection.svelte:163` (`await import('./TerrainViewer3D.svelte')`).
    - leaflet: `PeakMap.svelte:201` / `TrailMap.svelte:166` `L = await import('leaflet')`; `PeakMap` is
      loaded via `{#await import('$lib/components/map/PeakMap.svelte')}` at `routes/peaks/[slug]/+page.svelte:600`
      and `routes/map/+page.svelte:188`.
  - **Bundle cost (measured, gzip):** maplibre chunk `DySy8QIS.js` = **1,024 KB raw / 276 KB gzip** (by far
    the largest client asset); leaflet chunk `CfjJtsmX.js` = **146 KB raw / 42.5 KB gzip**. Neither is in the
    initial/entry bundle — they load only when the user opens a map/terrain view.
- **Impact:** Because both are lazy, the initial-load cost is **zero**. The only real cost of keeping two
  libs is maintenance + duplicated tile/marker logic. Dropping leaflet (migrating PeakMap/TrailMap to
  maplibre's 2D mode) removes `leaflet` + `@types/leaflet` (~42 KB gzip on those map pages, plus one fewer
  dependency), but requires rewriting two mature components against a different API.
- **Recommendation:** **Do NOT treat as a launch item.** Optionally consolidate onto maplibre-gl post-launch
  to shed a dependency and unify the map layer; measure whether the 2D pages actually get lighter (maplibre
  is heavier per-instance than leaflet, so the *2D-page* payload could grow even as the dep count drops).
  Net: low priority.
- **Effort:** L (if pursued)
- **Suggested executor:** Sonnet (or defer).

---

### Finding C8: Image lazy-loading is good in key components but not universal

- **Severity:** P3 (future)
- **Category:** perf
- **Evidence:** Only ~6 of 25 files with `<img>` use `loading="lazy"`. The important ones are done right:
  `PeakCard.svelte:50` has `loading="lazy"` + explicit `width`/`height` (no CLS) + descriptive `alt`. Peak
  hero images are optimized static JPEGs served from `static/images/peaks/` (per CLAUDE.md), not Supabase —
  good for LCP.
- **Impact:** Minor. A few below-the-fold images (galleries, admin) may eager-load, and some may lack
  intrinsic dimensions (CLS risk).
- **Recommendation:** Audit remaining `<img>` for `loading="lazy"` + `width`/`height` on below-the-fold
  images. Low priority given the hero/card path is already handled.
- **Effort:** S
- **Suggested executor:** Haiku.

---

## Loading / SSR / Build health (healthy areas, noted honestly)

- **Build passes cleanly** with the real `.env` (`✓ built in 6.92s`, adapter-node). The repo-map's build
  failure was purely the missing `.env` — confirmed environmental, not a code defect.
- **Code-splitting is a genuine strength.** Per-route nodes are small (largest route node ~110 KB raw);
  the heavy libs (maplibre, leaflet) are dynamically imported and isolated. Total client JS is ~2.4 MB raw
  across all chunks, but **no single page ships anywhere near that** — the 276 KB-gzip maplibre chunk only
  loads on explicit 3D-terrain interaction.
- **PWA/service worker** builds (129 precache entries, 6.5 MB — dominated by peak images, expected). The
  glob warning is the known-harmless one noted in CLAUDE.md.
- **`console.*` hygiene:** ~100 `console.*` calls across `src/` (per repo-map) — no structured logger. A
  quality/observability nit shared with Domain B; strip or gate client-side ones before launch. (P3.)

---

## Answers to the brief's key questions

1. **Root cause of the 38 database.ts errors + type drift:** A single corrupted file. Commit `46f8188`
   overwrote the 2-line re-export **barrel** at `src/lib/types/database.ts` with raw `supabase gen types`
   output, which (a) destroyed the `@saltgoat/shared/types/helpers` re-export → 30 `no exported member`
   errors, and (b) leaked the Supabase CLI update notice into the file → 38 parse errors. **Fix = regen into
   the shared package (with `2>/dev/null`) + restore the 2-line barrel + fix the CLAUDE.md command.**
   **68 of 101 errors resolve.**
2. **Reactivity bugs:** Exactly **one real bug** — `routes/peaks/[slug]/[route]/+page.svelte:17`
   (`const { peak, route } = data`, no `$derived`/re-sync → stale on client nav). The community/admin/form
   warnings are benign correct patterns (re-sync `$effect` present, or intentional editable form state).
3. **Form components:** They carry the most *warnings*, **not errors** — zero blocking type errors. The bulk
   is benign `state_referenced_locally` (editable state seeded from props, with re-sync effects) plus
   fixable a11y label associations (C5).
4. **Map stack:** Both libs are needed for distinct roles (2D vs 3D) and — critically — **both are
   lazy-loaded**, so neither affects initial load. maplibre = 276 KB gzip, leaflet = 42.5 KB gzip, each
   loaded on demand. Consolidation onto maplibre is a post-launch nicety, not a fix.
5. **Component splitting:** Prioritize `routes/peaks/[slug]/+page.svelte` (756 LOC, highest churn) and
   `routes/profile/+page.svelte` (604). Leave the map components (already lazy + inherently complex).
6. **Perf/bundle:** Largest client chunk = maplibre 1,024 KB raw / 276 KB gzip (lazy). Total client JS
   ~2.4 MB raw but well code-split; no page ships it all. Build is healthy.

---

## Recommended execution order

1. **C1** (S, Haiku) — fix `database.ts` barrel + regen. Clears 67% of errors. *Highest leverage.*
2. **C2** (S, Sonnet) — fix the CLAUDE.md/npm regen command so C1 can't recur.
3. **C4** (S, Haiku) — one-line `$derived` fix for the route-page stale-nav bug.
4. **C3** (M, Sonnet) — clean up the ~33 remaining genuine type errors → green `check`.
5. **C5** (M, Haiku) — a11y label associations.
6. **C6** (L, Sonnet) — split `peaks/[slug]` and `profile` pages.
7. **C7/C8** (P3) — defer map consolidation and image-lazy audit to post-launch.

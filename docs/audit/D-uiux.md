# D — UI/UX Audit

**Auditor:** Opus/Sonnet (Domain D) · **Date:** 2026-07-13 · **Scope:** WEB APP ONLY (mobile/ excluded)
**Context:** Pre-launch, no live users. Owner optimizing for a polished launch.
**Method:** Code review of home/auth/pricing/layout/header/footer/peaks/profile/SummitModal + design tokens,
**plus live-site browsing** of https://saltgoat.co (desktop 1280px and mobile 375px, light + dark theme,
console/network inspection). Browser automation was intermittently unresponsive early in the session but
recovered — all live-site findings below are from actual rendered pages, not guesses.

---

## Executive Summary

**Overall UX verdict: GOOD FOUNDATION, ONE EMBARRASSING LAUNCH-BLOCKER.** The design system is genuinely
strong and consistent — Instrument Serif + Inter, the class-1..4 palette, card/shadow tokens, and dark mode
all render correctly and attractively across every page checked. Empty states are thoughtfully written
(peak reviews, trail reports, new-user profile). The auth flow is clean, with working Google OAuth, a
functioning forgot-password mode switch, and a real error state I triggered and verified live. The single
P0 is that the public Community forum is currently showing live garbage test content ("asdjk asldkj
halsdkfj...") to every visitor — a first-impression credibility problem that must be cleaned up before
anyone else sees it. Beyond that, the main gaps are a monetization page that's essentially undiscoverable
from navigation, a mobile pricing page where the plan name is clipped by the header, and a couple of
rendering hiccups (map tiles, peak rank ordering) that undercut the otherwise polished feel.

**Findings by severity:** P0: 1 · P1: 4 · P2: 4 · P3: 3

| # | Severity | Title |
|---|----------|-------|
| D1 | P0 | Live garbage test content publicly visible on /community |
| D2 | P1 | /pricing is unreachable from primary nav or footer — no discoverable path to conversion |
| D3 | P1 | Mobile pricing page: "SaltGoat Pro" heading clipped under fixed header on scroll |
| D4 | P1 | /map renders broken (narrow tile strip, scattered markers) for ~2s on load |
| D5 | P1 | Peak rank numbers display out of sequence on /peaks (data/tie-break bug) |
| D6 | P2 | Service worker registration 404s on every page load (console noise) |
| D7 | P2 | No automatic onboarding after signup — new users land cold |
| D8 | P2 | Auth error messages are raw, unbranded Supabase strings |
| D9 | P2 | SummitModal: Escape-to-close likely doesn't work (backdrop not focusable) |
| D10 | P3 | Leaderboard/activity feed currently shows only founder's own test/seed data |
| D11 | P3 | Home page has no social-proof fallback for the current all-zero-users state |
| D12 | P3 | Google OAuth button lacks visual distinction in dark mode (low-contrast border) |

**Live-site vs. code observations:** Every finding below is tagged with its evidence source. D1, D3, D4, D5,
D6 were confirmed by directly browsing the live production site (screenshots, console logs, rendered DOM
text). D2, D7, D8, D9, D11, D12 are corroborated by source code plus live-page checks. D10 is from live data
only.

---

## Findings

### Finding D1: Live garbage test content publicly visible on /community
- **Severity:** P0 (launch-blocker)
- **Category:** ux / content hygiene
- **Evidence:** Live at `https://saltgoat.co/community`, "Recent" section, first item:
  - Author: "Anonymous Hiker" (fallback display name — confirmed via `src/lib/components/forum/ForumAuthorInfo.svelte:36`, `{author.display_name || 'Anonymous Hiker'}` — this is a real account with no display name, not a stub)
  - Title: "I love mountains"
  - Body: `asdjk asldkj halsdkfj halsdkjfh alskdjfh alksdjfh laksjdf hlakjsdf laksjdfh asd`
  - Tagged to Blanca Peak, showing "1" reply / "1" reaction
  - This is the *first piece of content* a logged-out visitor sees when clicking "Community" in the primary nav.
- **Impact:** Any visitor — press, early users, investors — who clicks Community during the pre-launch window
  sees literal keyboard-mash test content as the top post. This instantly signals "this site isn't ready,"
  undermining the otherwise polished first impression from the homepage.
- **Recommendation:** Delete/moderate all test topics and replies from the forum tables before any public
  traffic. Consider a pre-launch checklist item to audit all UGC tables (`forum_topics`, `forum_replies`,
  `user_reviews`, `trail_reports`, `user_summits` for non-owner test accounts) for placeholder content.
- **Effort:** S
- **Suggested executor:** Haiku (mechanical — delete rows) or Ben directly via admin dashboard

### Finding D2: /pricing is unreachable from primary nav or footer
- **Severity:** P1
- **Category:** ux / growth
- **Evidence:**
  - `src/lib/components/layout/Header.svelte:30-38` — `navLinks` array: Peaks, Ranges, Community,
    Leaderboard, Map, Learn, Blog. No Pricing entry (desktop or mobile menu, which reuses the same array).
  - `src/lib/components/layout/Footer.svelte:50-55` — footer links: Guidelines, Terms, Privacy. No Pricing.
  - `grep -rn "pricing" src --include="*.svelte"` shows `/pricing` is linked only from: the pricing page
    itself, `ProUpsellOverlay.svelte` (map Pro gate), `peaks/[slug]/weather/+page.svelte` (weather Pro gate),
    and `profile/+page.svelte` (Advanced Stats teaser, logged-in only).
- **Impact:** A logged-out visitor evaluating whether to sign up has no way to see what Pro costs or
  includes without either guessing the URL or first hitting a paywall inside a gated feature. This is a
  meaningful conversion-funnel gap: the pricing page it built (which is genuinely persuasive, see below)
  is invisible to the audience most likely to convert on it — new visitors comparison-shopping.
- **Recommendation:** Add "Pricing" to the header `navLinks` (or at minimum the footer) so it's one click
  from anywhere on the site.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding D3: Mobile pricing page — "SaltGoat Pro" heading clipped under fixed header
- **Severity:** P1
- **Category:** ux / responsive
- **Evidence:** Live screenshot at 375×812 (mobile preset), scrolled to the natural resting point where the
  Pro card's price ($29.99/year) is centered — the card's `<h2>SaltGoat Pro</h2>` heading (with the
  "Most Popular" badge above it, `src/routes/pricing/+page.svelte:91-96`) is rendered mostly underneath the
  fixed, `backdrop-blur` header (`Header.svelte:66-74`, `fixed top-0 ... z-50`), leaving only a sliver of
  ghosted text visible.
- **Impact:** On mobile — the platform most visitors will land on for a link shared socially — the plan
  name on the app's only monetization page is illegible at a scroll position users will naturally stop at.
  This is a small CSS issue (missing scroll-margin/offset) with outsized impact on the one page that exists
  purely to convert.
- **Recommendation:** Add `scroll-margin-top` (or equivalent top padding) to the pricing cards, or reduce
  the "Most Popular" badge's negative offset so the heading clears the fixed header at common scroll stops.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding D4: /map renders broken for ~2 seconds on initial load
- **Severity:** P1
- **Category:** ux / correctness
- **Evidence:** Live screenshot immediately after navigating to `https://saltgoat.co/map`: map tiles are
  confined to a narrow vertical strip in the center of the container while peak markers (colored triangles)
  are scattered across the full-width gray background outside the loaded tile area. After ~2s (confirmed via
  a follow-up screenshot), it self-corrects to a normal full-width tile layout. Consistent with a known
  Leaflet/MapLibre issue where the map container's size is measured before its parent finishes layout
  (needs an `invalidateSize()`/resize call after mount). Repo map (00-repo-map.md §3.1) already flags two
  map stacks (leaflet + maplibre-gl) bundled — this may be one symptom of that redundancy/complexity.
- **Impact:** The Map feature — one of the app's headline nav items — looks broken on first paint for every
  visitor, every time.
- **Recommendation:** Call the map library's resize/invalidate method after the container mounts and has
  final dimensions (e.g., in `onMount` after a `requestAnimationFrame`, or via a `ResizeObserver`). Worth
  coordinating with the Domain C/B finding about consolidating the two map stacks.
- **Effort:** S–M
- **Suggested executor:** Sonnet

### Finding D5: Peak rank numbers display out of sequence on /peaks
- **Severity:** P1
- **Category:** ux / data correctness
- **Evidence:** Live page text from `https://saltgoat.co/peaks` (default sort: Elevation High to Low).
  Elevations descend correctly, but the `#rank` badges shown per card do not: `#8, #10, #12, #9, #11, #13,
  #14...` and later `#39, #50, #41...`. Concretely, three tied-elevation peaks at 14,197'/14,196' are shown
  in the order Mt. Belford (**#20**), Crestone Needle (**#22**), Mt. Yale (**#21**) — the rank labels are not
  monotonic with the display order even though the underlying elevation sort is correct.
- **Impact:** This is the flagship page of the app (all 58 peaks, the core value prop). A visitor who knows
  Colorado 14ers by rank (many peak-baggers do — "I've done the top 10") will immediately notice the ranks
  look wrong, which erodes trust in the data behind the whole product.
- **Recommendation:** Audit the `peaks.rank` column for correctness/tie-breaking logic (likely a Domain B/E
  data issue — flagging here because it's directly visible in the UI). Either fix the stored rank values or
  derive rank client-side from the sorted elevation list so it's always self-consistent with the currently
  displayed order.
- **Effort:** S (if just a data fix) / M (if tie-break logic needs to change)
- **Suggested executor:** Sonnet (verify against Domain B/E's data findings first)

### Finding D6: Service worker registration 404s on every page load
- **Severity:** P2
- **Category:** quality
- **Evidence:** `read_console_messages` on multiple pages (auth, map) shows repeated:
  `SW registration error: TypeError: Failed to register a ServiceWorker for scope
  ('https://saltgoat.co/peaks/') with script ('https://saltgoat.co/peaks/sw.js'): A bad HTTP response code
  (404)`. This fires on essentially every navigation. CLAUDE.md's Known Issues section already notes "PWA
  glob warning... harmless (ignore)" for the *build-time* warning, but this is a distinct *runtime* console
  error visible to any visitor who opens devtools.
- **Impact:** Functionally harmless (site works fine), but it's a visible red error in the console on every
  page load — a bad look for anyone technical who inspects the site (press, investors, other devs), and
  noise that could mask real errors during debugging.
- **Recommendation:** Either fix the scoped SW registration path (the `/peaks/` scope is requesting a
  `sw.js` that doesn't exist at that path) or remove the extra scoped registration if it's leftover/unused.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding D7: No automatic onboarding after signup — new users land cold
- **Severity:** P2
- **Category:** ux / onboarding
- **Evidence:** `src/routes/auth/+page.svelte` — on successful signup, the only action is showing a "Check
  your email" message (line 57); after email confirmation the user is routed to `redirectTo` (default `/`)
  with no welcome flow, tour, or first-action prompt. The one good onboarding artifact that *does* exist is
  the "Welcome to SaltGoat!" 3-step card (`src/routes/profile/+page.svelte:509-561`) — but it only appears
  if/when a user manually navigates to their (empty) Profile page; nothing surfaces it proactively.
- **Impact:** A brand-new user who signs up and lands on the homepage sees the same marketing page as a
  logged-out visitor (hero, stats, featured peaks) with no clear "what do I do now" moment. The path to the
  "aha" (log a first summit) exists and is well-designed, but nothing points the user to it.
- **Recommendation:** After first login/signup, redirect to `/profile` (where the good empty state already
  lives) instead of `/`, or add a one-time toast/banner on the homepage for new users pointing at "Find a
  peak → Log your first summit."
- **Effort:** S–M
- **Suggested executor:** Sonnet

### Finding D8: Auth error messages are raw, unbranded Supabase strings
- **Severity:** P2
- **Category:** ux / polish
- **Evidence:** Live-tested: submitting a bad login on `/auth` renders "Invalid login credentials" exactly
  as returned by `supabase.auth.signInWithPassword` (`src/routes/auth/+page.svelte:40-41`,
  `error = authError.message` with no mapping/friendliness layer).
- **Impact:** Minor — the error is clear and functional (verified working, not broken), just generic and
  slightly technical-sounding rather than on-brand copy.
- **Recommendation:** Add a small message map for the handful of common Supabase auth error codes
  (invalid credentials, rate-limited, email not confirmed) to friendlier copy. Low priority.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding D9: SummitModal — Escape-to-close likely non-functional via keyboard
- **Severity:** P2
- **Category:** accessibility
- **Evidence:** `src/lib/components/summit/SummitModal.svelte:122-129` — the backdrop `<div>` has
  `onkeydown={(e) => e.key === 'Escape' && handleClose()}` but also `tabindex="-1"`, which removes it from
  the tab order and means it never receives keyboard focus (nothing calls `.focus()` on it either). A keydown
  handler on an element that can't be focused will not fire from user keypresses.
- **Impact:** Keyboard-only users (and the CLAUDE.md-flagged "outstanding a11y audit") likely cannot dismiss
  the summit-logging modal with Escape, only by clicking the backdrop or the close button (which is
  reachable). Not a blocker since a keyboard-reachable close button exists, but it's a real gap in a core
  conversion flow (logging a summit).
- **Recommendation:** Attach the Escape handler to `window`/`document` (e.g. `<svelte:window
  onkeydown={...}>` scoped to `open`) instead of the unfocusable backdrop div, matching the pattern already
  used for the global Cmd+K handler in `Header.svelte:56-61`.
- **Effort:** S
- **Suggested executor:** Haiku

### Finding D10: Leaderboard/activity feed currently shows only founder's own test data
- **Severity:** P3
- **Category:** ux / content hygiene
- **Evidence:** Live `https://saltgoat.co/leaderboard`: "2 Active Climbers, 5 Summits Logged, 0 Peak
  Baggers." Entries are "Anonymous Climber" (3/58, likely seed data) and "Ben Tyson" (the site owner, 2
  summits). Recent Activity repeats the same two identities across Mt. Elbert, Mt. Cameron, Longs Peak.
- **Impact:** Expected and harmless pre-launch (this is the owner's own dogfooding data), but distinct from
  D1 — this is legitimate low-volume data rather than garbage, so lower severity. Still worth a conscious
  decision before real launch: keep as authentic "founder's journey" flavor, or reset for a clean start.
- **Recommendation:** Decide intentionally rather than by default — either keep (it's not embarrassing, just
  sparse) or clear before onboarding real users.
- **Effort:** S
- **Suggested executor:** Ben (product decision, not code)

### Finding D11: Home page has no social-proof fallback for the current all-zero-users state
- **Severity:** P3
- **Category:** ux / growth
- **Evidence:** `src/routes/+page.svelte:84-99` — the "climbers" / "summits logged" social-proof strip is
  gated behind `data.climberCount >= 10 || data.summitCount >= 10`, so it correctly hides rather than
  showing "2 climbers." Live-verified: the homepage today shows no social proof block at all (counts are
  below threshold).
- **Impact:** Reasonable design choice (avoids showing embarrassingly small numbers), but means the
  homepage currently has zero social trust signals. Not broken, just an intentional gap worth knowing about
  for the launch-day plan.
- **Recommendation:** No code change needed pre-launch. Consider a non-count-based trust signal in the
  interim (e.g., "Built by 14er climbers" / founder story) if the counts stay low for a while after launch.
- **Effort:** S
- **Suggested executor:** N/A (product/content decision)

### Finding D12: Google OAuth button has low-contrast border in dark mode
- **Severity:** P3
- **Category:** accessibility / polish
- **Evidence:** `src/routes/auth/+page.svelte:111-120` — button uses `border-slate-200 dark:border-slate-600`
  on a `dark:bg-slate-700` background inside a `dark:bg-slate-800/90` card. Live dark-mode screenshot shows
  the button reads clearly but its border blends closely with the surrounding card — a subtle contrast dip
  compared to the crisp light-mode version.
- **Impact:** Minor visual polish issue only; the button remains legible and clickable (label text and
  Google "G" icon have full contrast). Not a functional accessibility blocker.
- **Recommendation:** Bump the dark-mode border to `slate-500` or add a subtle `dark:shadow` for definition.
  Low priority.
- **Effort:** S
- **Suggested executor:** Haiku

---

## What's genuinely good (worth preserving)

- **Design system consistency:** Instrument Serif headings + Inter body, the `class-1..4` difficulty
  palette, card/shadow tokens (`shadow-card`, `shadow-card-elevated`), and the accent gold/warm gradient are
  used consistently across every page checked (home, auth, pricing, peaks, peak detail, community,
  leaderboard, map) in **both** light and dark themes with no broken/unstyled pages found.
- **Dark mode correctness:** Verified live via the actual theme toggle (not just code reading) on
  `/auth` — flips cleanly, no flash-of-wrong-theme (the inline script in `app.html:41-53` sets `.dark`
  before paint), text/background contrast holds up in both modes on every page sampled.
- **Peak detail page** (`/peaks/mt-elbert`): well-organized (hero → quick stats → overview → route detail →
  photos → location → routes → reviews → trail reports → discussions → map → related peaks), with
  genuinely good empty-state copy: "No reviews yet. Be the first to share your experience!" and "No recent
  trail reports. Be the first to share conditions!" — inviting rather than sterile.
- **Auth flow:** clean single-card UI, working Google OAuth entry point, mode-switching (login/signup/forgot
  password) without page reloads, and a **live-verified** working error state (submitted a bad
  login, got "Invalid login credentials" rendered correctly in the red alert box).
- **Auth guarding:** confirmed live that navigating to `/profile` while logged out redirects cleanly to
  `/auth` rather than erroring or showing a blank/broken page.
- **New-user empty state on Profile:** the "Welcome to SaltGoat!" 3-step card (find a peak → prepare → log
  summit) with real links to `/peaks` and `/learn/first-fourteener` is a well-designed, if under-surfaced,
  onboarding moment (see D7).
- **Accessibility basics present:** skip-to-content link (`+layout.svelte:21-26`), `aria-label`s on icon-only
  buttons (search, mobile menu, user menu), `role="dialog"`/`aria-modal`/`aria-labelledby` on SummitModal,
  keyboard shortcut (Cmd+K) for search discoverable via visible `kbd` hint in the header.
- **Responsive layout:** hero, header (hamburger menu), and pricing cards all reflow correctly and remain
  legible at 375px mobile width (aside from the D3 clipping issue) — verified via live screenshots, not
  just Tailwind breakpoint inspection.

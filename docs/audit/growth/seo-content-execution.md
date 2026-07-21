# SEO & Content Execution Plan

**Author:** Fable · **Date:** 2026-07-21 · **Parent audit:** `docs/audit/F-growth.md` (F-04, F-07, F-08, F-11, F-13, F-14)
**Context:** Pre-launch, zero users, solo owner. 58 peak pages + 66 route pages already exist and are the durable acquisition surface. Everything below is grounded in code as of this date (file:line refs verified).

**Strategy in one paragraph:** You will not out-rank 14ers.com for "Colorado 14ers" at launch — don't try. The winnable game is (a) route-level and peak-level long-tail where your 124 data-rich pages already exist but ship with incomplete heads, (b) comparison/list intent ("easiest 14ers", "14ers near Denver") where nobody has a modern, data-backed page, and (c) freshness intent (per-peak weather/conditions) where the incumbent (mountain-forecast.com) is dated. Fix the mechanical head-tag gaps first (days), wire GSC (30 min), then publish on the calendar below.

---

## Part 1 — Technical SEO tickets (prioritized)

Legend: effort S = <2h, M = half-day+. Executor suggestion assumes a cheaper model does mechanical work with these file targets.

### SEO-T1 · Route pages: full head parity with peak pages — **P1, S, do first**
- **Problem:** `src/routes/peaks/[slug]/[route]/+page.svelte:93-99` — `<svelte:head>` has only `<title>` + description. No canonical, no OG, no Twitter, no JSON-LD. These 66 pages target the highest-intent, lowest-competition queries in the niche ("Longs Peak Keyhole route", "Quandary east ridge").
- **Fix:** Copy the peak-page pattern (`src/routes/peaks/[slug]/+page.svelte:220-289`) verbatim, adapting:
  - `canonical` → `https://saltgoat.co/peaks/${peak.slug}/${route.slug}`
  - `og:image` / `twitter:image` → peak hero (`peak.hero_image_url || /images/peaks/${peak.slug}.jpg`) — route-specific OG images are SEO-T8, not a blocker.
  - Title format: `{route.name} — {peak.name} Route ({route.distance_miles} mi, Class {route.difficulty_class}) | SaltGoat` — puts the stat snippet in the SERP title.
  - JSON-LD `@graph`: `BreadcrumbList` (Home → Peaks → {peak} → {route}) + `Place` with `geo` from `trailhead_latitude/longitude` and `additionalProperty` entries for distance, elevation gain, difficulty class (fields confirmed in `packages/shared/src/types/database.ts:615-655`: `distance_miles`, `elevation_gain_ft`, `difficulty_class`, `is_standard`, `trailhead_latitude/longitude`, `parking_*`).
- **Acceptance:** view-source on 3 route pages shows canonical + OG + valid JSON-LD (validator.schema.org); `npm run build` passes.

### SEO-T2 · Sitemap completeness + hygiene — **P1, S**
- **Problem:** `src/routes/sitemap.xml/+server.ts:32-79` — missing `/community`, the 6 forum category pages, forum topics, `/contact`; includes `/auth` (line 52 — a no-content auth screen, remove it). Forum topics already emit `DiscussionForumPosting` JSON-LD (`src/routes/community/[category]/[topic]/+page.svelte:85-110` per parent audit) — the SEO payoff is wired but unplugged.
- **Fix:** In the sitemap handler: query `forum_categories` (public read) and public, non-deleted `forum_topics` (join category slug for the URL `/community/{category}/{topic-slug-or-id}` — match whatever param the topic page actually uses); add `/community` (0.7), category pages (0.6), topics (0.5, `lastmod` = topic `updated_at`); add `/contact` (0.3); drop `/auth`. Skip `/users/[id]` for now (thin-content risk per F-08 — revisit when profiles have ≥1 public summit).
- **Watch out:** range-slug derivation at `:56-62` (`range.toLowerCase().replace(/\s+/g,'-')`) must stay in lockstep with how `/ranges/[slug]/+page.server.ts` resolves the param — if a shared `rangeSlug()` util exists in `@saltgoat/shared`, use it in both places; if not, extract one.
- **Acceptance:** `curl localhost:4466/sitemap.xml` shows community URLs, no `/auth`, valid XML.

### SEO-T3 · robots.txt hardening — **P2, S (5 min)**
- **Problem:** `static/robots.txt` is `Allow: /` only. `/admin`, `/api/`, `/profile`, `/auth` are crawlable URL space — auth-gated but they waste crawl budget and can index as soft-404s/redirect stubs.
- **Fix:**
  ```
  User-agent: *
  Disallow: /admin
  Disallow: /api/
  Disallow: /profile
  Disallow: /auth
  Allow: /

  Sitemap: https://saltgoat.co/sitemap.xml
  ```
- Do **not** disallow `/users/` or `/trips/` — public profiles and trips may become index-worthy; control those with sitemap inclusion instead.

### SEO-T4 · Canonical + OG coverage sweep on content pages — **P1, S–M**
Current state (all verified by reading `<svelte:head>` blocks):

| Page | canonical | OG | Twitter | JSON-LD |
|---|---|---|---|---|
| `/` (`src/routes/+page.svelte`) | yes | inherits default | inherits | WebSite+SearchAction |
| `/peaks` (`peaks/+page.svelte`) | **no** | **no** | **no** | **none** |
| `/ranges` (`ranges/+page.svelte`) | **no** | **no** | **no** | **none** |
| `/ranges/[slug]` (`ranges/[slug]/+page.svelte`) | yes | partial (no image) | **no** | **none** |
| `/learn` + 6 guides | **no** | **no** | **no** | Breadcrumb; FAQPage on `/learn` and `/learn/faq` |
| `/blog` + 2 posts | **no** | **no** | **no** | Article + Breadcrumb |
| peak pages | yes | full | full | Place+AggregateRating+Breadcrumb |
| route pages | → SEO-T1 | → SEO-T1 | → SEO-T1 | → SEO-T1 |

- **Fix (the right way):** create `src/lib/components/ui/Seo.svelte` — props: `title`, `description`, `canonical` (or derive from `$page.url.pathname`), `ogImage?` (default `/icons/og-image.png`), `ogType?`, `jsonld?` (object or array). Emits title/description/canonical/OG/Twitter/JSON-LD in one place. Then sweep every page above to use it. This stops the head-drift that produced this table.
- **Also fix while in there:** `src/app.html:15` hardcodes `<meta property="og:url" content="https://saltgoat.co" />` — any page that doesn't override `og:url` shares as the homepage. Either remove the default `og:url` from `app.html` or have `Seo.svelte` always emit the correct one (SvelteKit head tags don't "override" app.html tags — scrapers see both; last/first-wins is scraper-dependent, so duplicates are a real bug). Same concern applies to the duplicated default `og:title`/`og:image` — acceptable as fallback, but `og:url` specifically must go.
- **JSON-LD additions while sweeping:** `/peaks` → `ItemList` of 58 peaks (name + URL); `/ranges/[slug]` → `CollectionPage` + `ItemList` of that range's peaks + `BreadcrumbList`.
- **Minor:** two `FAQPage` schemas (on `/learn` and `/learn/faq`) with overlapping questions is fine for validity but Google will pick one page for FAQ rich results — prefer keeping the full set on `/learn/faq` and consider dropping the schema (not the content) from `/learn`.

### SEO-T5 · Internal-linking mesh: peak ↔ route ↔ range ↔ learn — **P1, M (highest-leverage non-mechanical ticket)**
- **Problem (verified):** the 6 learn guides contain **zero** links to peak pages (`grep -rl 'href="/peaks/' src/routes/learn/` → empty). The peak page's static links are only `/peaks`, `/pricing`, `/ranges/` (route links exist via the routes list, which is fine). Blog posts likewise. Your strongest editorial pages pass no authority to the 124 money pages, and vice versa.
- **Fix, in order of value:**
  1. **Learn → peaks:** in `learn/first-fourteener`, link every peak the quiz can recommend (Bierstadt, Quandary, Elbert, Grays/Torreys, Sherman, Handies at minimum) to its peak page inline. In `difficulty-ratings`, link one exemplar peak per class. In `parking`, link the peaks whose trailheads are discussed.
  2. **Peak → related peaks:** add a "More in the {range}" block (3–4 same-range peaks, one line of stats each) at the bottom of `peaks/[slug]/+page.svelte`. Data is already loaded app-wide; this is a small component.
  3. **Peak → learn:** contextual links — difficulty class badge links to `/learn/difficulty-ratings`; a "planning your first 14er?" line on Class 1–2 peaks links to `/learn/first-fourteener`.
  4. **Route → sibling routes:** on the route page, list the peak's other routes ("Also on {peak.name}: …").
  5. **Blog/list pages (Part 2) → peaks:** every list article links 5–15 peak/route pages by design.
- **Acceptance:** every peak page reachable within 2 clicks from at least one learn guide or list page; every learn guide links ≥3 peak pages.

### SEO-T6 · OG image strategy — **P2, S now / M later**
- **Now (S):** route pages + range pages reuse peak hero images (route: its peak's hero; range: hero of its highest peak). Learn guides + blog: one static branded template each (1200×630, title text over a mountain photo, wordmark) — 8 images, produce in Figma/Canva in an hour, drop in `static/images/og/`, reference via `Seo.svelte`.
- **Later (M, post-launch):** dynamic OG via satori/resvg in a `+server.ts` (`/og/[slug].png`) — peak name, elevation, class, live "X reviews" count. The true viral artifact is the per-summit share card (F-15) — that's a product feature, not this ticket.
- Default fallback stays `static/icons/og-image.png` (`src/app.html:14`) — verify that file actually exists and is 1200×630.

### SEO-T7 · Weather pages: leave crawlable teeth in the Pro gate — **P3, M (post-launch, pairs with F-14)**
- `/peaks/[slug]/weather` is indexable with canonical + JSON-LD but anonymous visitors (= Googlebot) see only summit-band daily data. Per F-14: render today + tomorrow full-detail (all 3 bands + insights) server-side for everyone; gate days 3–7. "Mount Elbert weather" queries then land on a page with unique, fresh content instead of a template + banner. Add `dateModified` reflecting the newest forecast row so freshness is machine-visible.

### SEO-T8 · Title-tag tuning pass — **P3, S**
- Peak titles are good (`{name} ({elevation}') | SaltGoat`). Improvements: `/peaks` → "All 58 Colorado 14ers, Ranked by Elevation | SaltGoat" (add "Colorado"); range pages → "{Range} 14ers: All {n} Peaks | SaltGoat" (current `{rangeInfo.name} | SaltGoat` wastes the keyword slot); learn guides → put the query first ("Your First 14er: Complete Beginner's Guide | SaltGoat" is fine, keep the pattern).

### Sequencing
Week 0: T1, T2, T3 (all mechanical — one PR). Week 0–1: T4 (Seo component + sweep), T8. Week 1–2: T5, T6-now. Post-launch: T6-later, T7.

**The GSC gap (SEO-T0, really):** none of the above compounds without feedback. `docs/ben.md` shows Google Search Console was never set up — all 5 boxes unchecked. It is the single highest ROI-per-minute item in this document. Full checklist in Part 3; it's owner-only (account access) so it can run in parallel with everything.

---

## Part 2 — Content plan (~12 weeks)

**Positioning:** every piece is data-backed (your DB has elevation, class, distance, gain, parking, coordinates for all 58/66) and links hard into peak/route pages. Two content types:
- **List/comparison pages** — programmatic skeleton + editorial intro, live under `/learn/` or a new `/best/` path. These are queryable from the DB, stay accurate forever, and are the pages that can actually rank in months not years.
- **Editorial guides/posts** — under `/blog/` or `/learn/`, seasonal and specific.

Cadence: 1 piece/week, list pages front-loaded (they're templated — a Svelte page + a DB query, 2–4h each once the first template exists). Peak-specific deep-dives only for peaks you've personally climbed — first-hand beta is the only durable differentiation against AllTrails/14ers.com.

### Wave 1 — comparison/list intent (weeks 1–4, the winnable head-adjacent terms)

**B1 · "The 7 Easiest Colorado 14ers (Ranked by a Real Difficulty Score)"** — week 1
- Query: `easiest 14ers in colorado` (+ `easiest 14ers`, `beginner 14ers`). Intent: beginner planning first climb — your exact ICP.
- Outline: what "easy" means at 14,000' (class ≠ effort) → ranked list scored on class + distance + gain + trailhead access (Bierstadt, Grays/Torreys, Quandary, Elbert, Sherman, Handies, Democrat) with a stat card each → "which one for you" (mirror the first-fourteener quiz logic) → when to go → CTA: track your first summit.
- Internal links: 7 peak pages, standard-route pages for each, `/learn/first-fourteener`, `/learn/difficulty-ratings`.

**B2 · "14ers Near Denver: 10 Peaks Under 2.5 Hours from the City"** — week 2
- Query: `14ers near denver` (+ `closest 14ers to denver`). Intent: logistics-first day-trippers.
- Outline: drive-time table (you have trailhead coordinates — compute real distances) → grouped: under 1.5h (Bierstadt, Evans/Blue Sky, Grays/Torreys) / under 2.5h (Quandary, DeCaLiBron group, Sherman) → trailhead/parking reality per peak (feed from `parking_*` fields) → early-start math.
- Links: 10 peak pages, `/learn/parking`, `/map`.

**B3 · "Every Colorado 14er Ranked by Difficulty (Class 1 to Class 4)"** — week 3
- Query: `14ers ranked by difficulty`, `hardest 14ers in colorado`, `class 3 14ers`. Intent: research + bravado; huge link-bait potential on r/14ers.
- Outline: methodology → full 58-peak sortable table (class, distance, gain — straight from DB) → callouts: the four Class 4s (Capitol, Little Bear, Pyramid, N. Maroon), the "harder than they look" traps (Kelso Ridge, Sunlight's summit block) → progression path Class 1→4.
- Links: all 58 peak pages (this becomes your strongest internal hub), `/learn/difficulty-ratings`.

**B4 · "Best First 14er: Quiz + Honest Recommendations"** — week 4
- Query: `best first 14er`. Intent: decision. You already built the interactive quiz in `/learn/first-fourteener` — this is a re-angle, not new work: expand that page (or a companion) targeting this exact phrase, add the head-to-head everyone actually googles: **Bierstadt vs Quandary vs Elbert** comparison table.
- Links: quiz, 5–6 peak pages + their standard routes, B1.

### Wave 2 — season/conditions + logistics intent (weeks 5–8, timed for late-summer search volume)

**B5 · "When to Climb Colorado 14ers: Month-by-Month Season Guide"** — week 5
- Query: `best time to climb 14ers`, `14er season colorado`, `can you climb 14ers in september/october`. Intent: trip timing; evergreen with seasonal spikes.
- Outline: month-by-month matrix (snowpack, monsoon, crowds, daylight) → the thunderstorm rule (off summit by noon) → shoulder-season peak picks → link to live per-peak forecasts as the "check before you go" CTA. This article is the SEO front door for the weather wedge (F-03/F-14).
- Links: `/peaks/[slug]/weather` for 5+ peaks, `/learn/safety`, B1.

**B6 · "14er Parking, Permits & Reservations: The Complete 2026 List"** — week 6
- Query: `quandary peak parking reservation`, `14ers that require permits`, `blue lakes trailhead reservation`, `culebra peak cost`. Intent: transactional-adjacent, high urgency, poorly served by incumbents (info scattered across forum threads). **Must be maintained** — date-stamp it and re-verify each spring.
- Outline: peaks needing reservations/shuttles (Quandary shuttle, Mt. Blue Sky timed entry, Blue Lakes for Sneffels) → private-land fee peaks (Culebra) → access-issue peaks (verify current DeCaLiBron / Lindsey status at publish time) → free-parking arrive-by table (from `parking_*` data).
- Links: every affected peak + route page, `/learn/parking` (and update that guide to cross-link).

**B7 · "Quandary Peak: Complete Guide (Route, Parking, Weather, Crowds)"** — week 7
- Query: `quandary peak hike`, `quandary peak east ridge`. Intent: the single most-climbed 14er = highest-volume single-peak query set.
- Outline: why it's #1 for first-timers → East Ridge turn-by-turn with honest difficulty notes → parking/shuttle specifics → season windows + live forecast embed → West Ridge (Class 3) for the second visit → FAQ block with `FAQPage` schema.
- Links: Quandary peak page, both route pages, weather page, B1/B4/B6. **Template note:** this is the per-peak deep-dive pattern — repeat for Bierstadt (wk 9), Elbert (wk 10), Grays/Torreys (wk 12), then top-10 by GSC impression data.

**B8 · "14er Gear List: What You Actually Need (and the $200 Starter Kit)"** — week 8
- Query: `14er gear list`, `what to bring hiking a 14er`. Intent: beginner prep; affiliate-monetizable later.
- Outline: the non-negotiables (layers, water math, sun, navigation) → summer Class 1–2 kit vs Class 3 additions (helmet) → what NOT to buy → printable checklist (email-gated download → feeds F-05 newsletter).
- Links: expand/cross-link `/learn/gear` (don't compete with it — make one canonical winner and 301-or-canonical the other), `/learn/safety`, B1.

### Wave 3 — depth + freshness loop (weeks 9–12)

- **B9 (wk 9):** "Mount Bierstadt: Complete Guide" — B7 template. Query: `mount bierstadt hike`.
- **B10 (wk 10):** "Mount Elbert: Climbing Colorado's Highest Peak" — B7 template. Query: `mount elbert hike`, `highest peak in colorado hike`.
- **B11 (wk 11):** "How Long Does It Take to Climb a 14er? (Real Pacing Math)" — query: `how long to hike a 14er`; outline: pacing formula by class/gain, per-peak time table (computable from DB), turnaround-time planning, altitude effects. Links: 10+ route pages.
- **B12 (wk 12):** "Grays & Torreys: Two 14ers, One Day" — combo-peak intent, `grays and torreys hike`.
- **Recurring from first in-season month:** monthly "Colorado 14er Conditions Roundup: {Month} {Year}" blog post (F-11) — snow line, which classics are "in", trail-report highlights, forecast outlook. 45 minutes/month; it's the freshness signal for the whole domain, the newsletter content (F-06), and the forum-seeding material (F-10 — post each roundup as a forum topic too).

### Rules for every piece
1. Written/reviewed by someone who's climbed in CO — first-hand detail in the first 200 words (E-E-A-T; also the only thing AI-generated competitor sludge can't fake).
2. ≥5 internal links to peak/route pages; every new piece gets linked FROM at least one older page and one peak page (no orphans).
3. `Article` + `BreadcrumbList` JSON-LD via `Seo.svelte`; FAQ blocks get `FAQPage` where natural (B5, B6, B7-template).
4. Date-stamp visible on page; conditions/permits pieces carry "verified {date}" and a spring re-verify calendar entry.
5. Each publish: share to r/14ers or relevant Discord *where genuinely useful* (B3 and B6 are the shareable ones), and request indexing in GSC.

---

## Part 3 — GSC + measurement setup checklist

Owner tasks (account access required), ~45 min total. Mirrors and expands `docs/ben.md` "Google Search Console" (currently 0/5 done).

**Setup (day 0):**
- [ ] GSC → Add property → **Domain** property `saltgoat.co` (covers www/non-www, http/https).
- [ ] Verify via DNS TXT record at the registrar (per `docs/ben.md`). Propagation up to 24h; verify button retries are free.
- [ ] Submit sitemap: `https://saltgoat.co/sitemap.xml` (Indexing → Sitemaps). Confirm "Success" + discovered-URL count ≈ expected (~150 after SEO-T2; the file itself reports 20 static + 6 ranges + 58 peaks + 66 routes today).
- [ ] URL Inspection → **Request indexing** for (in order): `/`, `/peaks`, `/learn/first-fourteener`, top-5 peak pages (quandary-peak, mount-bierstadt, mount-elbert, grays-peak, longs-peak), and each's standard-route page. ~12 requests (daily quota is roughly this size — spread over 2 days if throttled).
- [ ] Also verify in **Bing Webmaster Tools** (imports from GSC in one click; Bing/DuckDuckGo traffic is small but free).

**Recurring (weekly, 10 min):**
- [ ] Performance report → filter Queries containing `14er` — this is your product-research feed (which peaks/routes people actually search → orders the B7-template queue).
- [ ] Pages report → check for "Crawled – currently not indexed" pile-ups on route pages (the symptom SEO-T1 fixes) and "Duplicate without user-selected canonical" (the symptom SEO-T4/og:url fixes).
- [ ] Request indexing for anything published that week.

**Target-query tracking (no paid tools needed pre-launch):**
- [ ] Maintain a 15-row watchlist in GSC (or a plain spreadsheet of weekly GSC position exports): `colorado 14ers list`, `easiest 14ers`, `14ers near denver`, `best first 14er`, `14ers ranked by difficulty`, `quandary peak hike`, `quandary peak parking`, `mount bierstadt hike`, `mount elbert hike`, `grays and torreys`, `longs peak keyhole route`, `14er season`, `14er gear list`, `mount elbert weather`, `14er conditions`.
- [ ] Record weekly: impressions, clicks, avg position. Expectation-setting: impressions move in weeks, positions in months; route pages should show impressions within ~4 weeks of SEO-T1+T2 landing.

**Milestone checks:**
- [ ] +2 weeks: Coverage — are all 66 route URLs indexed? If not, inspect 2–3 by URL and diagnose.
- [ ] +4 weeks: Enhancements → check Breadcrumbs/FAQ/Review-snippet rich-result reports are green (they validate the JSON-LD work).
- [ ] Umami (`src/app.html:34`) already tracks page traffic — add referrer segmentation to distinguish organic-search sessions; GSC clicks vs Umami organic sessions is your sanity cross-check.

---

## Dependency map

```
GSC setup (Part 3) ──────────── independent, do immediately
SEO-T1 route heads ─┐
SEO-T2 sitemap ─────┼── one PR, week 0 ──→ request indexing (Part 3)
SEO-T3 robots ──────┘
SEO-T4 Seo.svelte sweep ──→ SEO-T6 OG images ──→ all Part 2 pieces use Seo.svelte
SEO-T5 internal links ←──── B1–B4 list pages create the hub links
B5/roundups ←──── weather cron live (F-02) before linking "live forecast" CTAs
```

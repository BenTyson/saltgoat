# F — Growth & Product Strategy Audit

**Auditor:** Fable (Domain F) · **Date:** 2026-07-13 · **Scope:** Web app only, pre-launch, solo owner.

---

## Executive Summary

**Growth-readiness verdict: NOT READY TO MONETIZE, NEARLY READY TO ACQUIRE.**
The SEO foundation is genuinely good for a pre-launch indie app (sitemap, robots, canonicals, rich
JSON-LD on peaks/FAQ/forum, real 250–380-line guides). But the entire paid funnel is broken at three
consecutive links — checkout fails (wrong Stripe env value), the Pro wedge product (weather) has no
scheduled data refresh, and the pricing page never mentions weather at all. Meanwhile the owned-audience
loop is at zero: the newsletter component was built but never mounted anywhere, and production email is
likely down (`SPARROW_URL` missing). Retention loops write to the database but nothing ever pulls a user
back (no notifications, no digests).

**Counts by severity:** P0 × 2 · P1 × 6 · P2 × 5 · P3 × 2 (15 findings)

**Top growth bets (ranked):**
1. **Repair the revenue pipeline end-to-end** (Stripe price ID → weather cron → Open-Meteo commercial key). Until all three are fixed, launch earns $0 and the flagship Pro feature serves stale data.
2. **Sell the wedge:** put weather forecasts front-and-center on `/pricing` and give free users a taste of the full forecast. Today the sales page sells "unlimited logging" while the differentiated product is invisible.
3. **Long-tail SEO blitz on the 66 route pages** — canonical/OG/JSON-LD parity with peak pages + GSC setup. Route queries ("Quandary Peak East Ridge") are the durable acquisition channel and the pages already exist.
4. **Stand up the email loop:** mount the orphaned `NewsletterSignup` component, fix `SPARROW_URL`, ship a weekly conditions digest. It is retention *and* acquisition and costs days, not weeks.
5. **Manage the cold start:** seed or soft-hide the forum and leaderboard; owner generates the first 90 days of content (trip reports, summit logs) so early visitors don't land in empty rooms.

---

## Findings

### Finding F-01: Web checkout is dead — `STRIPE_PRICE_ID` holds a product ID, not a price ID
- Severity: **P0** (launch-blocker for monetization)
- Category: growth / correctness
- Evidence: `src/lib/server/stripe.ts:16-17` reads `env.STRIPE_PRICE_ID` and passes it as
  `line_items: [{ price: priceId }]` to `stripe.checkout.sessions.create`. Hub config audit confirms the
  Railway value is a `prod_…` ID; Stripe rejects non-`price_…` values, so every "Upgrade to Pro" click on
  `/pricing` (form POST to `/api/checkout`, `src/routes/pricing/+page.svelte:141-148`) will 500.
  Note `.env.example:29` documents the correct `price_…` format — this is a config error, not code.
- Impact: 100% of web upgrade attempts fail. Zero web revenue at launch; also poisons first impressions
  for the most purchase-intent users you'll ever have.
- Recommendation: Swap the Railway env var to the `price_…` ID for the $29.99/yr price; do one real test
  checkout in Stripe test mode before launch. Add a startup assertion (`priceId.startsWith('price_')`).
- Effort: S
- Suggested executor: Haiku (config) + Fable (re-verify checkout flow)

### Finding F-02: The Pro wedge (weather) has no data refresh scheduled and runs on a non-commercial API tier
- Severity: **P0** (launch-blocker for monetization)
- Category: growth / scope
- Evidence: `docs/ben.md` "Weather Webhook" — cron setup unchecked ("Set up cron service … at 06:00,
  12:00, 18:00, 00:00 UTC") and "Upgrade to Open-Meteo commercial API key" unchecked.
  `docs/CURRENT-STATUS.md:127` repeats: "Open-Meteo free tier is non-commercial — need commercial API
  key … for production." The whole Pro pitch on `/peaks/[slug]/weather` (upgrade banner at
  `+page.svelte:176-196`) is elevation-banded, sub-daily forecasts from `peak_forecasts`.
- Impact: Without the cron, `peak_forecasts` goes stale within hours of launch — paying customers get a
  broken flagship feature (refund/churn machine). Without the commercial key, charging for weather data
  violates Open-Meteo's terms and risks the data source being cut off.
- Recommendation: Schedule the cron (Railway cron or cron-job.org — 15 minutes of work) and buy the
  ~10 EUR/month commercial key *before* accepting the first payment. Add a staleness check to the weather
  page (banner if newest forecast > 12h old) so failure is visible.
- Effort: S (cron + key) / M (staleness UX)
- Suggested executor: Owner (accounts) + Sonnet (staleness banner)

### Finding F-03: The pricing page never mentions weather — the wedge is absent from the sales pitch
- Severity: **P1**
- Category: growth
- Evidence: `src/routes/pricing/+page.svelte:24-30` — `proTierFeatures` = unlimited logging, advanced
  stats, CSV export, Pro badge. No mention of elevation-banded forecasts, hiker insights, or sub-daily
  detail, which per Weather v2 Phase 5 (`docs/CURRENT-STATUS.md`) is the most differentiated Pro feature.
  The pricing FAQ (lines 154-177) is also entirely about the summit limit.
- Impact: The conversion page sells the *least* differentiated benefit ("log more than 5 summits" —
  a wall) instead of the *most* differentiated one (mountain-grade weather — a benefit). Weather is what
  competitors (14ers.com, AllTrails) don't do well; unlimited logging is what they give away free.
- Recommendation: Rewrite the Pro card with weather first: "Full 3-band mountain forecasts", "Hiker
  safety insights", "AM/PM/night detail", then unlimited logging/stats/export. Add a forecast-table
  screenshot or mini-demo. Add a weather-focused FAQ entry. Mirror the copy in the weather-page upgrade
  banner so the story is consistent.
- Effort: S
- Suggested executor: Sonnet

### Finding F-04: 66 route pages — the biggest long-tail SEO surface — ship with bare-bones head tags
- Severity: **P1**
- Category: growth
- Evidence: `src/routes/peaks/[slug]/[route]/+page.svelte:93-99` — `<svelte:head>` contains only
  `<title>` and `<meta name="description">`. No canonical, no Open Graph, no Twitter card, no JSON-LD.
  Contrast with the peak page (`peaks/[slug]/+page.svelte:226-286`): canonical + full OG + Twitter +
  `Place`/`AggregateRating`/`BreadcrumbList` graph. The sitemap *does* include all route URLs with
  lastmod (`src/routes/sitemap.xml/+server.ts:72-78`), so crawlers reach thin heads.
- Impact: Route-level queries ("Longs Peak Keyhole route", "Quandary east ridge winter") are the
  highest-intent, lowest-competition searches in this niche. Bare heads mean weaker rankings, no rich
  results, and ugly link shares.
- Recommendation: Add canonical + OG (peak hero image) + `BreadcrumbList` and a route-appropriate schema
  (`Place` with distance/gain as `additionalProperty`, or `HowTo`-style trail facts). Copy the pattern
  from the peak page — this is mechanical.
- Effort: S
- Suggested executor: Haiku/Sonnet (mechanical, pattern exists)

### Finding F-05: Newsletter capture is built but mounted nowhere; production email likely down
- Severity: **P1**
- Category: growth
- Evidence: `src/lib/components/ui/NewsletterSignup.svelte` exists, but
  `grep -rn "NewsletterSignup" src/` returns zero importers — it renders on no page. The footer
  (`src/lib/components/layout/Footer.svelte`) has only guidelines/terms/privacy links. The only email
  capture is full account signup. Additionally the hub config audit reports `SPARROW_URL` is missing in
  Railway, so even the signup-triggered welcome email + newsletter subscribe
  (`/api/webhooks/user-signup`, per CLAUDE.md) fails silently in production.
- Impact: Zero owned-audience building. For a seasonal product (14er season = June–September) an email
  list is the cheapest way to reactivate users next season and to nurture visitors who aren't ready to
  sign up. Every pre-launch visitor lost today is unrecoverable.
- Recommendation: (a) Set `SPARROW_URL`/`SPARROW_API_KEY` in Railway and verify a real welcome email;
  (b) mount `NewsletterSignup` in the footer and on `/learn/*` + `/blog/*` (highest-intent anonymous
  traffic); (c) confirm `POST /api/v1/subscribe` works end-to-end.
- Effort: S
- Suggested executor: Haiku (config + mount) + Fable (verify email delivery)

### Finding F-06: Retention loops write to the DB but nothing pulls users back — no notifications, no digests
- Severity: **P1**
- Category: growth
- Evidence: Social primitives are complete server-side: `src/lib/server/follows.ts` (7 functions incl.
  `getSuggestedUsers`), `reactions.ts`, `comments.ts`, `activity.ts` (4 activity types), 29 achievements
  in `packages/shared/src/data/achievements.ts`. But there is no notifications table, no in-app
  notification surface, and `docs/CURRENT-STATUS.md:10` confirms "notifications/email digests" are
  unshipped Phase 8 fragments. When someone reacts to, comments on, or follows a user — the recipient
  never finds out unless they manually revisit.
- Impact: Social loops are one-directional; the reciprocity engine (the thing that makes feeds retain)
  is missing its return path. Achievements fire once at write-time and are then invisible. Expected
  effect: near-total D7 drop-off between hikes.
- Recommendation: Don't build a realtime notification system pre-launch. Ship the 20% version: a weekly
  email digest via Sparrow ("2 people congratulated your Elbert summit · new trail report on your
  watchlist peak · weekend forecast for your next objective"). One cron, one template, uses the
  watchlist + weather data you already have. In-app notification bell is post-launch.
- Effort: M
- Suggested executor: Sonnet (digest) — depends on F-05 (email working)

### Finding F-07: Google Search Console never configured — the SEO work is unsubmitted
- Severity: **P1**
- Category: growth
- Evidence: `docs/ben.md` "Google Search Console" — all 5 boxes unchecked (add property, verify DNS,
  submit sitemap, request indexing). Meanwhile `static/robots.txt` correctly advertises the sitemap and
  `sitemap.xml/+server.ts` generates ~145 URLs (20 static + ~6 ranges + 58 peaks + 66 routes).
- Impact: No indexing feedback, no query data, slower discovery. You cannot run an SEO strategy blind —
  GSC query data is also the cheapest product-research tool you'll have (which peaks/routes people
  actually search).
- Recommendation: 30-minute task: verify domain, submit sitemap, request indexing for `/`, `/peaks`,
  the top-5 peak pages, and `/learn`. Recheck coverage 2 weeks post-launch.
- Effort: S
- Suggested executor: Owner (requires account access)

### Finding F-08: UGC surfaces (forum topics, public profiles) are invisible to the sitemap
- Severity: **P1**
- Category: growth
- Evidence: `src/routes/sitemap.xml/+server.ts:32-79` — URL set is static pages + ranges + peaks +
  routes only. Forum topics have good SEO plumbing (canonical + `DiscussionForumPosting` JSON-LD at
  `community/[category]/[topic]/+page.svelte:85-110`) but no sitemap entries; same for `/users/[id]`
  (which also has only title/description, `users/[id]/+page.svelte:73-76`). `/contact` and `/community`
  hub pages are also absent from the sitemap.
- Impact: Today it's moot (no UGC), but the forum's entire SEO payoff — Google's forum-content carousel
  loves `DiscussionForumPosting` — depends on topics being crawlable the moment content exists. This is
  a growth asset wired 90% and left unplugged.
- Recommendation: Append forum topics (public, non-deleted) and `/community` + category pages to the
  sitemap query. Skip user profiles for now (thin content risk) or add only profiles with ≥1 public
  summit. Add `/contact`.
- Effort: S
- Suggested executor: Haiku/Sonnet

### Finding F-09: Free→Pro ladder is a wall, not a ladder — packaging experiments needed
- Severity: **P2**
- Category: growth
- Evidence: `src/lib/server/subscriptions.ts:4` — `FREE_SUMMIT_LIMIT = 5` (lifetime, not per-year).
  Weather gating (CURRENT-STATUS Phase 5): free = summit band, daily only, no insights. Single SKU:
  $29.99/yr (`pricing/+page.svelte:101`), no monthly, no trial.
- Impact: The average finisher takes years to climb 58 peaks; many casual users do 1–3 peaks per summer
  and will never hit 5 — meaning the limit converts only the most hardcore (who are also the most likely
  to already use 14ers.com free). Meanwhile weather — the impulse-purchase feature ("I'm hiking
  Saturday, is it safe?") — has no low-friction entry point. $29.99/yr as an anchor is fine (≈ AllTrails+
  territory), but it's the only door.
- Recommendation: Experiments to run post-launch, in order: (1) 7-day free trial of Pro weather
  (Stripe `trial_period_days` — one line); (2) show the full Pro forecast for ONE peak free per week
  ("taste the wedge"); (3) test a $4.99/mo option for summer-only hikers (seasonal product, seasonal
  price); (4) consider making the summit limit per-year instead of lifetime so free stays alive as a
  funnel. Don't change the annual price itself yet — no data.
- Effort: S–M per experiment
- Suggested executor: Sonnet + owner (Stripe dashboard)

### Finding F-10: Forum is a cold-start liability at launch — 7 tables of empty rooms
- Severity: **P2**
- Category: growth / scope
- Evidence: Full forum shipped (`src/lib/server/forum/` — 12 submodules; 7 tables per CLAUDE.md;
  6 seeded categories) with zero users. `/community` is a top-level nav surface (Key Routes table).
- Impact: An empty forum is negative social proof — it tells every early visitor "nobody is here."
  Classic cold-start trap: the feature that's an asset at 1,000 users is a liability at 10. The flip
  side: the `DiscussionForumPosting` schema (F-08) makes it a real SEO asset *once seeded*.
- Recommendation: Don't delete it. (1) Seed 15–25 genuinely useful topics yourself before launch
  (condition threads per popular peak, gear questions, trip reports) — this doubles as SEO content;
  (2) demote `/community` in the nav until topics/week > ~5; (3) set the expectation on category pages
  ("new community — introduce yourself") instead of bare empty states.
- Effort: M (mostly owner content time)
- Suggested executor: Owner (content) + Sonnet (nav/empty-state tweaks)

### Finding F-11: Content moat is thin where it matters — 2 blog posts, no per-peak editorial
- Severity: **P2**
- Category: growth
- Evidence: `/blog` has exactly two launch announcements (`blog/welcome`, `blog/why-we-built-saltgoat`,
  155/160 lines). The 6 learn guides are legitimately good (249–376 lines each, FAQ has proper
  `FAQPage` schema at `learn/faq/+page.svelte:124-131`) but they're static and generic-topic. Peak pages
  are data-rich but share the same template — no unique editorial "route beta" per peak.
- Impact: "Colorado 14ers" head term is owned by 14ers.com (20 years of UGC); you will not win it at
  launch. What's winnable is long-tail: comparison/list intent ("easiest 14ers", "14ers near Denver",
  "best first 14er") and freshness intent ("Quandary conditions June 2026"). Neither is covered.
- Recommendation: Programmatic + editorial hybrid: (1) 5–8 list pages built from data you already have
  (easiest/hardest by class, closest to Denver/COS, best for beginners — the first-fourteener quiz
  already encodes this logic); (2) monthly "conditions roundup" blog post during season (feeds the
  digest, F-06); (3) add a 2–3 paragraph unique editorial block to the top-10 trafficked peaks. Skip a
  CMS — Svelte pages are fine at this scale.
- Effort: M (ongoing)
- Suggested executor: Owner + Sonnet (list-page templates)

### Finding F-12: Leaderboard and activity feed have a pre-launch emptiness problem
- Severity: **P2**
- Category: growth / ux
- Evidence: `/leaderboard` (243 lines) and the activity feed (`activity.ts`, Following/You tabs) render
  from live user data; with 0 users both are empty shells shown in primary navigation.
- Impact: Same cold-start signal as the forum, on two more surfaces. Also the "Following" feed is empty
  until users follow someone, and `getSuggestedUsers` (`follows.ts:146`) has nobody to suggest.
- Recommendation: Owner + 3–5 friends seed real summit logs pre-launch (also creates leaderboard
  entries, reviews, and photos). Cheap and honest — you actually climb these peaks. Consider a
  "Founding member" badge achievement for the first N users to add joining incentive.
- Effort: S (content) — badge is S code
- Suggested executor: Owner + Haiku (badge)

### Finding F-13: No per-page OG images beyond peak heroes — shares from content pages are generic
- Severity: **P2**
- Category: growth
- Evidence: `src/app.html:14` sets a single default `og-image.png`. Peak pages override with hero images
  (`peaks/[slug]/+page.svelte:222`), good. Learn guides, blog posts, ranges, pricing, and route pages
  set no `og:image`, so they inherit the generic default; route pages set no OG at all (F-04).
- Impact: Weaker click-through on every social/Discord/Reddit share of the content that's designed to be
  shared (guides, blog). Reddit r/14ers and mountain-project-adjacent Discords are your realistic launch
  channels — link previews matter there.
- Recommendation: Reuse peak hero images for range and route pages; add one branded OG per learn guide
  (a template + title text is enough). Dynamic OG generation (satori/resvg) is a P3 nice-to-have —
  a per-summit share card ("I summited Elbert! 12/58") is the real viral artifact, later.
- Effort: S (static) / M (dynamic cards)
- Suggested executor: Sonnet

### Finding F-14: Weather pages could be a public SEO moat, but Pro gating keeps them thin for crawlers
- Severity: **P3**
- Category: growth
- Evidence: `/peaks/[slug]/weather` is indexable (canonical + JSON-LD, `weather/+page.svelte:67,118`)
  but free/anonymous visitors — including Googlebot — see only the summit-band daily view with an
  upgrade banner (`+page.svelte:176-196`).
- Impact: "Mount Elbert weather"–class queries have real volume and weak competition (mountain-forecast
  .com is dated). Fully-gated pages will rank on template strength only; fully-open pages give away the
  wedge. There's a middle path.
- Recommendation: Show today + tomorrow full-detail (all bands, insights) to everyone; gate days 3–7 and
  historical trends behind Pro. Freshness + uniqueness ranks; the 7-day planning horizon stays paid.
  Pairs with the F-09 "taste the wedge" experiment.
- Effort: M
- Suggested executor: Sonnet

### Finding F-15: No summit-share loop — the product's happiest moment produces no external artifact
- Severity: **P3**
- Category: growth
- Evidence: Summit logging ends at a DB write + achievements (`summits.ts`, `achievements.ts`); there's
  no share card, no public summit permalink designed for sharing, no "I finished the Sawatch" moment.
  CSV export exists (`/api/export/summits`) but that's Pro-retention, not acquisition.
- Impact: Peak-bagging is inherently braggy — Strava built a company on this loop. Every logged summit
  is a missed impression on the user's Instagram/Strava/group chat.
- Recommendation: Post-launch bet: generate a share image per summit (peak hero + name + "X/58" progress
  + SaltGoat wordmark) with a one-tap share. Combine with the achievement system (29 badges already
  defined) for milestone cards. This is the highest-upside organic-acquisition feature in the backlog.
- Effort: M
- Suggested executor: Sonnet/Opus

---

## What's already strong (don't touch)

- **Peak-page SEO** is best-in-class for an indie: canonical, full OG/Twitter, `Place` +
  `AggregateRating` + `BreadcrumbList` graph (`peaks/[slug]/+page.svelte:226-286`).
- **FAQ page** has proper `FAQPage` schema — eligible for rich results out of the box.
- **Forum topics** already emit `DiscussionForumPosting` with interaction counters — ahead of most
  established forums; just needs sitemap plumbing (F-08) and content (F-10).
- **robots.txt + sitemap** exist and are correct in structure; sitemap is dynamic with lastmod.
- **Learn guides** are real content (not SEO sludge) and the first-fourteener quiz is a genuinely
  differentiated interactive asset.
- **Upgrade-prompt placement** is sound: contextual banner on the weather page, summit-limit counter +
  modal on the peak page (`peaks/[slug]/+page.svelte:671-681`). The plumbing is right; the copy/wedge
  emphasis is what needs work (F-03).

## Suggested sequencing (solo-owner reality)

1. **Week 0 (pre-launch, blocking):** F-01, F-02, F-05a (env fixes + cron + commercial key + one test
   purchase + one test email). All config, ~1 day including verification.
2. **Week 0–1:** F-03 (pricing rewrite), F-04 (route heads), F-07 (GSC), F-08 (sitemap) — the SEO/
   conversion quick wins, all S-effort.
3. **Weeks 1–3:** F-10 + F-12 (seed content), F-05b (mount newsletter), F-11 list pages.
4. **Post-launch, first season:** F-06 (weekly digest), F-09 experiments, F-14 (open 2-day forecasts).
5. **Bets when there's a pulse:** F-13 dynamic OG, F-15 share cards.

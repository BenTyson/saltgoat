# Monetization & Retention — Execution Plan

**Author:** Fable strategy pass · **Date:** 2026-07-21 · **Builds on:** `docs/audit/F-growth.md` (F-03, F-06, F-09, F-14)
**Audience:** Owner + Sonnet/Haiku executors. Everything here is grounded in current code (file:line) and specced to be buildable without re-deriving strategy.

**Context:** Pre-launch, zero users. Free = 5 lifetime summits (`src/lib/server/subscriptions.ts:4`). Pro = $29.99/yr, single SKU (`src/routes/pricing/+page.svelte:101`). The real Pro wedge — elevation-banded mountain weather — is fully built and gated (`src/routes/peaks/[slug]/weather/+page.server.ts:34-43`) but absent from the sales page. Email works via Sparrow (`src/lib/server/sparrow.ts`) once `SPARROW_URL` is set (F-05).

---

## Part 1 — Pricing & Packaging

### 1.0 Verdict on $29.99/yr

**Keep it.** It's the right anchor: AllTrails+ is $35.99/yr, onX Backcountry $34.99/yr, and SaltGoat is narrower but deeper (58 peaks, mountain-grade forecasts). Pre-launch there is zero data to justify moving it, and repricing later is cheap while re-anchoring upward is not. The problems are *packaging* (one door, annual-only, for a June–September product) and *story* (the page sells the wall, not the wedge). Fix those, not the number.

Two structural observations that drive everything below:

1. **The 5-summit cap is a wall, not a ladder** (`subscriptions.ts:49-76` — lifetime count, enforced at `src/routes/peaks/[slug]/+page.server.ts:113` and `src/routes/api/v1/summits/+server.ts:46`). Casual hikers do 1–3 peaks/summer and never feel it; the hardcore hit it in week one and feel punished. It converts the wrong emotion at the wrong time.
2. **Weather is an impulse purchase; logging is a commitment purchase.** "I'm hiking Saturday — is the summit safe at 6am?" has a deadline and a dollar value. "I might log more than 5 summits someday" does not. The wedge with urgency should lead every pitch.

### 1.1 EXPERIMENT P-1: Weather-first pricing repositioning *(ship pre-launch — this is the F-03 fix, specced)*

- **Hypothesis:** Leading the Pro pitch with mountain weather (the differentiated, urgent benefit) instead of unlimited logging (the commodity benefit) increases pricing→checkout click-through.
- **Change** (all in `src/routes/pricing/+page.svelte`):
  - Replace `proTierFeatures` (lines 24-30) with, in order:
    1. `Full mountain forecasts — summit, mid & base elevation bands`
    2. `Morning / afternoon / night detail, 7 days out`
    3. `Hiker safety insights (wind, storms, freezing level)`
    4. `Unlimited summit logging`
    5. `Advanced stats dashboard`
    6. `CSV export of your summit history`
    7. `Pro badge on profile & leaderboard`
  - Header subcopy (line 46): replace "Upgrade to Pro for unlimited summit logging and more" with "Go Pro for full mountain forecasts and unlimited logging."
  - Pro card tagline (line 105): "For dedicated peak baggers" → "Know the mountain before you go."
  - Add a visual proof block between the cards and the FAQ: a static screenshot (or a small read-only Svelte rendering) of the 3-band forecast table from `/peaks/[slug]/weather` for a marquee peak. A `static/images/pricing-forecast.png` screenshot is acceptable v1.
  - FAQ (lines 158-177): prepend a weather entry — *"What makes SaltGoat's weather different?"* → "Forecasts at summit, mid-mountain, and trailhead elevation — not the nearest town. Morning/afternoon/night resolution so you can time your start, plus safety insights for wind and storms." Keep the existing three entries.
  - Mirror the same feature order in the weather-page upgrade banner (`src/routes/peaks/[slug]/weather/+page.svelte:176-196`) so the story is identical at both touchpoints.
- **Metric:** pricing-page → checkout-POST click-through rate (count `POST /api/checkout` submissions / pricing page views; a server-side log line in `src/routes/api/checkout/+server.ts` is enough pre-analytics).
- **Success threshold:** N/A pre-launch (no baseline) — ship as default, it becomes the control for P-2..P-5.
- **Effort:** S · **Executor:** Sonnet.

### 1.2 EXPERIMENT P-2: Founder's launch rate — $19.99 first year

- **Hypothesis:** A time-boxed founder price converts early high-intent visitors who would otherwise "wait and see," and seeds the leaderboard/forum with invested users (helps F-10/F-12 cold start).
- **Change:** Stripe coupon (33% off first year) auto-applied via `discounts` in the checkout session (`src/lib/server/stripe.ts` — one param). Pricing page shows `$29.99` struck through, `$19.99 first year — founding member rate, first 100 members`, plus wire the existing "Founding member" badge idea (F-12) to Pro signups #1–100.
- **Metric:** paid conversions in the first 30 days post-launch.
- **Success threshold:** ≥10 paid conversions in 30 days (vs. an expected ~0–3 at full price with no urgency). Sunset the coupon at 100 redemptions or day 60, whichever first — and actually sunset it; a permanent "launch" discount reprices the product to $19.99.
- **Effort:** S (owner: Stripe dashboard; Sonnet: pricing copy) · **Run:** launch day.

### 1.3 EXPERIMENT P-3: 7-day free trial of Pro

- **Hypothesis:** Letting a user experience one real trip-planning cycle with full forecasts (a Thursday→Saturday loop) converts better than a hard paywall, for a product whose value is only visible when you're about to hike.
- **Change:** `subscription_data: { trial_period_days: 7 }` in the checkout session create. The `status: 'trialing'` value already exists in the `Subscription` type (`subscriptions.ts:10`) — **but `isPro()` at `subscriptions.ts:45-47` checks `status === 'active'` only, so trialing users would NOT get Pro. One-line change required:** `['active', 'trialing'].includes(subscription?.status)`. This is a latent bug for RevenueCat trials too.
- **Metric:** trial→paid conversion rate (Stripe dashboard).
- **Success threshold:** ≥30% trial→paid. Below 20%, the trial is harvesting curiosity, not intent — revert to hard gate + P-4 instead.
- **Effort:** S · **Run:** week 2–4 post-launch, after P-2 data exists.

### 1.4 EXPERIMENT P-4: Monthly SKU — $4.99/mo

- **Hypothesis:** 14er season is ~14 weeks; a seasonal hiker who won't prepay a year will pay month-to-month June–September (~$15–20/season revenue vs. $0 today).
- **Change:** Second Stripe price on the same product; pricing page gets a monthly/annual toggle with annual framed as the deal ("$29.99/yr — 2 months free vs. monthly"). `getSubscription`/`isPro` need no changes (plan/status agnostic). Mobile parity: add the monthly package in RevenueCat before shipping, per the dual-platform rule in CLAUDE.md.
- **Metric:** total new-subscriber revenue per 100 pricing-page visitors (guard against cannibalization: track annual-share too).
- **Success threshold:** revenue/100 visitors up ≥20% AND annual share stays ≥40% of new subs. If monthly cannibalizes annual without expanding the base, kill it after one season.
- **Effort:** M (Stripe + RevenueCat + toggle UI) · **Run:** only after ≥200 pricing-page sessions of P-1 baseline.

### 1.5 EXPERIMENT P-5: Free-tier recalibration — "taste the wedge," keep the cap

- **Hypothesis:** The 5-summit cap is fine as a *forward-looking* meter, but the weather gate is currently calibrated to hide the product from the people it should be selling to (including Googlebot — F-14). Showing today + tomorrow in full detail converts and ranks better than showing a degraded 7-day view.
- **Change** (in `src/routes/peaks/[slug]/weather/+page.server.ts`): modify `toFreeForecast()` (lines 34-43) — for `days[0]` and `days[1]`, keep all three bands and real AM/PM/night periods, and keep the insights that reference the next 48h; for days 3–7 apply the current summit-band daily aggregation. Upgrade banner copy becomes "See the full 7-day outlook" — a *horizon* gate ("plan your weekend") instead of a *quality* gate. Do NOT loosen the summit cap itself yet — it's the secondary lever and changing two levers at once destroys the read. (One exception: onboarding backfill, Part 3, which changes what the cap counts.)
- **Metric:** weather-page → pricing/checkout CTR, plus organic impressions for "\<peak\> weather" queries in GSC (F-07 must be done).
- **Success threshold:** weather→upgrade CTR does not drop (the fear is giving away too much) AND weather-page organic impressions +50% over 8 weeks. If CTR drops >25%, tighten to today-only full detail.
- **Effort:** M · **Run:** first season, after the weather cron (F-02) is live — never widen access to stale data.

**Sequencing:** P-1 pre-launch → P-2 at launch → P-3 or P-5 at week 2–4 (not both simultaneously) → P-4 only with traffic. One packaging change live at a time; at this traffic scale you're reading directional signal, not significance.

---

## Part 2 — Retention Architecture: Notifications + Email Digest

### 2.0 Design stance

The audit's F-06 is right: every social write is one-directional today — `followUser` (`src/lib/server/follows.ts:118`), `createComment` (`src/lib/server/comments.ts:28`), `toggleReaction` (`src/lib/server/reactions.ts:16`), and `checkAndAwardAchievements` (`src/lib/server/achievements.ts`) all mutate the DB and tell no one. The fix is **one notifications table as the single source of truth, email as the first delivery channel, in-app bell later reading the same table.** Do not build realtime anything. One cron, one weekly email, event rows written inline by the mutations that already exist.

**Channel policy (v1):** everything batches into the weekly digest **except** two immediate transactional emails — *new follower* (the reciprocity hook; time-sensitive because follow-back likelihood decays fast) and *weather alert* on a watchlisted peak (safety-adjacent; useless if late). Reactions, comments, and achievements are digest-only in v1 — at launch volume, per-event emails for those would mostly be silence punctuated by spam.

### 2.1 Data model (one migration: `supabase/migrations/NN_notifications.sql`)

```sql
-- 1. Notification events (source of truth; email + future in-app bell both read this)
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,  -- recipient
  type         text not null check (type in (
                 'new_follower','summit_reaction','summit_comment',
                 'achievement','weather_alert','forum_reply','forum_mention')),
  actor_id     uuid references profiles(id) on delete set null,          -- who did it (null for system/weather)
  entity_type  text check (entity_type in ('summit','peak','forum_topic','achievement')),
  entity_id    uuid,
  payload      jsonb not null default '{}',   -- denormalized display data: peak name/slug,
                                              -- comment excerpt, actor display_name, alert details.
                                              -- Digest renders from payload alone — no joins at send time.
  read_at      timestamptz,                   -- in-app bell (later)
  emailed_at   timestamptz,                   -- set when included in any email (digest or immediate)
  created_at   timestamptz not null default now()
);
create index notifications_user_recent on notifications (user_id, created_at desc);
create index notifications_unemailed  on notifications (user_id, created_at) where emailed_at is null;

alter table notifications enable row level security;
-- Own read; own update restricted to marking read (enforce column via trigger or accept own-row update)
create policy "read own notifications"   on notifications for select using (auth.uid() = user_id);
create policy "mark own notifications read" on notifications for update using (auth.uid() = user_id);
-- INSERTs come from server modules using the caller's authed client. The actor inserts a row
-- whose user_id is the recipient, so a normal "insert own" policy won't work. Options:
--   (a) permissive insert policy `with check (auth.uid() = actor_id)` — actor must be authenticated
--       and truthfully recorded; recipient_id free. Weather alerts (no actor) insert via service role.
--   (b) SECURITY DEFINER function `create_notification(...)` with fixed search_path (pattern already
--       used by the signup triggers, see commit 504016c).
-- Recommend (a) for social + service-role for system events; it is simpler and auditable.

-- 2. Email preferences (separate table, not profiles columns — keeps RLS/backfill trivial)
create table email_preferences (
  user_id             uuid primary key references profiles(id) on delete cascade,
  weekly_digest       boolean not null default true,
  social_immediate    boolean not null default true,   -- new-follower email
  weather_alerts      boolean not null default true,
  product_updates     boolean not null default true,   -- newsletter-ish, maps to Sparrow list
  unsubscribed_all    boolean not null default false,  -- master kill switch
  unsubscribe_token   uuid not null default gen_random_uuid(),  -- token-auth for one-click links
  updated_at          timestamptz not null default now()
);
alter table email_preferences enable row level security;
create policy "own prefs" on email_preferences for all using (auth.uid() = user_id);
-- Rows are created lazily: getOrCreatePrefs() upserts defaults on first read.
-- Absence of a row == all defaults on. The digest cron (service role) reads all rows.

-- 3. Digest send-state (idempotency — a re-run cron must never double-send)
create table digest_runs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  digest_type        text not null default 'weekly',
  period_start       timestamptz not null,
  period_end         timestamptz not null,
  notification_count int not null default 0,
  sent_at            timestamptz not null default now(),
  unique (user_id, digest_type, period_start)   -- the idempotency key
);
alter table digest_runs enable row level security;  -- service-role only; no user policies needed
```

### 2.2 Server module: `src/lib/server/notifications.ts`

Follows the house pattern (first param `SupabaseClient<Database>`, same as every module in `src/lib/server/`).

```ts
createNotification(supabase, { userId, type, actorId?, entityType?, entityId?, payload })
  // Fire-and-forget: wrap in try/catch, log via src/lib/server/logger.ts, NEVER throw —
  // a notification failure must not fail the summit/comment/follow write.
  // Skip self-notification: if (userId === actorId) return.
getUnreadCount(supabase, userId)          // for the future in-app bell
getNotifications(supabase, userId, limit) // for the future in-app bell
markRead(supabase, userId, ids)
getOrCreatePrefs(supabase, userId)        // upsert defaults
updatePrefs(supabase, userId, patch)
getPrefsByToken(serviceClient, token)     // for the tokenized unsubscribe page
```

**Hook points (add one `createNotification` call inside each existing function — no signature changes):**

| Trigger | Where to hook | Notification |
|---|---|---|
| New follower | `src/lib/server/follows.ts:118` `followUser`, after successful insert | `new_follower`, actor = follower; **also send immediate email** via `sendFollowerEmail()` if `social_immediate` |
| Summit reaction | `src/lib/server/reactions.ts:16` `toggleReaction`, **only on the insert branch** (toggle-off must not notify); recipient = summit owner (the toggle already touches the summit row — fetch `user_id` there) | `summit_reaction`, payload: peak name/slug |
| Summit comment | `src/lib/server/comments.ts:28` `createComment`, after insert; recipient = summit owner | `summit_comment`, payload: 140-char excerpt, peak name |
| Achievement earned | `src/lib/server/achievements.ts` `checkAndAwardAchievements`, once per newly-awarded id | `achievement`, actor = null, payload: achievement id/name (defs in `packages/shared/src/data/achievements.ts`) |
| Weather alert | End of the weather webhook (`src/routes/api/webhooks/weather/+server.ts`), after forecasts written: for each peak whose next-72h summit-band forecast crosses thresholds (wind_gust ≥ 60mph, snow ≥ 3in, thunderstorm weather codes 95–99), notify every `peak_watchlist` watcher | `weather_alert`, service-role insert; **immediate email** if `weather_alerts`; dedupe: skip if same user+peak+`weather_alert` row exists < 48h old |
| Forum reply / mention | `src/lib/server/forum/` replies + mentions modules (`forum_mentions` table already exists) | `forum_reply` / `forum_mention` — **v1.1, digest-only; skip in v1** |

### 2.3 The weekly digest — the loop to build first

**Cadence & framing:** **Thursday 13:00 UTC (7:00 AM Mountain), weekly.** Not Monday-recap — Thursday is when Colorado hikers commit to weekend plans, and it lets the digest lead with the *weekend forecast for your watchlisted peaks*, which is a reason to open even when the social section is empty (the pre-launch reality). Subject line pattern: `"Weekend outlook: <top watchlist peak> + 3 more"` — weather is the hook, social is the dessert.

**Endpoint:** `src/routes/api/webhooks/digest/+server.ts`, cloned from the weather webhook's auth pattern (`x-webhook-secret` header + `safeSecretEqual`, `src/routes/api/webhooks/weather/+server.ts:88-98`, plus its existing rate-limit guard). Scheduled on the same cron service as F-02 (Railway cron / cron-job.org). Uses the service-role client.

**Digest algorithm (per user; batch users in pages of ~100):**
1. Skip if `unsubscribed_all` or `weekly_digest = false`, or `digest_runs` already has this `(user_id, 'weekly', period_start)`.
2. **Weather section:** for each of the user's watchlist peaks (`getUserWatchlist`, `src/lib/server/watchlist.ts:22` — note v1 reads legacy `peak_conditions`; the digest should read `peak_forecasts` via `getForecastForPeak` in `src/lib/server/conditions.ts` instead), render Sat/Sun summit-band summary: hi/lo, max gust, precip, weather icon-word. Cap at 5 peaks. Deep-link each to `/peaks/[slug]/weather` — the Pro page, with the P-5 free taste. **The digest is a weekly Pro impression.**
3. **Social section:** `notifications where user_id = ? and emailed_at is null and created_at > period_start`, grouped by type, rendered from `payload` (no joins): "Sarah and 2 others cheered your Elbert summit · Mike commented: '…' · You earned Sawatch Finisher".
4. **Community section (optional, cold-start filler):** 2–3 newest forum topics — reuses F-10 seeding as content.
5. **Skip rule:** if watchlist is empty AND social rows are zero → don't send; instead (max once per 30 days) send the fallback nudge: "Watch a peak to get weekend summit forecasts" linking to `/peaks`. Never send a truly empty digest.
6. Send via `sendRaw()` (`src/lib/server/sparrow.ts:27` — from `hello@saltgoat.co`, HTML built by a `renderDigest(sections)` template function in `src/lib/server/email/digest.ts`; inline CSS, table layout, dark-mode-safe).
7. On success: `update notifications set emailed_at = now() where id in (...)`; insert `digest_runs` row. On per-user failure: log and continue the batch — one bad address must not kill the run.

**Immediate emails (same infra, no cron):** `new_follower` and `weather_alert` send at event time via `sendRaw`, then set `emailed_at` immediately so the digest never repeats them.

### 2.4 Unsubscribe & preferences (required before ANY digest sends — deliverability and law)

- **Route `GET /email/preferences?token=<unsubscribe_token>`** — token-authed (no login; email clicks must work anywhere): toggles for weekly digest / follower emails / weather alerts / product updates + "Unsubscribe from all". `POST` updates via `getPrefsByToken` + service role.
- **Route `GET /email/unsubscribe?token=...&scope=all|digest`** — one-click, no confirmation screen, sets the flag, shows "You're unsubscribed. [Manage preferences]".
- Every email footer: both links + physical mailing address line (CAN-SPAM).
- **List separation:** Sparrow's Listmonk `saltgoat-newsletter` list remains the *marketing* channel (`product_updates` pref should call `subscribe()`/unsubscribe there). Digest + immediate notifications are *transactional-ish* via `sendRaw` governed by `email_preferences`. Do not conflate them — unsubscribing from the newsletter must not silently kill weather alerts, and vice versa.

**Build order for Sonnet:** (1) migration → regen types (`supabase gen types`, keep `@saltgoat/shared` in sync) → (2) `notifications.ts` module + the 4 social/achievement hooks → (3) prefs + unsubscribe routes → (4) digest endpoint + template + cron → (5) immediate follower/weather emails. Steps 1–3 are shippable alone; the in-app bell is a later consumer of the same table, zero rework. **Dependencies:** F-05 (`SPARROW_URL` set, one verified real email) and F-02 (weather cron) must land first.

---

## Part 3 — Activation & Onboarding

### 3.0 The insight

Today signup dead-ends: `/auth/callback/+server.ts:19-21` redirects new users to `/` — a marketing homepage — with no state, no prompt, nothing to do. But SaltGoat's users are not starting from zero: **almost every Colorado hiker who signs up has already climbed 14ers.** The "aha" is seeing *your* progress materialize — "7/58" on a grid you now want to fill. That means onboarding is a **backfill checklist**, not a tutorial. Strava's aha needs a run; SaltGoat's needs 60 seconds of tapping peaks you've already done.

### 3.1 The activation metric (the only one)

> **A72: % of new signups who log ≥1 summit within 72 hours of account creation.**

Backfilled or fresh both count — a backfilled summit populates the grid, feeds the leaderboard, and creates the "fill it in" pull identically. Target: **≥60%** with the flow below (it's one tap inside a forced-choice flow; below 40% means the flow is broken, not the users). Secondary diagnostics (track, don't optimize): % completing onboarding, % adding ≥1 watchlist peak (the retention-loop feeder), median summits backfilled. Measure with two timestamps you already have: `profiles.created_at` vs. `min(user_summits.created_at)` — an admin-dashboard SQL query, no analytics vendor needed.

### 3.2 The flow: `/welcome` (new route, 3 steps, skippable but default-forward)

**Entry:** in `/auth/callback/+server.ts`, when the authenticated user's summit count is 0 and profile age < 24h, redirect to `/welcome` instead of `/`. (Fresh-signup detection via profile `created_at`; also handles OAuth signups, which skip any email-signup path.)

**Step 1 — "Which 14ers have you already climbed?"** Full-screen grid of all 58 peaks (name + range + elevation, thumbnails from `peaks.thumbnail_url`), ordered by popularity (Quandary, Bierstadt, Grays/Torreys, Elbert first), search box, multi-select. One optional **year** dropdown per selected peak (default: current year; stored as `date_summited = YYYY-07-01` — the schema requires a date, mid-season approximation is honest enough, editable later from the profile). Prominent "I haven't climbed one yet →" skip link — those users jump to Step 2 with aspirational framing.
Submit → single form action bulk-inserting `user_summits` (reuse `createSummit` per row so `checkAndAwardAchievements` fires — instant badges for backfillers) → celebratory interstitial: **"7 of 58. Welcome to the climb."**

**Step 2 — "Which peak is next?"** Pick 1–3 peaks → `addToWatchlist` (`src/lib/server/watchlist.ts:82`). Copy: *"We'll send you the weekend summit forecast for peaks you're watching."* This is the load-bearing step: it's the explicit consent moment that feeds the Part-2 digest AND creates the user's personal recurring reason to return. Suggest peaks adjacent to what they backfilled (same range, next class up); for skippers, suggest the classic first-timers (the first-fourteener quiz logic already encodes this).

**Step 3 — Land on `/profile`** with the grid populated, achievements visible, and a one-time toast: "Check Saturday's summit forecast for \<watchlist peak #1\> →" linking to `/peaks/[slug]/weather`. First session ends *inside the Pro wedge surface* with the free taste (P-5) on screen.

### 3.3 The free-cap collision (decision required)

A user backfilling 12 summits hits the 5-summit wall (`canLogSummit`, `subscriptions.ts:49`) *mid-onboarding* — the worst possible first impression, and it caps the aha at "5/58" for exactly the power users most likely to pay. **Recommendation: exempt onboarding backfill from the cap.** Implementation: add `logged_via text default 'manual'` to `user_summits` (values: `manual` | `onboarding` | `api`); `canLogSummit` counts only `logged_via != 'onboarding'`. The cap becomes a forward-looking meter on *new* logging — which still bites at the moment of highest engagement (just got home from a summit), while Pro's lead pitch is weather anyway (P-1). Cost: a hardcore user could log 58 at onboarding and never pay the logging cap — acceptable, because that user is precisely who the weather wedge and P-2 founder rate are for, and an aggrieved walled user at minute one pays nothing and tells friends. Guard: the exemption applies only to summits created via the `/welcome` action (server-side flag, not client-claimable). Mobile note: `POST /api/v1/summits` keeps enforcing the cap unchanged — API compatibility preserved; mobile onboarding parity can follow later.

**Empty-state CTAs to retrofit** (each currently renders a blank section): `/profile` with 0 summits → "Add the 14ers you've climbed" → `/welcome` (make the flow re-enterable); logged-in homepage with 0 summits → checklist card, same link; `/peaks/[slug]` for a peak not yet summited → keep the existing "Log summit" button primary (already sound per F-audit); activity "Following" tab empty → render `getSuggestedUsers` (`follows.ts:146`) inline instead of a blank feed.

**Effort:** M total — `/welcome` route + 3 steps (Sonnet), `logged_via` migration (Haiku), callback redirect (Haiku), empty states (Haiku/Sonnet). Ship pre-launch: onboarding is the multiplier on every acquisition dollar/hour spent later.

---

## How the three parts compound

Onboarding backfill (Part 3) creates the watchlist → the watchlist powers the Thursday weekend-forecast digest (Part 2) → every digest deep-links into the weather page where the free 48h taste and the repositioned Pro pitch live (Part 1, P-1/P-5) → Pro's flagship gets a weekly, habitual impression at exactly the moment (Thursday, planning a weekend hike) the $29.99 question answers itself. Build in that order.

# T1-9 / T1-10 — Scale Specs: SQL-side aggregation + achievement-path parallelization

**Status:** execution-ready spec (no app code changed yet)
**Source findings:** `docs/audit/B-backend.md` — B4 (T1-9) and B5 (T1-10)
**Draft migration:** `supabase/migrations/PLACEHOLDER_TIMESTAMP_scale_leaderboard_follows.sql` (T1-9 only; T1-10 needs no schema change)
**Files touched at implementation time:**
- `src/lib/server/leaderboard.ts` (replace `getLeaderboard` internals)
- `src/lib/server/follows.ts` (replace `getSuggestedUsers` internals)
- `src/lib/server/achievements.ts` (parallelize `getAchievementStats` + `checkAndAwardAchievements`)
- `supabase/migrations/` (rename + push the draft migration)
- `packages/shared/src/types/database.ts` (regenerate after push)

**Implementation order (matters):**
1. Rename migration `PLACEHOLDER_TIMESTAMP_...` → real timestamp (must sort after `20260421000000_...`, e.g. `20260722000000_scale_leaderboard_follows.sql`), `supabase db push`.
2. Regenerate types: `supabase gen types typescript --project-id seywnbufuewbiwoouwkk 2>/dev/null > packages/shared/src/types/database.ts`. This adds the three functions under `Database['public']['Functions']`, making `supabase.rpc('leaderboard_entries', …)` fully typed. **Do not skip** — without it the `rpc()` calls won't type-check.
3. Apply the TypeScript changes below. `npm run build` must pass.
4. T1-10 is independent of steps 1–3 and can land in the same PR or separately.

---

## T1-9 — Push leaderboard + follow-suggestion aggregation into SQL

### Problem (exact, from code)

`getLeaderboard()` (`src/lib/server/leaderboard.ts:24-152`) runs 3 queries per request, two unbounded:
1. **every** row of `user_summits` with a `routes(elevation_gain_ft)` join (lines 29-36),
2. **every** row of `profiles` (44-46),
3. all active pro `user_subscriptions` (60-64),

then aggregates unique peaks / totals / ranks in JS. PostgREST caps each response at **1000 rows**, so past 1000 summit rows the leaderboard is silently **wrong** (missing summits, wrong ranks, wrong `totalSummitsLogged`), long before it is slow.

`getSuggestedUsers()` (`src/lib/server/follows.ts:147-244`) fetches **every `user_summits` row of every other user** with a `profiles` join (170-177) to compute peak overlap in JS. Same 1000-row wrongness, plus it runs on every profile "buddies" tab load (`src/routes/profile/+page.server.ts:145`) and `GET /api/v1/follows` (`src/routes/api/v1/follows/+server.ts:17`).

**Latent bug being fixed for free:** the leaderboard's pro-badge query reads `user_subscriptions` through the caller's session client, but that table's RLS is own-read only (`20250308000000_add_subscriptions.sql:20`). Today `isPro` is therefore `false` for everyone except the viewer themself. The SQL function (SECURITY DEFINER) computes it correctly for all users.

### Design

Three Postgres functions (full SQL in the draft migration, mirrored at the bottom of this doc):

| Function | Returns | Security | Callable by |
|---|---|---|---|
| `leaderboard_entries(p_limit int default 50)` | top-N ranked rows | `SECURITY DEFINER`, `search_path = public, pg_temp` | anon, authenticated |
| `leaderboard_stats()` | 1 row: total_climbers, total_summits_logged, peak_baggers, total_peaks | `SECURITY DEFINER`, pinned | anon, authenticated |
| `suggested_climbers(p_limit int default 10)` | top-N overlap suggestions for `auth.uid()` | `SECURITY INVOKER`, pinned | authenticated only |

Design decisions and why:

- **RPC functions, not views.** The leaderboard needs `user_subscriptions` (own-read RLS) — a plain view would run with invoker rights and reproduce the isPro bug; a `security_barrier`-less view owned by `postgres` bypasses RLS for *all* columns which is broader exposure than needed. A DEFINER function exposes exactly one derived boolean. Suggestions need `auth.uid()` and a per-caller limit — a function is the natural shape. No materialized view yet (see "Future" below).
- **`SECURITY DEFINER` justification + containment (leaderboard only):**
  - Needed solely to read `user_subscriptions` rows of other users, reduced to `is_pro boolean` (the leaderboard UI already displays this badge, so it is intended-public information).
  - `SET search_path = public, pg_temp` pinned (repo convention per `20260421000000_fix_signup_search_path.sql`).
  - `REVOKE ALL … FROM PUBLIC` then explicit `GRANT EXECUTE` (functions default to PUBLIC-executable — the revoke is mandatory for any DEFINER function).
  - Privacy parity: DEFINER bypasses `profiles` RLS, so the function re-implements it — private profiles render as `'Anonymous Climber'` unless `p.id = auth.uid()` (the viewer sees their own name, exactly as RLS gives them today). `user_id`s of private profiles were already public via `user_summits` public-read RLS; no new exposure.
  - `STABLE`, `LANGUAGE sql` — inlinable, plannable, no plpgsql overhead.
- **`suggested_climbers` is INVOKER** — everything it reads (`user_summits`, `user_follows` = public-read; `profiles` = public-or-own) is visible to the invoker; no privilege needed. The viewer is `auth.uid()`, **not a parameter**, so the function cannot be aimed at another user's data. Anonymous callers get zero rows (empty `my_peaks`).
- **Correct tie-rank semantics preserved:** JS assigns equal rank on ties of `(uniquePeaks, totalSummits)` and skips ranks after ties — that is exactly `rank() OVER (ORDER BY unique_peaks DESC, total_summits DESC)`. A deterministic `user_id` tie-break is added to the final ORDER BY (display order only; rank values still tie).
- **Overlap query is proportional to the viewer's peaks, not the table:** `my_peaks` (≤58 rows) drives an index join on `(peak_id, user_id)`; `summit_count` is computed only for the final `p_limit` candidates.
- **`total_peaks` returned by `leaderboard_stats()`** so JS can stop hardcoding 58 for `progress` and `peakBaggers` (SaltGoat lore says 58; the DB is authoritative).

### Deliberate behavior deltas (document in PR)

1. `isPro` becomes correct for all rows (was: only the viewer). **Bug fix.**
2. `peakBaggers` threshold = live `count(peaks)` instead of hardcoded 58.
3. Suggestions' `summitCount` = **distinct peaks** (was raw summit-row count in `getSuggestedUsers`, inconsistently distinct-peaks in `enrichUsersWithStats`; standardize on distinct).
4. Suggestion ties (equal overlap) order by `user_id` instead of JS Map insertion order — arbitrary either way.
5. All results correct past 1000 rows (the point of the exercise).

### Index needs

Added in the migration (both `IF NOT EXISTS`):

```sql
create index if not exists user_summits_user_peak_idx on public.user_summits (user_id, peak_id);
create index if not exists user_summits_peak_user_idx on public.user_summits (peak_id, user_id);
```

- `(user_id, peak_id)` → index-only `GroupAggregate` for `count(distinct peak_id)` per user (leaderboard agg, `summit_count` subquery).
- `(peak_id, user_id)` → index-only nested-loop for the overlap join (`my_peaks → user_summits`).
- Already exist and are sufficient elsewhere: `user_summits_user_id_idx`, `user_summits_peak_id_idx` (now redundant with the composites — optional cleanup, do NOT drop in this migration), `user_follows_follower_id_idx`, `idx_subscriptions_user`, `profiles_is_public_idx`.

### TypeScript call-site changes

#### `src/lib/server/leaderboard.ts` — `getLeaderboard`

Interfaces `LeaderboardEntry` / `LeaderboardStats` are **unchanged** (callers: `src/routes/leaderboard/+page.server.ts:10` — untouched). Replace the entire body of `getLeaderboard` (lines 24-152):

**Before (abridged):** 3 sequential queries (`user_summits` full table + routes join → `profiles` full table → pro subs), then ~90 lines of Map-based aggregation, sorting, and rank assignment.

**After:**

```ts
// Get leaderboard data — aggregation runs in Postgres (leaderboard_entries /
// leaderboard_stats RPCs), correct beyond PostgREST's 1000-row cap.
export async function getLeaderboard(
  supabase: SupabaseClient<Database>,
  limit: number = 50
): Promise<{ entries: LeaderboardEntry[]; stats: LeaderboardStats }> {
  const empty = { entries: [], stats: { totalClimbers: 0, totalSummitsLogged: 0, peakBaggers: 0 } };

  const [entriesRes, statsRes] = await Promise.all([
    supabase.rpc('leaderboard_entries', { p_limit: limit }),
    supabase.rpc('leaderboard_stats')
  ]);

  if (entriesRes.error) {
    logger.error('Error fetching leaderboard entries', { error: entriesRes.error });
    return empty;
  }
  if (statsRes.error) {
    logger.error('Error fetching leaderboard stats', { error: statsRes.error });
    return empty;
  }

  const statsRow = statsRes.data?.[0];
  const totalPeaks = Number(statsRow?.total_peaks ?? 58) || 58;

  const entries: LeaderboardEntry[] = (entriesRes.data ?? []).map((row) => ({
    rank: Number(row.rank),
    userId: row.user_id,
    displayName: row.display_name ?? 'Anonymous Climber',
    uniquePeaks: Number(row.unique_peaks),
    totalSummits: Number(row.total_summits),
    progress: (Number(row.unique_peaks) / totalPeaks) * 100,
    lastSummitDate: row.last_summit_date,
    totalElevationGain: Number(row.total_elevation_gain),
    isPro: row.is_pro
  }));

  return {
    entries,
    stats: {
      totalClimbers: Number(statsRow?.total_climbers ?? 0),
      totalSummitsLogged: Number(statsRow?.total_summits_logged ?? 0),
      peakBaggers: Number(statsRow?.peak_baggers ?? 0)
    }
  };
}
```

Notes:
- `getRecentActivity` (lines 155-188) is already limited and fine — leave it alone.
- If, after type regen, `rpc('leaderboard_entries')` still doesn't type-check (e.g. shared-package barrel lag), the row shapes are: `{ rank: number; user_id: string; display_name: string | null; unique_peaks: number; total_summits: number; last_summit_date: string | null; total_elevation_gain: number; is_pro: boolean }` and `{ total_climbers: number; total_summits_logged: number; peak_baggers: number; total_peaks: number }` — but prefer fixing the regen over casting.
- Optional (recommended, one line, from B4): in `src/routes/leaderboard/+page.server.ts` add `setHeaders({ 'cache-control': 'public, max-age=60' })` — the page is identical for all anon viewers.

#### `src/lib/server/follows.ts` — `getSuggestedUsers`

**Before:** lines 147-244 — 3 queries (own peaks, own follows, ALL other users' summits + profile join) + Map-based overlap scoring.

**After (full replacement of the function; signature kept so `profile/+page.server.ts:145` and `api/v1/follows/+server.ts:17` don't change):**

```ts
// Get "Climbers Like You" suggestions based on peak overlap.
// Aggregation runs in Postgres (suggested_climbers RPC); the viewer is derived
// from the JWT (auth.uid()) inside the function, so `userId` is only used for
// a sanity guard. Requires an authenticated supabase client.
export async function getSuggestedUsers(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 10
): Promise<UserWithFollowStatus[]> {
  void userId; // identity comes from the client's JWT via auth.uid()

  const { data, error } = await supabase.rpc('suggested_climbers', { p_limit: limit });

  if (error) {
    logger.error('Error fetching suggested climbers', { error });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    display_name: row.display_name,
    username: row.username,
    avatar_url: row.avatar_url,
    bio: row.bio,
    is_following: false, // followed users are excluded inside the RPC
    summitCount: Number(row.summit_count),
    peakOverlap: Number(row.peak_overlap)
  }));
}
```

RPC row shape: `{ id: string; display_name: string | null; username: string | null; avatar_url: string | null; bio: string | null; summit_count: number; peak_overlap: number }`.

**Caveat:** both call sites pass a session-bearing client (SSR cookie client / `requireAuth` Bearer client), so `auth.uid()` resolves. If anyone ever calls this with the service-role or anon client, it returns `[]` (uid is null) — that is the safe failure mode. Do not "fix" it by adding a user-id parameter to a DEFINER variant.

### Verification checklist (implementer)

1. `supabase db push` succeeds; re-running the migration file is a no-op (idempotent: `drop function if exists` + `create`, `if not exists` indexes).
2. In SQL editor as `anon`: `select * from leaderboard_entries(5);` returns ranked rows; `select * from suggested_climbers(5);` returns 0 rows (no JWT).
3. As an authenticated user with summits: suggestions exclude self, exclude already-followed, exclude private profiles, all `peak_overlap >= 1`.
4. `/leaderboard` page renders identically (ranks, ties, progress bars); a second account's pro badge now shows (previously broken).
5. `npm run build` passes with zero `as any` around the rpc calls.

### Future (explicitly out of scope now)

- **Materialized view** for `leaderboard_entries`' inner aggregate once `user_summits` passes ~1M rows, refreshed `CONCURRENTLY` via pg_cron or piggybacked on the weather webhook. The RPC signature would not change — only its body — so call sites are future-proof.
- Cursor pagination for a "full leaderboard" page: add `p_offset`/keyset params to `leaderboard_entries` when the product needs page 2 (UI today shows top 50 only).

---

## T1-10 — Parallelize the achievement hot path

### Current sequential chain (exact map)

`checkAndAwardAchievements(supabase, userId, trigger)` (`src/lib/server/achievements.ts:158-201`) is called synchronously, response-blocking, from 6 sites (API: `api/v1/summits/+server.ts:67`, `api/v1/peaks/[slug]/reviews/+server.ts:45`, `api/v1/peaks/[slug]/trail-reports/+server.ts:56`; web actions: `peaks/[slug]/+page.server.ts:131,197,456`). It must stay on-path — the response contract returns `newAchievements` for the celebration UI.

Sequential awaits today (each ~20-50 ms Railway→Supabase RTT):

| # | Query | Where | Depends on |
|---|---|---|---|
| Q1 | `user_summits` for user, joined `peaks(id,range)` + `routes(difficulty_class)` | `getAchievementStats` :60 | nothing |
| Q2 | ALL `peaks (id, range)` (58 rows) | :72 | nothing |
| Q3 | ALL standard `routes (peak_id, difficulty_class)` (~58 rows) | :74 | nothing |
| Q4 | `user_reviews` count for user | :80 | nothing |
| Q5 | `trail_reports` count for user | :86 | nothing |
| Q6 | `user_achievements (achievement_id)` for user | `checkAndAwardAchievements` :167 | nothing |
| Q7 | INSERT into `user_achievements` (only when `newlyEarned.length > 0`) | :187 | Q1–Q6 (the check) |

**All of Q1–Q6 are mutually independent** — pure reads, none consumes another's output. Only Q7 depends on the computed check. In-memory work (`ACHIEVEMENTS` loop, `checkAchievementCondition`) is negligible.

Additionally, **per trigger most queries are dead weight** (`checkAchievementCondition` :204-262 proves it by inspection):

| Trigger | Stats actually read | Queries needed |
|---|---|---|
| `summit` | uniquePeaks, rangeStats, classStats, hasSummer/WinterSummit | Q1, Q2, Q3 (+Q6) |
| `review` | reviewCount only | Q4 (+Q6) |
| `trail_report` | trailReportCount only | Q5 (+Q6) |

### Target structure — 2 waves

**Wave A (one `Promise.all`):** Q6 + the trigger-relevant subset of Q1–Q5. **Wave B (conditional):** the award write.

`getAchievementStats` gains an **optional** `trigger` param — omitted ⇒ all five queries run (in parallel), preserving today's exported behavior for any future caller; provided ⇒ irrelevant queries are skipped and their stats default to zero/false (safe: zeroed stats can only *suppress* awards for categories that the trigger never checks anyway).

```ts
// src/lib/server/achievements.ts — target shape

type AchievementTrigger = 'summit' | 'review' | 'trail_report';

export async function getAchievementStats(
  supabase: SupabaseClient<Database>,
  userId: string,
  trigger?: AchievementTrigger            // NEW, optional — omit = full stats
): Promise<AchievementStats> {
  const needSummits = !trigger || trigger === 'summit';   // Q1, Q2, Q3
  const needReviews = !trigger || trigger === 'review';   // Q4
  const needReports = !trigger || trigger === 'trail_report'; // Q5

  const skipRows = Promise.resolve({ data: null as null, error: null });
  const skipCount = Promise.resolve({ count: 0, error: null });

  // ---- Wave A (this function's share): all independent, one round-trip wall
  const [summitsRes, peaksRes, routesRes, reviewRes, reportRes] = await Promise.all([
    needSummits
      ? supabase.from('user_summits')
          .select(`id, peak_id, date_summited, peak:peaks(id, range), route:routes(difficulty_class)`)
          .eq('user_id', userId)
      : skipRows,
    needSummits ? supabase.from('peaks').select('id, range') : skipRows,
    needSummits
      ? supabase.from('routes').select('peak_id, difficulty_class').eq('is_standard', true)
      : skipRows,
    needReviews
      ? supabase.from('user_reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      : skipCount,
    needReports
      ? supabase.from('trail_reports').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      : skipCount
  ]);

  const summits = summitsRes.data;
  const allPeaks = peaksRes.data;
  const allRoutes = routesRes.data;
  const reviewCount = 'count' in reviewRes ? reviewRes.count : 0;
  const trailReportCount = 'count' in reportRes ? reportRes.count : 0;

  // ---- everything below is UNCHANGED from the current implementation:
  // summitedPeakIds / uniquePeaks (current :92-93), rangeStats (:96-105),
  // classStats + peakClassMap (:108-132), hasSummerSummit/hasWinterSummit
  // (:135-144), and the same return object (:146-154).
  // (Copy verbatim; it is pure in-memory aggregation over the vars above.)
}

export async function checkAndAwardAchievements(
  supabase: SupabaseClient<Database>,
  userId: string,
  trigger: AchievementTrigger
): Promise<string[]> {
  // ---- Wave A: stats queries and earned-set are independent
  const [stats, earnedRes] = await Promise.all([
    getAchievementStats(supabase, userId, trigger),
    supabase.from('user_achievements').select('achievement_id').eq('user_id', userId)
  ]);

  const earnedIds = new Set(earnedRes.data?.map((a) => a.achievement_id) ?? []);
  const newlyEarned: string[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (earnedIds.has(achievement.id)) continue;
    if (checkAchievementCondition(achievement, stats, trigger)) newlyEarned.push(achievement.id);
  }

  // ---- Wave B: dependent write (unchanged condition)
  if (newlyEarned.length > 0) {
    const { error } = await supabase.from('user_achievements').upsert(
      newlyEarned.map((id) => ({ user_id: userId, achievement_id: id })),
      { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
    );
    if (error) {
      logger.error('Error awarding achievements', { error });
      return [];
    }
  }
  return newlyEarned;
}
```

Implementation notes for Sonnet:
- The `skipRows`/`skipCount` sentinels keep the destructuring tuple shape stable; if the `'count' in reviewRes` narrowing fights the Supabase builder types, an equally acceptable form is `(reviewRes as { count: number | null }).count ?? 0` — pick whichever compiles clean, no `any`.
- `checkAchievementCondition`, `getUserAchievements`, `markAchievementsNotified`, `getUnnotifiedCount` are untouched.
- `Promise.all` inside `getAchievementStats` nests under the outer `Promise.all` in `checkAndAwardAchievements` — the earned-set query genuinely rides the same wall-clock wave as the stats queries. Net structure: **one parallel read wave, one conditional write.**
- The 6 call sites need **no changes** (same signature, same return contract `string[]`).
- The insert→**upsert** swap is deliberate (see races below). `user_achievements` has `UNIQUE(user_id, achievement_id)` (`20241225000000_user_achievements.sql:9`), so `onConflict: 'user_id,achievement_id'` is valid; RLS insert policy (`auth.uid() = user_id`) is satisfied identically.

### Expected round-trip reduction

| Trigger | Before (sequential trips) | After | Read-wave latency @30ms RTT |
|---|---|---|---|
| summit | 6 reads + 0-1 write = 6-7 | 1 read wave (4 concurrent) + 0-1 write = 1-2 | ~180ms → ~35ms |
| review | 6 reads + 0-1 write | 1 read wave (2 concurrent) + 0-1 write | ~180ms → ~30ms |
| trail_report | 6 reads + 0-1 write | 1 read wave (2 concurrent) + 0-1 write | ~180ms → ~30ms |

Achievement phase drops **~75-85%** (150-300ms saved per write at 25-50ms RTT). `POST /api/v1/summits` total goes from ~10-11 sequential trips to ~5-6 (requireAuth, canLogSummit×2, insert, read wave, occasional award write). The remaining sequential trips are out of scope here (canLogSummit atomicity is finding B6; single-RPC stats is the documented longer-term step in B5).

### Races / consistency caveats

1. **No transaction — unchanged.** The 6 reads were already 6 independent PostgREST statements with no snapshot guarantee; running them concurrently does not weaken anything that held before. Supabase (no read replicas configured) gives read-your-writes, so the summit inserted at `api/v1/summits/+server.ts:55` is visible to wave A at :67.
2. **Duplicate-award race (pre-existing, now handled).** Two concurrent triggers for the same user can both compute the same `newlyEarned`. Today the second batch INSERT hits the unique constraint, the *whole batch* fails, and the user's toast is silently dropped (B8 territory). The upsert with `ignoreDuplicates: true` makes the second write a no-op instead of a failure. Residual harmlessness: both requests may report the same achievement in `newlyEarned` → at worst a duplicate celebration toast; never a lost or duplicated row.
3. **Skipped-query zeroing is award-suppressing only.** With `trigger` provided, zeroed stats belong exclusively to categories `checkAchievementCondition` never evaluates for that trigger (verified against :204-262: milestone/range/class/seasonal gate on `trigger === 'summit'`; community gates on `review`/`trail_report`). If a future achievement crosses triggers (e.g. "5 summits AND 5 reviews"), the trigger→queries table above **must** be updated in the same PR — leave a comment in the code saying exactly that.
4. **Error tolerance unchanged by design.** The stats queries continue to ignore per-query errors (null data ⇒ zeroed stats ⇒ awards suppressed, never wrongly granted: milestone needs `>=`, range/class need `summited === total && total > 0`, which zeroed inputs cannot satisfy). Missed awards self-heal on the next trigger, as today. Optionally add one `logger.warn` when any wave-A result carries an error — recommended, not required.

### Verification checklist (implementer)

1. `npm run build` passes.
2. Log a summit as a fresh user → response includes `first_summit` in `newAchievements`; row exists in `user_achievements`.
3. Log a review → review achievement awarded; confirm (network tab / logs) no `peaks`/`routes`/`user_summits` queries fired for the review trigger.
4. Re-trigger the same achievement (e.g. delete the row, fire two rapid parallel summit POSTs) → no 500, no duplicate rows, at least one response carries the achievement.
5. Both platforms: mobile summit logging (`POST /api/v1/summits`) and the web form action share this code path — spot-check web `/peaks/[slug]` "log summit" still shows the toast.

---

## Appendix — full draft migration SQL (mirror)

The authoritative draft lives at `supabase/migrations/PLACEHOLDER_TIMESTAMP_scale_leaderboard_follows.sql`; rename with a real timestamp before pushing. Contents:

```sql
-- ============================================================================
-- T1-9: Push leaderboard + follow-suggestion aggregation into Postgres
-- ============================================================================

-- 1) Indexes ------------------------------------------------------------------
create index if not exists user_summits_user_peak_idx
  on public.user_summits (user_id, peak_id);

create index if not exists user_summits_peak_user_idx
  on public.user_summits (peak_id, user_id);

-- 2) Leaderboard entries ------------------------------------------------------
drop function if exists public.leaderboard_entries(integer);

create function public.leaderboard_entries(p_limit integer default 50)
returns table (
  rank                 bigint,
  user_id              uuid,
  display_name         text,
  unique_peaks         bigint,
  total_summits        bigint,
  last_summit_date     date,
  total_elevation_gain bigint,
  is_pro               boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with agg as (
    select
      us.user_id,
      count(distinct us.peak_id)::bigint            as unique_peaks,
      count(*)::bigint                              as total_summits,
      max(us.date_summited)                         as last_summit_date,
      coalesce(sum(r.elevation_gain_ft), 0)::bigint as total_elevation_gain
    from user_summits us
    left join routes r on r.id = us.route_id
    group by us.user_id
  )
  select
    rank() over (order by a.unique_peaks desc, a.total_summits desc) as rank,
    a.user_id,
    case
      when p.id is not null and (p.is_public or p.id = auth.uid())
        then coalesce(p.display_name, 'Anonymous Climber')
      else 'Anonymous Climber'
    end as display_name,
    a.unique_peaks,
    a.total_summits,
    a.last_summit_date,
    a.total_elevation_gain,
    exists (
      select 1
      from user_subscriptions s
      where s.user_id = a.user_id
        and s.plan = 'pro'
        and s.status = 'active'
    ) as is_pro
  from agg a
  left join profiles p on p.id = a.user_id
  order by a.unique_peaks desc, a.total_summits desc, a.user_id
  limit p_limit;
$$;

revoke all on function public.leaderboard_entries(integer) from public;
grant execute on function public.leaderboard_entries(integer)
  to anon, authenticated, service_role;

-- 3) Leaderboard headline stats -----------------------------------------------
drop function if exists public.leaderboard_stats();

create function public.leaderboard_stats()
returns table (
  total_climbers       bigint,
  total_summits_logged bigint,
  peak_baggers         bigint,
  total_peaks          bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with per_user as (
    select us.user_id, count(distinct us.peak_id) as unique_peaks
    from user_summits us
    group by us.user_id
  ),
  tp as (
    select count(*)::bigint as total_peaks from peaks
  )
  select
    (select count(*)::bigint from per_user)                          as total_climbers,
    (select count(*)::bigint from user_summits)                      as total_summits_logged,
    (select count(*)::bigint
       from per_user, tp
      where per_user.unique_peaks >= tp.total_peaks)                 as peak_baggers,
    (select total_peaks from tp)                                     as total_peaks;
$$;

revoke all on function public.leaderboard_stats() from public;
grant execute on function public.leaderboard_stats()
  to anon, authenticated, service_role;

-- 4) Follow suggestions by peak overlap ----------------------------------------
drop function if exists public.suggested_climbers(integer);

create function public.suggested_climbers(p_limit integer default 10)
returns table (
  id           uuid,
  display_name text,
  username     text,
  avatar_url   text,
  bio          text,
  summit_count bigint,
  peak_overlap bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with me as (
    select auth.uid() as uid
  ),
  my_peaks as (
    select distinct us.peak_id
    from user_summits us
    join me on us.user_id = me.uid
  ),
  overlap as (
    select us.user_id, count(distinct us.peak_id)::bigint as peak_overlap
    from user_summits us
    join my_peaks mp on mp.peak_id = us.peak_id
    join me on true
    where us.user_id <> me.uid
      and not exists (
        select 1
        from user_follows f
        where f.follower_id = me.uid
          and f.following_id = us.user_id
      )
    group by us.user_id
  ),
  top_candidates as (
    select p.id, p.display_name, p.username, p.avatar_url, p.bio, o.peak_overlap
    from overlap o
    join profiles p on p.id = o.user_id and p.is_public = true
    order by o.peak_overlap desc, p.id
    limit p_limit
  )
  select
    t.id,
    t.display_name,
    t.username,
    t.avatar_url,
    t.bio,
    (select count(distinct us2.peak_id)::bigint
       from user_summits us2
      where us2.user_id = t.id) as summit_count,
    t.peak_overlap
  from top_candidates t
  order by t.peak_overlap desc, t.id;
$$;

revoke all on function public.suggested_climbers(integer) from public;
grant execute on function public.suggested_climbers(integer)
  to authenticated, service_role;
```

(The committed draft file additionally carries `comment on function` documentation strings — keep them when renaming.)

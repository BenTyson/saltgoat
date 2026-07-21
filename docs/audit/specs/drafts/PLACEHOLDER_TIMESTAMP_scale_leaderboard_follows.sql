-- ============================================================================
-- T1-9: Push leaderboard + follow-suggestion aggregation into Postgres
-- ----------------------------------------------------------------------------
-- DRAFT — rename this file with a real timestamp (e.g. 20260722000000_) before
-- `supabase db push`, then regenerate types:
--   supabase gen types typescript --project-id seywnbufuewbiwoouwkk 2>/dev/null \
--     > packages/shared/src/types/database.ts
--
-- Replaces the JS-side full-table aggregation in:
--   src/lib/server/leaderboard.ts  (getLeaderboard)
--   src/lib/server/follows.ts      (getSuggestedUsers)
-- which are wrong past PostgREST's 1000-row cap and O(all rows) on the wire.
--
-- Security model (see spec doc docs/audit/specs/T1-9-T1-10-scale-specs.md):
--   * leaderboard_entries / leaderboard_stats: SECURITY DEFINER, search_path
--     pinned. DEFINER is required because user_subscriptions RLS is own-read
--     only (today's JS leaderboard silently shows isPro=false for everyone
--     except the viewer — a live bug). The function exposes ONLY the derived
--     boolean is_pro and anonymizes private profiles' display names, matching
--     (and fixing) current behavior. Idempotent, EXECUTE revoked from PUBLIC.
--   * suggested_climbers: SECURITY INVOKER (all inputs are public-read under
--     RLS); viewer identity comes from auth.uid(), never from a parameter, so
--     it cannot be pointed at another user.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Indexes
-- ---------------------------------------------------------------------------
-- (user_id, peak_id): index-only scan for per-user distinct-peak aggregation
-- (leaderboard GROUP BY, summit_count subquery).
create index if not exists user_summits_user_peak_idx
  on public.user_summits (user_id, peak_id);

-- (peak_id, user_id): index-only scan for the overlap join in
-- suggested_climbers ("who else summited the peaks I summited").
create index if not exists user_summits_peak_user_idx
  on public.user_summits (peak_id, user_id);

-- Already present (from earlier migrations), listed for the record:
--   user_summits_user_id_idx (user_id), user_summits_peak_id_idx (peak_id),
--   user_follows_follower_id_idx, idx_subscriptions_user,
--   profiles_is_public_idx (partial, is_public = true).

-- ---------------------------------------------------------------------------
-- 2) Leaderboard entries
-- ---------------------------------------------------------------------------
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

comment on function public.leaderboard_entries(integer) is
  'Top-N leaderboard rows aggregated in SQL. SECURITY DEFINER solely to read '
  'user_subscriptions (own-read RLS) for the is_pro badge; private profiles '
  'are anonymized. rank() ties match the previous JS tie semantics.';

revoke all on function public.leaderboard_entries(integer) from public;
grant execute on function public.leaderboard_entries(integer)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Leaderboard headline stats
-- ---------------------------------------------------------------------------
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
    (select count(*)::bigint from per_user)                              as total_climbers,
    (select count(*)::bigint from user_summits)                          as total_summits_logged,
    (select count(*)::bigint
       from per_user, tp
      where per_user.unique_peaks >= tp.total_peaks)                     as peak_baggers,
    (select total_peaks from tp)                                         as total_peaks;
$$;

comment on function public.leaderboard_stats() is
  'Leaderboard headline stats. peak_baggers compares against live count(peaks) '
  'instead of the previously hardcoded 58.';

revoke all on function public.leaderboard_stats() from public;
grant execute on function public.leaderboard_stats()
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Follow suggestions ("Climbers Like You") by peak overlap
-- ---------------------------------------------------------------------------
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
    -- Only touches summit rows on peaks the viewer has summited
    -- (uses user_summits_peak_user_idx), never the whole table.
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

comment on function public.suggested_climbers(integer) is
  'Peak-overlap follow suggestions for the calling user (auth.uid()). '
  'SECURITY INVOKER: user_summits/user_follows are public-read; profiles RLS '
  'plus the explicit is_public = true filter hide private profiles. Returns '
  'empty for anonymous callers.';

revoke all on function public.suggested_climbers(integer) from public;
grant execute on function public.suggested_climbers(integer)
  to authenticated, service_role;

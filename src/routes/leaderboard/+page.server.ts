import type { PageServerLoad } from './$types';
import { getLeaderboard, getRecentActivity } from '$lib/server/leaderboard';

export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals;

  // Get leaderboard and recent activity in parallel
  const [leaderboardData, recentActivity] = await Promise.all([
    getLeaderboard(supabase, 50),
    getRecentActivity(supabase, 8)
  ]);

  return {
    leaderboard: leaderboardData.entries,
    stats: leaderboardData.stats,
    recentActivity
  };
};

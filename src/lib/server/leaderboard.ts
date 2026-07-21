import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  uniquePeaks: number;
  totalSummits: number;
  progress: number;
  lastSummitDate: string | null;
  totalElevationGain: number;
  isPro: boolean;
}

export interface LeaderboardStats {
  totalClimbers: number;
  totalSummitsLogged: number;
  peakBaggers: number; // Users who've completed all 58
}

// Get leaderboard data
export async function getLeaderboard(
  supabase: SupabaseClient<Database>,
  limit: number = 50
): Promise<{ entries: LeaderboardEntry[]; stats: LeaderboardStats }> {
  // Get all users with their summit counts
  const { data: summitData, error: summitError } = await supabase
    .from('user_summits')
    .select(`
      user_id,
      date_summited,
      peak_id,
      route:routes(elevation_gain_ft)
    `);

  if (summitError) {
    logger.error('Error fetching summit data', { error: summitError });
    return { entries: [], stats: { totalClimbers: 0, totalSummitsLogged: 0, peakBaggers: 0 } };
  }

  // Get all profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name');

  if (profileError) {
    logger.error('Error fetching profiles', { error: profileError });
    return { entries: [], stats: { totalClimbers: 0, totalSummitsLogged: 0, peakBaggers: 0 } };
  }

  // Build profile map
  const profileMap = new Map<string, string>();
  profiles?.forEach(p => {
    profileMap.set(p.id, p.display_name || 'Anonymous Climber');
  });

  // Get pro subscribers
  const { data: proSubs } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('plan', 'pro')
    .eq('status', 'active');

  const proUserIds = new Set((proSubs ?? []).map(s => s.user_id));

  // Aggregate by user
  const userStats = new Map<string, {
    uniquePeaks: Set<string>;
    totalSummits: number;
    lastSummitDate: string | null;
    totalElevationGain: number;
  }>();

  summitData?.forEach(summit => {
    const userId = summit.user_id;
    if (!userStats.has(userId)) {
      userStats.set(userId, {
        uniquePeaks: new Set(),
        totalSummits: 0,
        lastSummitDate: null,
        totalElevationGain: 0
      });
    }

    const stats = userStats.get(userId)!;
    stats.uniquePeaks.add(summit.peak_id);
    stats.totalSummits++;

    // Track most recent summit
    if (!stats.lastSummitDate || summit.date_summited > stats.lastSummitDate) {
      stats.lastSummitDate = summit.date_summited;
    }

    // Add elevation gain if route data available
    if (summit.route && typeof summit.route === 'object' && 'elevation_gain_ft' in summit.route) {
      stats.totalElevationGain += (summit.route as { elevation_gain_ft: number | null }).elevation_gain_ft || 0;
    }
  });

  // Convert to leaderboard entries and sort
  const entries: LeaderboardEntry[] = [];
  let peakBaggers = 0;

  userStats.forEach((stats, userId) => {
    const uniquePeaks = stats.uniquePeaks.size;
    if (uniquePeaks === 58) peakBaggers++;

    entries.push({
      rank: 0, // Will be set after sorting
      userId,
      displayName: profileMap.get(userId) || 'Anonymous Climber',
      uniquePeaks,
      totalSummits: stats.totalSummits,
      progress: (uniquePeaks / 58) * 100,
      lastSummitDate: stats.lastSummitDate,
      totalElevationGain: stats.totalElevationGain,
      isPro: proUserIds.has(userId)
    });
  });

  // Sort by unique peaks (desc), then total summits (desc)
  entries.sort((a, b) => {
    if (b.uniquePeaks !== a.uniquePeaks) return b.uniquePeaks - a.uniquePeaks;
    return b.totalSummits - a.totalSummits;
  });

  // Assign ranks (handling ties)
  let currentRank = 1;
  entries.forEach((entry, index) => {
    if (index > 0) {
      const prev = entries[index - 1];
      if (entry.uniquePeaks !== prev.uniquePeaks || entry.totalSummits !== prev.totalSummits) {
        currentRank = index + 1;
      }
    }
    entry.rank = currentRank;
  });

  // Calculate stats
  const totalStats: LeaderboardStats = {
    totalClimbers: entries.length,
    totalSummitsLogged: summitData?.length || 0,
    peakBaggers
  };

  return {
    entries: entries.slice(0, limit),
    stats: totalStats
  };
}

// Get recent activity for activity feed
export async function getRecentActivity(
  supabase: SupabaseClient<Database>,
  limit: number = 10
): Promise<Array<{
  userId: string;
  displayName: string;
  peakName: string;
  peakSlug: string;
  dateSummited: string;
}>> {
  const { data, error } = await supabase
    .from('user_summits')
    .select(`
      user_id,
      date_summited,
      profile:profiles(display_name),
      peak:peaks(name, slug)
    `)
    .order('date_summited', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching recent activity', { error: error });
    return [];
  }

  return (data || []).map(item => ({
    userId: item.user_id,
    displayName: (item.profile as { display_name: string | null })?.display_name || 'Anonymous',
    peakName: (item.peak as { name: string; slug: string }).name,
    peakSlug: (item.peak as { name: string; slug: string }).slug,
    dateSummited: item.date_summited
  }));
}

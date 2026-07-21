import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '$lib/types/database';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  RANGE_ACHIEVEMENT_MAP,
  MILESTONE_THRESHOLDS,
  type AchievementDef
} from '$lib/data/achievements';

export type UserAchievement = Tables<'user_achievements'>;

export type UserAchievementWithDef = UserAchievement & {
  definition: AchievementDef;
};

// Stats needed for achievement checking
export interface AchievementStats {
  uniquePeaks: number;
  rangeStats: Record<string, { total: number; summited: number }>;
  classStats: Record<number, { total: number; summited: number }>;
  reviewCount: number;
  trailReportCount: number;
  hasSummerSummit: boolean;
  hasWinterSummit: boolean;
}

// Get all earned achievements for a user
export async function getUserAchievements(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserAchievementWithDef[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) {
    logger.error('Error fetching achievements', { error: error });
    return [];
  }

  // Attach definitions
  return (data ?? [])
    .map((a) => ({
      ...a,
      definition: ACHIEVEMENT_MAP.get(a.achievement_id)!
    }))
    .filter((a) => a.definition); // Filter out any with missing definitions
}

// Get stats needed for achievement checking
export async function getAchievementStats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<AchievementStats> {
  // Get user summits with peak and route info
  const { data: summits } = await supabase
    .from('user_summits')
    .select(`
      id,
      peak_id,
      date_summited,
      peak:peaks(id, range),
      route:routes(difficulty_class)
    `)
    .eq('user_id', userId);

  // Get all peaks and routes for totals
  const { data: allPeaks } = await supabase.from('peaks').select('id, range');

  const { data: allRoutes } = await supabase
    .from('routes')
    .select('peak_id, difficulty_class')
    .eq('is_standard', true);

  // Get review count
  const { count: reviewCount } = await supabase
    .from('user_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get trail report count
  const { count: trailReportCount } = await supabase
    .from('trail_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Calculate unique peaks
  const summitedPeakIds = new Set(summits?.map((s) => s.peak_id) ?? []);
  const uniquePeaks = summitedPeakIds.size;

  // Calculate range stats
  const rangeStats: Record<string, { total: number; summited: number }> = {};
  allPeaks?.forEach((p) => {
    if (!rangeStats[p.range]) {
      rangeStats[p.range] = { total: 0, summited: 0 };
    }
    rangeStats[p.range].total++;
    if (summitedPeakIds.has(p.id)) {
      rangeStats[p.range].summited++;
    }
  });

  // Calculate class stats
  const classStats: Record<number, { total: number; summited: number }> = {
    1: { total: 0, summited: 0 },
    2: { total: 0, summited: 0 },
    3: { total: 0, summited: 0 },
    4: { total: 0, summited: 0 }
  };

  // Build peak -> class mapping from standard routes
  const peakClassMap = new Map<string, number>();
  allRoutes?.forEach((r) => {
    if (r.difficulty_class) {
      peakClassMap.set(r.peak_id, r.difficulty_class);
    }
  });

  // Count totals and summited by class
  allPeaks?.forEach((p) => {
    const diffClass = peakClassMap.get(p.id);
    if (diffClass && classStats[diffClass]) {
      classStats[diffClass].total++;
      if (summitedPeakIds.has(p.id)) {
        classStats[diffClass].summited++;
      }
    }
  });

  // Check for seasonal summits
  let hasSummerSummit = false;
  let hasWinterSummit = false;

  summits?.forEach((s) => {
    if (s.date_summited) {
      const month = new Date(s.date_summited + 'T12:00:00').getMonth() + 1;
      if (month >= 6 && month <= 8) hasSummerSummit = true;
      if (month === 12 || month === 1 || month === 2) hasWinterSummit = true;
    }
  });

  return {
    uniquePeaks,
    rangeStats,
    classStats,
    reviewCount: reviewCount ?? 0,
    trailReportCount: trailReportCount ?? 0,
    hasSummerSummit,
    hasWinterSummit
  };
}

// Check conditions and award new achievements
export async function checkAndAwardAchievements(
  supabase: SupabaseClient<Database>,
  userId: string,
  trigger: 'summit' | 'review' | 'trail_report'
): Promise<string[]> {
  // Get current stats
  const stats = await getAchievementStats(supabase, userId);

  // Get already earned achievements
  const { data: earned } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const earnedIds = new Set(earned?.map((a) => a.achievement_id) ?? []);
  const newlyEarned: string[] = [];

  // Check each achievement
  for (const achievement of ACHIEVEMENTS) {
    if (earnedIds.has(achievement.id)) continue;

    const shouldAward = checkAchievementCondition(achievement, stats, trigger);
    if (shouldAward) {
      newlyEarned.push(achievement.id);
    }
  }

  // Insert new achievements
  if (newlyEarned.length > 0) {
    const { error } = await supabase.from('user_achievements').insert(
      newlyEarned.map((id) => ({
        user_id: userId,
        achievement_id: id
      }))
    );

    if (error) {
      logger.error('Error awarding achievements', { error: error });
      return [];
    }
  }

  return newlyEarned;
}

// Check if a specific achievement should be awarded
function checkAchievementCondition(
  achievement: AchievementDef,
  stats: AchievementStats,
  trigger: 'summit' | 'review' | 'trail_report'
): boolean {
  const { id, category } = achievement;

  // Milestone achievements (trigger: summit)
  if (category === 'milestone' && trigger === 'summit') {
    const threshold = MILESTONE_THRESHOLDS.find((m) => m.id === id);
    if (threshold) {
      return stats.uniquePeaks >= threshold.count;
    }
  }

  // Range completion (trigger: summit)
  if (category === 'range' && trigger === 'summit') {
    // Find which range this achievement is for
    for (const [rangeName, achievementId] of Object.entries(RANGE_ACHIEVEMENT_MAP)) {
      if (achievementId === id) {
        const rangeData = stats.rangeStats[rangeName];
        if (rangeData && rangeData.summited === rangeData.total && rangeData.total > 0) {
          return true;
        }
      }
    }
  }

  // Class mastery (trigger: summit)
  if (category === 'class' && trigger === 'summit') {
    const classNum = parseInt(id.replace('class_', '').replace('_master', ''));
    if (!isNaN(classNum)) {
      const classData = stats.classStats[classNum];
      if (classData && classData.summited === classData.total && classData.total > 0) {
        return true;
      }
    }
  }

  // Community achievements
  if (category === 'community') {
    if (trigger === 'review') {
      if (id === 'first_review' && stats.reviewCount >= 1) return true;
      if (id === 'reviews_5' && stats.reviewCount >= 5) return true;
    }
    if (trigger === 'trail_report') {
      if (id === 'first_trail_report' && stats.trailReportCount >= 1) return true;
      if (id === 'trail_reports_5' && stats.trailReportCount >= 5) return true;
    }
  }

  // Seasonal achievements (trigger: summit)
  if (category === 'seasonal' && trigger === 'summit') {
    if (id === 'summer_summit' && stats.hasSummerSummit) return true;
    if (id === 'winter_summit' && stats.hasWinterSummit) return true;
  }

  return false;
}

// Mark achievements as notified (user has seen them)
export async function markAchievementsNotified(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_achievements')
    .update({ notified: true })
    .eq('user_id', userId)
    .eq('notified', false);

  if (error) {
    logger.error('Error marking achievements notified', { error: error });
  }
}

// Get count of unnotified achievements
export async function getUnnotifiedCount(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('user_achievements')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('notified', false);

  if (error) {
    logger.error('Error counting unnotified', { error: error });
    return 0;
  }

  return count ?? 0;
}

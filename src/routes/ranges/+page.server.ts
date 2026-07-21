import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { rangeData, type RangeInfo } from '$lib/data/ranges';

export interface RangeWithStats extends RangeInfo {
  peakCount: number;
  highestElevation: number;
  lowestElevation: number;
  highestPeak: string;
  classRange: string;
  userSummitedCount?: number;
}

export const load: PageServerLoad = async ({ cookies }) => {
  const supabase = createSupabaseServerClient(cookies);

  // Get all peaks with their standard route difficulty
  const { data: peaks } = await supabase
    .from('peaks')
    .select(`
      id,
      name,
      elevation,
      range,
      routes!inner (
        difficulty_class,
        is_standard
      )
    `)
    .eq('routes.is_standard', true);

  // Get session for user-specific data
  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  // Get user's summited peaks if logged in
  let userSummitedPeaks: Set<string> = new Set();
  if (session?.user) {
    const { data: summits } = await supabase
      .from('user_summits')
      .select('peak_id')
      .eq('user_id', session.user.id);

    summits?.forEach(s => userSummitedPeaks.add(s.peak_id));
  }

  // Build range stats
  const rangeStats: Record<string, {
    peaks: typeof peaks;
    summitedCount: number;
  }> = {};

  peaks?.forEach(peak => {
    if (!rangeStats[peak.range]) {
      rangeStats[peak.range] = { peaks: [], summitedCount: 0 };
    }
    rangeStats[peak.range].peaks.push(peak);
    if (userSummitedPeaks.has(peak.id)) {
      rangeStats[peak.range].summitedCount++;
    }
  });

  // Combine with range metadata
  const ranges: RangeWithStats[] = Object.entries(rangeData).map(([name, info]) => {
    const stats = rangeStats[name] || { peaks: [], summitedCount: 0 };
    const rangePeaks = stats.peaks || [];

    // Get elevation range
    const elevations = rangePeaks.map(p => p.elevation);
    const highestElevation = elevations.length > 0 ? Math.max(...elevations) : 0;
    const lowestElevation = elevations.length > 0 ? Math.min(...elevations) : 0;

    // Get highest peak name
    const highestPeak = rangePeaks.find(p => p.elevation === highestElevation)?.name || '';

    // Get class range
    const classes = rangePeaks
      .map(p => (p.routes as any)?.[0]?.difficulty_class)
      .filter(Boolean);
    const minClass = classes.length > 0 ? Math.min(...classes) : 0;
    const maxClass = classes.length > 0 ? Math.max(...classes) : 0;
    const classRange = minClass === maxClass
      ? `Class ${minClass}`
      : `Class ${minClass}-${maxClass}`;

    return {
      ...info,
      peakCount: rangePeaks.length,
      highestElevation,
      lowestElevation,
      highestPeak,
      classRange,
      userSummitedCount: session ? stats.summitedCount : undefined
    };
  });

  // Sort by peak count descending
  ranges.sort((a, b) => b.peakCount - a.peakCount);

  return {
    ranges,
    isLoggedIn: !!session
  };
};

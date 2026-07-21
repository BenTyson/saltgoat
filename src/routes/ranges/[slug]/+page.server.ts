import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { rangeData } from '$lib/data/ranges';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createSupabaseServerClient(cookies);

  // Find range info by slug
  const rangeInfo = Object.values(rangeData).find(r => r.slug === params.slug);

  if (!rangeInfo) {
    throw error(404, { message: 'Range not found' });
  }

  // Get all peaks in this range with their standard route
  const { data: peaks, error: peaksError } = await supabase
    .from('peaks')
    .select(`
      *,
      routes (
        id,
        name,
        slug,
        distance_miles,
        elevation_gain_ft,
        difficulty_class,
        typical_time_hours,
        is_standard
      )
    `)
    .eq('range', rangeInfo.name)
    .order('elevation', { ascending: false });

  if (peaksError) {
    console.error('Error fetching peaks:', peaksError);
    throw error(500, { message: 'Failed to load peaks' });
  }

  // Transform peaks to include standard_route at top level
  const peaksWithStandardRoute = (peaks || []).map(peak => {
    const standardRoute = peak.routes?.find((r: any) => r.is_standard);
    const { routes, ...peakData } = peak;
    return {
      ...peakData,
      standard_route: standardRoute || null,
      routes
    };
  });

  // Get session for user-specific data
  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  // Get user's summited peaks if logged in
  let userSummitedPeaks: Record<string, string> = {}; // peakId -> most recent date
  if (session?.user) {
    const { data: summits } = await supabase
      .from('user_summits')
      .select('peak_id, date_summited')
      .eq('user_id', session.user.id);

    summits?.forEach(s => {
      if (!userSummitedPeaks[s.peak_id] || s.date_summited > userSummitedPeaks[s.peak_id]) {
        userSummitedPeaks[s.peak_id] = s.date_summited;
      }
    });
  }

  // Calculate range stats
  const totalPeaks = peaksWithStandardRoute.length;
  const summitedCount = Object.keys(userSummitedPeaks).filter(id =>
    peaksWithStandardRoute.some(p => p.id === id)
  ).length;
  const highestElevation = Math.max(...peaksWithStandardRoute.map(p => p.elevation));
  const lowestElevation = Math.min(...peaksWithStandardRoute.map(p => p.elevation));

  return {
    rangeInfo,
    peaks: peaksWithStandardRoute,
    userSummitedPeaks,
    isLoggedIn: !!session,
    stats: {
      totalPeaks,
      summitedCount,
      highestElevation,
      lowestElevation,
      progress: totalPeaks > 0 ? (summitedCount / totalPeaks) * 100 : 0
    }
  };
};

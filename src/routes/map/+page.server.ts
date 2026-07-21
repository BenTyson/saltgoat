import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ cookies }) => {
  const supabase = createSupabaseServerClient(cookies);

  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  // Get all peaks with their standard route difficulty
  const { data: peaks } = await supabase
    .from('peaks')
    .select(`
      id,
      name,
      slug,
      elevation,
      latitude,
      longitude,
      rank,
      range,
      routes!inner(difficulty_class)
    `)
    .eq('routes.is_standard', true)
    .order('rank');

  // Transform to include difficulty class at top level
  const peaksWithClass = (peaks ?? []).map(peak => ({
    id: peak.id,
    name: peak.name,
    slug: peak.slug,
    elevation: peak.elevation,
    latitude: peak.latitude,
    longitude: peak.longitude,
    rank: peak.rank,
    range: peak.range,
    difficultyClass: peak.routes?.[0]?.difficulty_class ?? 1
  }));

  // Get user's summited peaks if logged in
  let summitedPeakIds: string[] = [];
  if (session?.user) {
    const { data: summits } = await supabase
      .from('user_summits')
      .select('peak_id')
      .eq('user_id', session.user.id);

    summitedPeakIds = [...new Set(summits?.map(s => s.peak_id) ?? [])];
  }

  // Get routes with trail geometry for overlay
  const { data: routesWithTrails } = await supabase
    .from('routes')
    .select(`
      id,
      name,
      slug,
      difficulty_class,
      trail_geometry,
      peak:peaks(slug, name)
    `)
    .not('trail_geometry', 'is', null);

  const trails = (routesWithTrails ?? []).map(route => ({
    routeId: route.id,
    routeName: route.name,
    routeSlug: route.slug,
    peakSlug: (route.peak as { slug: string })?.slug,
    peakName: (route.peak as { name: string })?.name,
    difficultyClass: route.difficulty_class,
    geometry: route.trail_geometry
  }));

  return {
    peaks: peaksWithClass,
    summitedPeakIds,
    isLoggedIn: !!session,
    trails
  };
};

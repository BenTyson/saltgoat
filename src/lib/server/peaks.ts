import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Peak, Route, PeakWithRoutes, PeakWithStandardRoute } from '$lib/types/database';

interface PeakWithRoutesRaw extends Peak {
  routes: Route[];
}

/**
 * Get all peaks with their standard route info
 */
export async function getAllPeaks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<PeakWithStandardRoute[]> {
  const { data, error } = await supabase
    .from('peaks')
    .select(
      `
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
    `
    )
    .order('rank', { ascending: true });

  if (error) {
    logger.error('Error fetching peaks', { error: error });
    throw error;
  }

  // Transform to include standard route at peak level
  const peaks = (data || []) as PeakWithRoutesRaw[];
  return peaks.map((peak) => {
    const standardRoute = peak.routes?.find((r) => r.is_standard);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { routes, ...peakWithoutRoutes } = peak;
    return {
      ...peakWithoutRoutes,
      standard_route: standardRoute
    } as PeakWithStandardRoute;
  });
}

/**
 * Get a single peak by slug with all routes
 */
export async function getPeakBySlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  slug: string
): Promise<PeakWithRoutes | null> {
  const { data, error } = await supabase
    .from('peaks')
    .select(
      `
      *,
      routes (*)
    `
    )
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    logger.error('Error fetching peak', { error: error });
    throw error;
  }

  return data as PeakWithRoutes;
}

/**
 * Get a specific route by peak slug and route slug
 */
export async function getRouteBySlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  peakSlug: string,
  routeSlug: string
): Promise<{ peak: Peak; route: Route } | null> {
  // First get the peak
  const { data: peakData, error: peakError } = await supabase
    .from('peaks')
    .select('*')
    .eq('slug', peakSlug)
    .single();

  if (peakError) {
    if (peakError.code === 'PGRST116') {
      return null;
    }
    logger.error('Error fetching peak', { error: peakError });
    throw peakError;
  }

  const peak = peakData as Peak;

  // Then get the route
  const { data: routeData, error: routeError } = await supabase
    .from('routes')
    .select('*')
    .eq('peak_id', peak.id)
    .eq('slug', routeSlug)
    .single();

  if (routeError) {
    if (routeError.code === 'PGRST116') {
      return null;
    }
    logger.error('Error fetching route', { error: routeError });
    throw routeError;
  }

  return { peak, route: routeData as Route };
}

/**
 * Get related peaks in the same range, sorted by elevation proximity
 */
export async function getRelatedPeaks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  peakId: string,
  range: string,
  elevation: number
): Promise<PeakWithStandardRoute[]> {
  const { data, error } = await supabase
    .from('peaks')
    .select(
      `
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
    `
    )
    .eq('range', range)
    .neq('id', peakId)
    .order('rank', { ascending: true });

  if (error) {
    logger.error('Error fetching related peaks', { error: error });
    throw error;
  }

  const peaks = (data || []) as PeakWithRoutesRaw[];
  const transformed = peaks.map((peak) => {
    const standardRoute = peak.routes?.find((r) => r.is_standard);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { routes, ...peakWithoutRoutes } = peak;
    return {
      ...peakWithoutRoutes,
      standard_route: standardRoute
    } as PeakWithStandardRoute;
  });

  return transformed
    .sort((a, b) => Math.abs(a.elevation - elevation) - Math.abs(b.elevation - elevation))
    .slice(0, 4);
}

/**
 * Get featured peaks for homepage (first N by rank)
 */
export async function getFeaturedPeaks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  limit = 5
): Promise<PeakWithStandardRoute[]> {
  const peaks = await getAllPeaks(supabase);
  return peaks.slice(0, limit);
}

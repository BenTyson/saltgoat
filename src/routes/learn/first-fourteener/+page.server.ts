import type { PageServerLoad } from './$types';

export interface RecommenderPeak {
  id: string;
  name: string;
  slug: string;
  elevation: number;
  rank: number;
  range: string;
  hero_image_url: string | null;
  thumbnail_url: string | null;
  standard_route: {
    id: string;
    name: string;
    distance_miles: number;
    elevation_gain_ft: number;
    difficulty_class: number;
    typical_time_hours: string | null;
    exposure: string | null;
    four_wd_required: boolean | null;
  } | null;
}

export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals;

  // Get all peaks with standard route details needed for recommender
  const { data, error } = await supabase
    .from('peaks')
    .select(
      `
      id,
      name,
      slug,
      elevation,
      rank,
      range,
      hero_image_url,
      thumbnail_url,
      routes (
        id,
        name,
        distance_miles,
        elevation_gain_ft,
        difficulty_class,
        typical_time_hours,
        exposure,
        four_wd_required,
        is_standard
      )
    `
    )
    .order('rank', { ascending: true });

  if (error) {
    console.error('Error fetching peaks for recommender:', error);
    throw error;
  }

  // Transform to include only standard route
  const peaks: RecommenderPeak[] = (data || []).map((peak) => {
    const routes = peak.routes as Array<{
      id: string;
      name: string;
      distance_miles: number;
      elevation_gain_ft: number;
      difficulty_class: number;
      typical_time_hours: string | null;
      exposure: string | null;
      four_wd_required: boolean | null;
      is_standard: boolean;
    }>;
    const standardRoute = routes?.find((r) => r.is_standard);

    return {
      id: peak.id,
      name: peak.name,
      slug: peak.slug,
      elevation: peak.elevation,
      rank: peak.rank,
      range: peak.range,
      hero_image_url: peak.hero_image_url,
      thumbnail_url: peak.thumbnail_url,
      standard_route: standardRoute
        ? {
            id: standardRoute.id,
            name: standardRoute.name,
            distance_miles: standardRoute.distance_miles,
            elevation_gain_ft: standardRoute.elevation_gain_ft,
            difficulty_class: standardRoute.difficulty_class,
            typical_time_hours: standardRoute.typical_time_hours,
            exposure: standardRoute.exposure,
            four_wd_required: standardRoute.four_wd_required
          }
        : null
    };
  });

  return {
    peaks
  };
};

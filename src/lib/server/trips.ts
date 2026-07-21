import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables, TablesInsert } from '$lib/types/database';

export type PlannedTrip = Tables<'planned_trips'>;
export type PlannedTripInsert = TablesInsert<'planned_trips'>;

// Extended type with peak details
export type PlannedTripWithPeaks = PlannedTrip & {
  peaks: Array<{
    id: string;
    peak_id: string;
    day_number: number;
    sort_order: number;
    peak: {
      id: string;
      name: string;
      slug: string;
      elevation: number;
      range: string;
    };
    route: {
      id: string;
      name: string;
      difficulty_class: number;
    } | null;
  }>;
};

// Grouped past trips from user_summits
export interface PastTrip {
  id: string;
  startDate: string;
  endDate: string;
  summits: Array<{
    id: string;
    date_summited: string;
    conditions: string | null;
    notes: string | null;
    peak: {
      id: string;
      name: string;
      slug: string;
      elevation: number;
      range: string;
      thumbnail_url: string | null;
    };
    route: {
      id: string;
      name: string;
      difficulty_class: number;
      distance_miles: number;
      elevation_gain_ft: number;
    } | null;
  }>;
  totalPeaks: number;
  totalElevationGain: number;
  totalDistanceMiles: number;
}

// Group user summits into trips (consecutive days)
export async function getUserPastTrips(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PastTrip[]> {
  const { data: summits, error } = await supabase
    .from('user_summits')
    .select(`
      id,
      date_summited,
      conditions,
      notes,
      peak:peaks(id, name, slug, elevation, range, thumbnail_url),
      route:routes(id, name, difficulty_class, distance_miles, elevation_gain_ft)
    `)
    .eq('user_id', userId)
    .order('date_summited', { ascending: false });

  if (error || !summits) return [];

  // Group summits by consecutive dates (within 1 day)
  const trips: PastTrip[] = [];
  let currentTrip: PastTrip | null = null;

  summits.forEach((summit) => {
    const summitDate = new Date(summit.date_summited + 'T12:00:00');
    const route = summit.route as PastTrip['summits'][0]['route'];

    const summitData = {
      id: summit.id,
      date_summited: summit.date_summited,
      conditions: summit.conditions,
      notes: summit.notes,
      peak: summit.peak as PastTrip['summits'][0]['peak'],
      route
    };

    if (!currentTrip) {
      // Start new trip
      currentTrip = {
        id: `trip-${summit.date_summited}`,
        startDate: summit.date_summited,
        endDate: summit.date_summited,
        summits: [summitData],
        totalPeaks: 1,
        totalElevationGain: route?.elevation_gain_ft || 0,
        totalDistanceMiles: route?.distance_miles || 0
      };
    } else {
      const lastDate = new Date(currentTrip.startDate + 'T12:00:00');
      const diffDays = Math.abs(
        (lastDate.getTime() - summitDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 1) {
        // Add to current trip (we're going DESC, so this summit is earlier)
        currentTrip.summits.push(summitData);
        currentTrip.startDate = summit.date_summited;
        currentTrip.totalPeaks++;
        currentTrip.totalElevationGain += route?.elevation_gain_ft || 0;
        currentTrip.totalDistanceMiles += route?.distance_miles || 0;
      } else {
        // Save current trip, start new one
        trips.push(currentTrip);
        currentTrip = {
          id: `trip-${summit.date_summited}`,
          startDate: summit.date_summited,
          endDate: summit.date_summited,
          summits: [summitData],
          totalPeaks: 1,
          totalElevationGain: route?.elevation_gain_ft || 0,
          totalDistanceMiles: route?.distance_miles || 0
        };
      }
    }
  });

  // Don't forget the last trip
  if (currentTrip) {
    trips.push(currentTrip);
  }

  return trips;
}

// Get planned trips for a user
export async function getUserPlannedTrips(
  supabase: SupabaseClient<Database>,
  userId: string,
  includePast = false
): Promise<PlannedTripWithPeaks[]> {
  let query = supabase
    .from('planned_trips')
    .select(`
      *,
      peaks:planned_trip_peaks(
        id,
        peak_id,
        day_number,
        sort_order,
        peak:peaks(id, name, slug, elevation, range),
        route:routes(id, name, difficulty_class)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'planned')
    .order('start_date', { ascending: true });

  if (!includePast) {
    const today = new Date().toISOString().split('T')[0];
    query = query.gte('start_date', today);
  }

  const { data: trips, error } = await query;

  if (error) {
    logger.error('Error fetching planned trips', { error: error });
    return [];
  }

  return (trips ?? []) as PlannedTripWithPeaks[];
}

// Extended type with owner profile for public trips
export type PublicTripWithPeaks = PlannedTripWithPeaks & {
  owner: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
};

// Get a public trip by ID (with owner profile)
export async function getPublicTrip(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<PublicTripWithPeaks | null> {
  const { data, error } = await supabase
    .from('planned_trips')
    .select(`
      *,
      peaks:planned_trip_peaks(
        id,
        peak_id,
        day_number,
        sort_order,
        peak:peaks(id, name, slug, elevation, range),
        route:routes(id, name, difficulty_class)
      ),
      owner:profiles!planned_trips_user_id_fkey(id, display_name, username, avatar_url)
    `)
    .eq('id', tripId)
    .single();

  if (error) return null;

  return data as unknown as PublicTripWithPeaks;
}

// Get a single planned trip by ID
export async function getPlannedTrip(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<PlannedTripWithPeaks | null> {
  const { data, error } = await supabase
    .from('planned_trips')
    .select(`
      *,
      peaks:planned_trip_peaks(
        id,
        peak_id,
        day_number,
        sort_order,
        peak:peaks(id, name, slug, elevation, range),
        route:routes(id, name, difficulty_class)
      )
    `)
    .eq('id', tripId)
    .single();

  if (error) {
    logger.error('Error fetching planned trip', { error: error });
    return null;
  }

  return data as PlannedTripWithPeaks;
}

// Create a new planned trip
export async function createPlannedTrip(
  supabase: SupabaseClient<Database>,
  trip: PlannedTripInsert,
  peaks: Array<{ peakId: string; routeId?: string; dayNumber?: number }>
): Promise<PlannedTrip> {
  // Insert trip
  const { data: newTrip, error: tripError } = await supabase
    .from('planned_trips')
    .insert(trip)
    .select()
    .single();

  if (tripError) throw tripError;

  // Insert peaks
  if (peaks.length > 0) {
    const { error: peaksError } = await supabase.from('planned_trip_peaks').insert(
      peaks.map((p, i) => ({
        trip_id: newTrip.id,
        peak_id: p.peakId,
        route_id: p.routeId || null,
        day_number: p.dayNumber || 1,
        sort_order: i
      }))
    );

    if (peaksError) throw peaksError;
  }

  return newTrip;
}

// Update a planned trip
export async function updatePlannedTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  updates: Partial<PlannedTripInsert>
): Promise<PlannedTrip> {
  const { data, error } = await supabase
    .from('planned_trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update planned trip peaks
export async function updatePlannedTripPeaks(
  supabase: SupabaseClient<Database>,
  tripId: string,
  peaks: Array<{ peakId: string; routeId?: string; dayNumber?: number }>
): Promise<void> {
  // Delete existing peaks
  await supabase.from('planned_trip_peaks').delete().eq('trip_id', tripId);

  // Insert new peaks
  if (peaks.length > 0) {
    const { error } = await supabase.from('planned_trip_peaks').insert(
      peaks.map((p, i) => ({
        trip_id: tripId,
        peak_id: p.peakId,
        route_id: p.routeId || null,
        day_number: p.dayNumber || 1,
        sort_order: i
      }))
    );

    if (error) throw error;
  }
}

// Delete a planned trip
export async function deletePlannedTrip(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<void> {
  const { error } = await supabase.from('planned_trips').delete().eq('id', tripId);

  if (error) throw error;
}

// Mark a planned trip as completed
export async function completePlannedTrip(
  supabase: SupabaseClient<Database>,
  tripId: string
): Promise<void> {
  const { error } = await supabase
    .from('planned_trips')
    .update({ status: 'completed' })
    .eq('id', tripId);

  if (error) throw error;
}

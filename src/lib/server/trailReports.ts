import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables, TablesInsert } from '$lib/types/database';

export type TrailReport = Tables<'trail_reports'>;
export type TrailReportInsert = TablesInsert<'trail_reports'>;

export type TrailReportWithProfile = TrailReport & {
  profile: { display_name: string | null; avatar_url: string | null } | null;
};

// Get recent trail reports for a peak (last 14 days)
export async function getRecentTrailReports(
  supabase: SupabaseClient<Database>,
  peakId: string,
  limit = 10
): Promise<TrailReportWithProfile[]> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data, error } = await supabase
    .from('trail_reports')
    .select(`
      *,
      profile:profiles(display_name, avatar_url)
    `)
    .eq('peak_id', peakId)
    .gte('hike_date', fourteenDaysAgo.toISOString().split('T')[0])
    .order('hike_date', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching trail reports', { error: error });
    return [];
  }

  return (data ?? []) as TrailReportWithProfile[];
}

// Get a user's trail report for a peak (if exists)
export async function getUserTrailReport(
  supabase: SupabaseClient<Database>,
  userId: string,
  peakId: string
): Promise<TrailReport | null> {
  const { data, error } = await supabase
    .from('trail_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('peak_id', peakId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('Error fetching user trail report', { error: error });
  }

  return data;
}

// Create a new trail report
export async function createTrailReport(
  supabase: SupabaseClient<Database>,
  report: TrailReportInsert
): Promise<TrailReport> {
  const { data, error } = await supabase
    .from('trail_reports')
    .insert(report)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update an existing trail report
export async function updateTrailReport(
  supabase: SupabaseClient<Database>,
  reportId: string,
  updates: Partial<TrailReportInsert>
): Promise<TrailReport> {
  const { data, error } = await supabase
    .from('trail_reports')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a trail report
export async function deleteTrailReport(
  supabase: SupabaseClient<Database>,
  reportId: string
): Promise<void> {
  const { error } = await supabase
    .from('trail_reports')
    .delete()
    .eq('id', reportId);

  if (error) throw error;
}

// Helper: format trail status for display
export function formatTrailStatus(status: string | null): string {
  const labels: Record<string, string> = {
    clear: 'Clear',
    muddy: 'Muddy',
    snowy: 'Snowy',
    icy: 'Icy',
    mixed: 'Mixed Conditions'
  };
  return status ? labels[status] ?? status : 'Unknown';
}

// Helper: format crowd level for display
export function formatCrowdLevel(level: string | null): string {
  const labels: Record<string, string> = {
    empty: 'Empty',
    light: 'Light',
    moderate: 'Moderate',
    crowded: 'Crowded',
    packed: 'Packed'
  };
  return level ? labels[level] ?? level : 'Unknown';
}

// Helper: format road status for display
export function formatRoadStatus(status: string | null): string {
  const labels: Record<string, string> = {
    open: 'Open',
    rough: 'Rough',
    '4wd_required': '4WD Required',
    closed: 'Closed'
  };
  return status ? labels[status] ?? status : 'Unknown';
}

// Helper: format hazard for display
export function formatHazard(hazard: string): string {
  const labels: Record<string, string> = {
    fallen_trees: 'Fallen Trees',
    stream_crossing: 'Stream Crossing',
    rockfall: 'Rockfall',
    wildlife: 'Wildlife',
    lightning_risk: 'Lightning Risk'
  };
  return labels[hazard] ?? hazard;
}

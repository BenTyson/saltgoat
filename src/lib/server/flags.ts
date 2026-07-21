import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

export type ContentType = 'photo' | 'review' | 'trail_report';
export type FlagReason = 'inappropriate' | 'spam' | 'inaccurate' | 'other';

export async function createFlag(
  supabase: SupabaseClient<Database>,
  contentType: ContentType,
  contentId: string,
  userId: string,
  reason: FlagReason,
  details?: string
): Promise<void> {
  const { error } = await supabase
    .from('content_flags')
    .insert({
      content_type: contentType,
      content_id: contentId,
      reported_by: userId,
      reason,
      details: details || null
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already reported this content');
    }
    throw error;
  }
}

export interface PendingFlag {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  details: string | null;
  status: string | null;
  created_at: string | null;
  reported_by: string;
  reporter_name: string | null;
}

export async function getPendingFlags(
  supabase: SupabaseClient<Database>
): Promise<PendingFlag[]> {
  const { data, error } = await supabase
    .from('content_flags')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching pending flags', { error: error });
    return [];
  }

  if (!data || data.length === 0) return [];

  // Get reporter display names
  const reporterIds = [...new Set(data.map((f) => f.reported_by))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', reporterIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

  return data.map((f) => ({
    ...f,
    reporter_name: profileMap.get(f.reported_by) ?? null
  }));
}

export async function resolveFlag(
  supabase: SupabaseClient<Database>,
  flagId: string,
  action: 'dismissed' | 'actioned',
  reviewerId: string
): Promise<void> {
  const { error } = await supabase
    .from('content_flags')
    .update({ status: action, reviewed_by: reviewerId })
    .eq('id', flagId);

  if (error) throw error;
}

import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables, TablesInsert } from '$lib/types/database';

export type UserReview = Tables<'user_reviews'>;
export type UserReviewInsert = TablesInsert<'user_reviews'>;

export type ReviewWithProfile = UserReview & {
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

// Get all reviews for a peak
export async function getPeakReviews(
  supabase: SupabaseClient<Database>,
  peakId: string
): Promise<ReviewWithProfile[]> {
  const { data, error } = await supabase
    .from('user_reviews')
    .select(`
      *,
      profile:profiles(display_name, avatar_url)
    `)
    .eq('peak_id', peakId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching reviews', { error: error });
    return [];
  }
  return (data ?? []) as ReviewWithProfile[];
}

// Get a user's review for a specific peak
export async function getUserReviewForPeak(
  supabase: SupabaseClient<Database>,
  userId: string,
  peakId: string
): Promise<UserReview | null> {
  const { data, error } = await supabase
    .from('user_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('peak_id', peakId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Get review stats for a peak
export async function getPeakReviewStats(
  supabase: SupabaseClient<Database>,
  peakId: string
): Promise<{ avgRating: number; totalReviews: number }> {
  const { data, error } = await supabase
    .from('user_reviews')
    .select('rating')
    .eq('peak_id', peakId);

  if (error) {
    logger.error('Error fetching review stats', { error: error });
    return { avgRating: 0, totalReviews: 0 };
  }

  const ratings = data?.map(r => r.rating) || [];
  const totalReviews = ratings.length;
  const avgRating = totalReviews > 0
    ? ratings.reduce((a, b) => a + b, 0) / totalReviews
    : 0;

  return { avgRating, totalReviews };
}

// Create a review
export async function createReview(
  supabase: SupabaseClient<Database>,
  review: UserReviewInsert
): Promise<UserReview> {
  const { data, error } = await supabase
    .from('user_reviews')
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a review
export async function updateReview(
  supabase: SupabaseClient<Database>,
  reviewId: string,
  updates: Partial<UserReviewInsert>
): Promise<UserReview> {
  const { data, error } = await supabase
    .from('user_reviews')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a review
export async function deleteReview(
  supabase: SupabaseClient<Database>,
  reviewId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_reviews')
    .delete()
    .eq('id', reviewId);

  if (error) throw error;
}

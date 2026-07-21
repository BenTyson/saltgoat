import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '$lib/types/database';

export type UserFollow = Tables<'user_follows'>;

export interface FollowStats {
  followingCount: number;
  followersCount: number;
}

export interface UserWithFollowStatus {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
  summitCount: number;
  peakOverlap?: number;
}

// Get follow counts for a user
export async function getFollowStats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<FollowStats> {
  const [following, followers] = await Promise.all([
    supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
    supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId)
  ]);

  return {
    followingCount: following.count ?? 0,
    followersCount: followers.count ?? 0
  };
}

// Get users that the current user is following
export async function getFollowing(
  supabase: SupabaseClient<Database>,
  userId: string,
  currentUserId?: string
): Promise<UserWithFollowStatus[]> {
  const { data, error } = await supabase
    .from('user_follows')
    .select(`
      following:profiles!user_follows_following_id_fkey(
        id, display_name, username, avatar_url, bio
      )
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching following', { error: error });
    return [];
  }

  const users = (data || [])
    .map((d) => d.following)
    .filter((u): u is NonNullable<typeof u> => u !== null);

  return await enrichUsersWithStats(supabase, users, currentUserId);
}

// Get users that follow the current user
export async function getFollowers(
  supabase: SupabaseClient<Database>,
  userId: string,
  currentUserId?: string
): Promise<UserWithFollowStatus[]> {
  const { data, error } = await supabase
    .from('user_follows')
    .select(`
      follower:profiles!user_follows_follower_id_fkey(
        id, display_name, username, avatar_url, bio
      )
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching followers', { error: error });
    return [];
  }

  const users = (data || [])
    .map((d) => d.follower)
    .filter((u): u is NonNullable<typeof u> => u !== null);

  return await enrichUsersWithStats(supabase, users, currentUserId);
}

// Check if current user follows target user
export async function isFollowing(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  return !!data && !error;
}

// Follow a user
export async function followUser(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followingId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: followerId, following_id: followingId });

  // Ignore duplicate error (23505)
  if (error && error.code !== '23505') throw error;
}

// Unfollow a user
export async function unfollowUser(
  supabase: SupabaseClient<Database>,
  followerId: string,
  followingId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
}

// Get "Climbers Like You" suggestions based on peak overlap
export async function getSuggestedUsers(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 10
): Promise<UserWithFollowStatus[]> {
  // Get current user's summited peaks
  const { data: userPeaks } = await supabase
    .from('user_summits')
    .select('peak_id')
    .eq('user_id', userId);

  const userPeakIds = new Set(userPeaks?.map((p) => p.peak_id) || []);
  if (userPeakIds.size === 0) return [];

  // Get users already following
  const { data: following } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);

  const followingIds = new Set(following?.map((f) => f.following_id) || []);

  // Get all other users with summits
  const { data: otherSummits } = await supabase
    .from('user_summits')
    .select(`
      user_id,
      peak_id,
      profile:profiles(id, display_name, username, avatar_url, bio, is_public)
    `)
    .neq('user_id', userId);

  // Calculate overlap scores
  const userScores = new Map<
    string,
    {
      user: {
        id: string;
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
        bio: string | null;
      };
      overlap: number;
      totalPeaks: number;
    }
  >();

  (otherSummits || []).forEach((summit) => {
    const profile = summit.profile as {
      id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
      bio: string | null;
      is_public: boolean;
    } | null;

    if (!profile?.is_public || followingIds.has(summit.user_id)) return;

    if (!userScores.has(summit.user_id)) {
      userScores.set(summit.user_id, {
        user: {
          id: profile.id,
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          bio: profile.bio
        },
        overlap: 0,
        totalPeaks: 0
      });
    }

    const score = userScores.get(summit.user_id)!;
    score.totalPeaks++;
    if (userPeakIds.has(summit.peak_id)) {
      score.overlap++;
    }
  });

  // Sort by overlap (descending)
  const sorted = [...userScores.entries()]
    .filter(([, s]) => s.overlap > 0)
    .sort((a, b) => b[1].overlap - a[1].overlap)
    .slice(0, limit);

  return sorted.map(([, s]) => ({
    id: s.user.id,
    display_name: s.user.display_name,
    username: s.user.username,
    avatar_url: s.user.avatar_url,
    bio: s.user.bio,
    is_following: false,
    summitCount: s.totalPeaks,
    peakOverlap: s.overlap
  }));
}

// Helper to enrich user list with stats
async function enrichUsersWithStats(
  supabase: SupabaseClient<Database>,
  users: Array<{
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
  }>,
  currentUserId?: string
): Promise<UserWithFollowStatus[]> {
  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  // Get summit counts
  const { data: summits } = await supabase
    .from('user_summits')
    .select('user_id, peak_id')
    .in('user_id', userIds);

  const summitCounts = new Map<string, Set<string>>();
  (summits || []).forEach((s) => {
    if (!summitCounts.has(s.user_id)) {
      summitCounts.set(s.user_id, new Set());
    }
    summitCounts.get(s.user_id)!.add(s.peak_id);
  });

  // Get follow status if current user provided
  let followingSet = new Set<string>();
  if (currentUserId) {
    const { data: following } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .in('following_id', userIds);

    followingSet = new Set((following || []).map((f) => f.following_id));
  }

  return users.map((u) => ({
    id: u.id,
    display_name: u.display_name,
    username: u.username,
    avatar_url: u.avatar_url,
    bio: u.bio,
    is_following: followingSet.has(u.id),
    summitCount: summitCounts.get(u.id)?.size || 0
  }));
}

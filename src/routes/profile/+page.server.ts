import type { PageServerLoad, Actions } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getUserSummitStats, getAdvancedStats } from '$lib/server/summits';
import type { AdvancedStats } from '$lib/server/summits';
import { getUserAchievements, markAchievementsNotified } from '$lib/server/achievements';
import { getUserActivityFeed } from '$lib/server/activity';
import { getUserPhotos } from '$lib/server/images';
import { getFollowStats, getFollowing, getFollowers, getSuggestedUsers, followUser, unfollowUser } from '$lib/server/follows';
import { getUserPastTrips, getUserPlannedTrips, createPlannedTrip, deletePlannedTrip, updatePlannedTrip, getPlannedTrip } from '$lib/server/trips';
import { getUserWatchlist, removeFromWatchlist } from '$lib/server/watchlist';
import type { WatchlistItem } from '$lib/server/watchlist';
import { getSubscription, isPro } from '$lib/server/subscriptions';
import { getReactionsForSummits, toggleReaction, type ReactionData } from '$lib/server/reactions';
import { getCommentsForSummits, createComment, deleteComment, type CommentData } from '$lib/server/comments';
import { redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, url }) => {
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  if (!session?.user) {
    throw redirect(303, '/auth');
  }

  // Get active tab from URL
  const activeTab = url.searchParams.get('tab') || 'overview';

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Get favorite peak if set
  let favoritePeak = null;
  if (profile?.favorite_peak_id) {
    const { data } = await supabase
      .from('peaks')
      .select('id, name, slug')
      .eq('id', profile.favorite_peak_id)
      .single();
    favoritePeak = data;
  }

  // Get all peaks for the favorite peak selector in edit modal
  const { data: peaksForSelector } = await supabase
    .from('peaks')
    .select('id, name')
    .order('name', { ascending: true });

  // Get summit stats
  const summitStats = await getUserSummitStats(supabase, session.user.id);

  // Get all peaks for the grid visualization
  const { data: allPeaks } = await supabase
    .from('peaks')
    .select('id, name, slug, rank, range, elevation')
    .order('rank', { ascending: true });

  // Get all user's unique summited peak IDs
  const { data: userSummits } = await supabase
    .from('user_summits')
    .select('peak_id, date_summited')
    .eq('user_id', session.user.id);

  // Create a map of summited peaks with their most recent date
  const summitedPeaksMap = new Map<string, string>();
  userSummits?.forEach(s => {
    const existing = summitedPeaksMap.get(s.peak_id);
    if (!existing || s.date_summited > existing) {
      summitedPeaksMap.set(s.peak_id, s.date_summited);
    }
  });

  // Calculate stats by range and class
  const rangeStats: Record<string, { total: number; summited: number }> = {};
  const classStats: Record<number, { total: number; summited: number }> = {
    1: { total: 0, summited: 0 },
    2: { total: 0, summited: 0 },
    3: { total: 0, summited: 0 },
    4: { total: 0, summited: 0 }
  };

  // Get routes for class info
  const { data: routes } = await supabase
    .from('routes')
    .select('peak_id, difficulty_class')
    .eq('is_standard', true);

  const peakClassMap = new Map<string, number>();
  routes?.forEach(r => {
    peakClassMap.set(r.peak_id, r.difficulty_class);
  });

  // Get user achievements from database
  const userAchievements = await getUserAchievements(supabase, session.user.id);

  // Mark achievements as notified (user is viewing their profile)
  await markAchievementsNotified(supabase, session.user.id);

  // Tab-specific data loading
  let activityFeed: Awaited<ReturnType<typeof getUserActivityFeed>> = [];
  let userPhotos: Awaited<ReturnType<typeof getUserPhotos>> = [];
  let followStats: Awaited<ReturnType<typeof getFollowStats>> = { followingCount: 0, followersCount: 0 };
  let following: Awaited<ReturnType<typeof getFollowing>> = [];
  let followers: Awaited<ReturnType<typeof getFollowers>> = [];
  let suggestions: Awaited<ReturnType<typeof getSuggestedUsers>> = [];
  let pastTrips: Awaited<ReturnType<typeof getUserPastTrips>> = [];
  let plannedTrips: Awaited<ReturnType<typeof getUserPlannedTrips>> = [];
  let watchlist: WatchlistItem[] = [];
  let advancedStats: AdvancedStats | null = null;
  let summitReactions: Record<string, ReactionData> = {};
  let summitComments: Record<string, CommentData> = {};

  if (activeTab === 'overview') {
    const subscription = await getSubscription(supabase, session.user.id);
    const userIsPro = isPro(subscription);
    [watchlist] = await Promise.all([
      getUserWatchlist(supabase, session.user.id)
    ]);
    if (userIsPro) {
      advancedStats = await getAdvancedStats(supabase, session.user.id);
    }
  } else if (activeTab === 'activity') {
    activityFeed = await getUserActivityFeed(supabase, session.user.id, 50);
    // Load social data for summit items
    const summitIds = activityFeed
      .filter(a => a.type === 'summit')
      .map(a => a.id.replace('summit-', ''));
    if (summitIds.length > 0) {
      [summitReactions, summitComments] = await Promise.all([
        getReactionsForSummits(supabase, summitIds, session.user.id),
        getCommentsForSummits(supabase, summitIds)
      ]);
    }
  } else if (activeTab === 'photos') {
    userPhotos = await getUserPhotos(supabase, session.user.id);
  } else if (activeTab === 'buddies') {
    [followStats, following, followers, suggestions] = await Promise.all([
      getFollowStats(supabase, session.user.id),
      getFollowing(supabase, session.user.id, session.user.id),
      getFollowers(supabase, session.user.id, session.user.id),
      getSuggestedUsers(supabase, session.user.id)
    ]);
  } else if (activeTab === 'trips') {
    [pastTrips, plannedTrips] = await Promise.all([
      getUserPastTrips(supabase, session.user.id),
      getUserPlannedTrips(supabase, session.user.id)
    ]);
  }

  allPeaks?.forEach(peak => {
    // Range stats
    if (!rangeStats[peak.range]) {
      rangeStats[peak.range] = { total: 0, summited: 0 };
    }
    rangeStats[peak.range].total++;
    if (summitedPeaksMap.has(peak.id)) {
      rangeStats[peak.range].summited++;
    }

    // Class stats
    const diffClass = peakClassMap.get(peak.id) || 1;
    classStats[diffClass].total++;
    if (summitedPeaksMap.has(peak.id)) {
      classStats[diffClass].summited++;
    }
  });

  return {
    profile,
    favoritePeak,
    peaksForSelector: peaksForSelector ?? [],
    activeTab,
    summitStats,
    allPeaks: allPeaks ?? [],
    summitedPeaksMap: Object.fromEntries(summitedPeaksMap),
    rangeStats,
    classStats,
    peakClassMap: Object.fromEntries(peakClassMap),
    userAchievements,
    // Tab-specific data
    activityFeed,
    userPhotos,
    followStats,
    following,
    followers,
    suggestions,
    pastTrips,
    plannedTrips,
    watchlist,
    advancedStats,
    summitReactions,
    summitComments,
    currentUserId: session.user.id
  };
};

export const actions: Actions = {
  updatePrivacy: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      throw redirect(303, '/auth');
    }

    const formData = await request.formData();
    const isPublic = formData.get('is_public') === 'true';

    const { error } = await supabase
      .from('profiles')
      .update({ is_public: isPublic })
      .eq('id', session.user.id);

    if (error) {
      return fail(500, { message: 'Failed to update privacy setting' });
    }

    return { success: true };
  },

  updateProfile: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      throw redirect(303, '/auth');
    }

    const formData = await request.formData();

    const updates = {
      display_name: formData.get('display_name') as string || null,
      username: formData.get('username') as string || null,
      tagline: formData.get('tagline') as string || null,
      bio: formData.get('bio') as string || null,
      location: formData.get('location') as string || null,
      website_url: formData.get('website_url') as string || null,
      instagram_handle: formData.get('instagram_handle') as string || null,
      strava_athlete_id: formData.get('strava_athlete_id') as string || null,
      favorite_peak_id: formData.get('favorite_peak_id') as string || null,
      years_hiking: formData.get('years_hiking') ? parseInt(formData.get('years_hiking') as string) : null,
      avatar_url: formData.get('avatar_url') as string || null,
      cover_image_url: formData.get('cover_image_url') as string || null
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);

    if (error) {
      return fail(500, { message: 'Failed to update profile' });
    }

    return { success: true };
  },

  follow: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      throw redirect(303, '/auth');
    }

    const formData = await request.formData();
    const userId = formData.get('userId') as string;

    if (!userId) {
      return fail(400, { error: 'User ID is required' });
    }

    try {
      await followUser(supabase, session.user.id, userId);
      return { success: true };
    } catch (error) {
      console.error('Error following user:', error);
      return fail(500, { error: 'Failed to follow user' });
    }
  },

  unfollow: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      throw redirect(303, '/auth');
    }

    const formData = await request.formData();
    const userId = formData.get('userId') as string;

    if (!userId) {
      return fail(400, { error: 'User ID is required' });
    }

    try {
      await unfollowUser(supabase, session.user.id, userId);
      return { success: true };
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return fail(500, { error: 'Failed to unfollow user' });
    }
  },

  createTrip: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      throw redirect(303, '/auth');
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string || null;
    const notes = formData.get('notes') as string || null;
    const isPublic = formData.get('is_public') === 'true';
    const peakIds = formData.getAll('peakIds') as string[];

    if (!title || !startDate) {
      return fail(400, { error: 'Title and start date are required' });
    }

    if (peakIds.length === 0) {
      return fail(400, { error: 'At least one peak must be selected' });
    }

    try {
      await createPlannedTrip(
        supabase,
        {
          user_id: session.user.id,
          title,
          start_date: startDate,
          end_date: endDate,
          notes,
          is_public: isPublic
        },
        peakIds.map(id => ({ peakId: id }))
      );
      return { success: true };
    } catch (error) {
      console.error('Error creating trip:', error);
      return fail(500, { error: 'Failed to create trip' });
    }
  },

  toggleTripVisibility: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      throw redirect(303, '/auth');
    }

    const formData = await request.formData();
    const tripId = formData.get('tripId') as string;

    if (!tripId) {
      return fail(400, { error: 'Trip ID is required' });
    }

    try {
      const trip = await getPlannedTrip(supabase, tripId);
      if (!trip) return fail(404, { error: 'Trip not found' });

      await updatePlannedTrip(supabase, tripId, { is_public: !trip.is_public });
      return { success: true };
    } catch (error) {
      console.error('Error toggling trip visibility:', error);
      return fail(500, { error: 'Failed to update trip visibility' });
    }
  },

  removeFromWatchlist: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      throw redirect(303, '/auth');
    }

    const formData = await request.formData();
    const peakId = formData.get('peakId') as string;

    if (!peakId) {
      return fail(400, { error: 'Peak ID is required' });
    }

    try {
      await removeFromWatchlist(supabase, session.user.id, peakId);
      return { success: true };
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return fail(500, { error: 'Failed to remove from watchlist' });
    }
  },

  toggleReaction: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;
    if (!session?.user) throw redirect(303, '/auth');

    const formData = await request.formData();
    const summitId = formData.get('summitId') as string;
    if (!summitId) return fail(400, { error: 'Summit ID is required' });

    await toggleReaction(supabase, summitId, session.user.id);
    return { success: true };
  },

  addComment: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;
    if (!session?.user) throw redirect(303, '/auth');

    const formData = await request.formData();
    const summitId = formData.get('summitId') as string;
    const body = (formData.get('body') as string)?.trim();
    if (!summitId || !body) return fail(400, { error: 'Summit ID and comment body are required' });

    await createComment(supabase, summitId, session.user.id, body);
    return { success: true };
  },

  deleteComment: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;
    if (!session?.user) throw redirect(303, '/auth');

    const formData = await request.formData();
    const commentId = formData.get('commentId') as string;
    if (!commentId) return fail(400, { error: 'Comment ID is required' });

    await deleteComment(supabase, commentId);
    return { success: true };
  },

  deleteTrip: async ({ cookies, request }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      throw redirect(303, '/auth');
    }

    const formData = await request.formData();
    const tripId = formData.get('tripId') as string;

    if (!tripId) {
      return fail(400, { error: 'Trip ID is required' });
    }

    try {
      await deletePlannedTrip(supabase, tripId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting trip:', error);
      return fail(500, { error: 'Failed to delete trip' });
    }
  }
};

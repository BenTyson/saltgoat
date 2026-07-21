import type { PageServerLoad, Actions } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getUserAchievements } from '$lib/server/achievements';
import { getSubscription, isPro } from '$lib/server/subscriptions';
import { getReactionsForSummits, toggleReaction, type ReactionData } from '$lib/server/reactions';
import { getCommentsForSummits, createComment, deleteComment, type CommentData } from '$lib/server/comments';
import { getUserTopics } from '$lib/server/forum';
import { error, redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createSupabaseServerClient(cookies);
  const userId = params.id;

  // Get the profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw error(404, { message: 'User not found' });
  }

  // Check if profile is public (RLS should handle this, but double-check)
  // If user is viewing their own profile, they can always see it
  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;
  const isOwnProfile = session?.user?.id === userId;

  if (!profile.is_public && !isOwnProfile) {
    throw error(404, { message: 'This profile is private' });
  }

  // Get user's summit data
  const { data: summits } = await supabase
    .from('user_summits')
    .select(`
      id,
      peak_id,
      date_summited,
      peak:peaks(id, name, slug, elevation, range, thumbnail_url),
      route:routes(name, difficulty_class)
    `)
    .eq('user_id', userId)
    .order('date_summited', { ascending: false });

  // Calculate stats
  const uniquePeakIds = new Set(summits?.map(s => s.peak_id) || []);
  const totalSummits = summits?.length || 0;
  const uniquePeaks = uniquePeakIds.size;
  const progress = (uniquePeaks / 58) * 100;

  // Get recent summits (last 5)
  const recentSummits = summits?.slice(0, 5) || [];

  // Get achievements + forum topics
  const [achievements, userTopicsResult] = await Promise.all([
    getUserAchievements(supabase, userId),
    getUserTopics(supabase, userId, { limit: 5 })
  ]);
  const userForumTopics = userTopicsResult.topics;

  // Calculate total elevation (from unique peaks)
  let totalElevation = 0;
  const seenPeaks = new Set<string>();
  summits?.forEach(s => {
    if (!seenPeaks.has(s.peak_id) && s.peak) {
      seenPeaks.add(s.peak_id);
      totalElevation += (s.peak as { elevation: number }).elevation;
    }
  });

  // Get range stats
  const rangeStats: Record<string, number> = {};
  summits?.forEach(s => {
    if (s.peak && !seenPeaks.has(s.peak_id + '_range')) {
      seenPeaks.add(s.peak_id + '_range');
      const range = (s.peak as { range: string }).range;
      rangeStats[range] = (rangeStats[range] || 0) + 1;
    }
  });

  // Reset for proper counting
  const uniquePeakRanges: Record<string, number> = {};
  const countedPeaks = new Set<string>();
  summits?.forEach(s => {
    if (s.peak && !countedPeaks.has(s.peak_id)) {
      countedPeaks.add(s.peak_id);
      const range = (s.peak as { range: string }).range;
      uniquePeakRanges[range] = (uniquePeakRanges[range] || 0) + 1;
    }
  });

  // Get subscription status
  const userSubscription = await getSubscription(supabase, userId);
  const userIsPro = isPro(userSubscription);

  // Get favorite peak if set
  let favoritePeak = null;
  if (profile.favorite_peak_id) {
    const { data } = await supabase
      .from('peaks')
      .select('id, name, slug')
      .eq('id', profile.favorite_peak_id)
      .single();
    favoritePeak = data;
  }

  // Load social data for recent summits
  const summitIds = recentSummits.map((s: any) => s.id);
  let summitReactions: Record<string, ReactionData> = {};
  let summitComments: Record<string, CommentData> = {};
  const currentUserId = session?.user?.id ?? null;

  if (summitIds.length > 0) {
    [summitReactions, summitComments] = await Promise.all([
      getReactionsForSummits(supabase, summitIds, currentUserId),
      getCommentsForSummits(supabase, summitIds)
    ]);
  }

  return {
    profile,
    favoritePeak,
    isOwnProfile,
    isPro: userIsPro,
    stats: {
      totalSummits,
      uniquePeaks,
      progress,
      totalElevation
    },
    recentSummits,
    achievements,
    rangeStats: uniquePeakRanges,
    summitReactions,
    summitComments,
    currentUserId,
    userForumTopics
  };
};

export const actions: Actions = {
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
  }
};

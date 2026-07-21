import type { PageServerLoad, Actions } from './$types';
import { getFeaturedPeaks, getAllPeaks } from '$lib/server/peaks';
import { getFollowingActivityFeed, type ActivityItem } from '$lib/server/activity';
import { getReactionsForSummits, toggleReaction, type ReactionData } from '$lib/server/reactions';
import { getCommentsForSummits, createComment, deleteComment, type CommentData } from '$lib/server/comments';
import { redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals;

  try {
    const { user } = await locals.safeGetSession();

    const [featuredPeaks, allPeaks, profileCount, summitCount] = await Promise.all([
      getFeaturedPeaks(supabase, 5),
      getAllPeaks(supabase),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('user_summits').select('id', { count: 'exact', head: true })
    ]);

    // Load friends activity if logged in
    let friendsActivity: ActivityItem[] = [];
    let summitReactions: Record<string, ReactionData> = {};
    let summitComments: Record<string, CommentData> = {};
    let currentUserId: string | null = null;

    if (user) {
      currentUserId = user.id;
      friendsActivity = await getFollowingActivityFeed(supabase, user.id, 8);

      const summitIds = friendsActivity
        .filter(a => a.type === 'summit')
        .map(a => a.id.replace('summit-', ''));
      if (summitIds.length > 0) {
        [summitReactions, summitComments] = await Promise.all([
          getReactionsForSummits(supabase, summitIds, user.id),
          getCommentsForSummits(supabase, summitIds)
        ]);
      }
    }

    return {
      peaks: featuredPeaks,
      totalPeaks: allPeaks.length,
      climberCount: profileCount.count ?? 0,
      summitCount: summitCount.count ?? 0,
      friendsActivity,
      summitReactions,
      summitComments,
      currentUserId
    };
  } catch (error) {
    console.error('Error loading homepage data:', error);
    return {
      peaks: [],
      totalPeaks: 0,
      climberCount: 0,
      summitCount: 0,
      friendsActivity: [],
      summitReactions: {},
      summitComments: {},
      currentUserId: null
    };
  }
};

export const actions: Actions = {
  toggleReaction: async ({ locals, request }) => {
    const { supabase } = locals;
    const { user } = await locals.safeGetSession();
    if (!user) throw redirect(303, '/auth');

    const formData = await request.formData();
    const summitId = formData.get('summitId') as string;
    if (!summitId) return fail(400, { error: 'Summit ID is required' });

    await toggleReaction(supabase, summitId, user.id);
    return { success: true };
  },

  addComment: async ({ locals, request }) => {
    const { supabase } = locals;
    const { user } = await locals.safeGetSession();
    if (!user) throw redirect(303, '/auth');

    const formData = await request.formData();
    const summitId = formData.get('summitId') as string;
    const body = (formData.get('body') as string)?.trim();
    if (!summitId || !body) return fail(400, { error: 'Summit ID and comment body are required' });

    await createComment(supabase, summitId, user.id, body);
    return { success: true };
  },

  deleteComment: async ({ locals, request }) => {
    const { supabase } = locals;
    const { user } = await locals.safeGetSession();
    if (!user) throw redirect(303, '/auth');

    const formData = await request.formData();
    const commentId = formData.get('commentId') as string;
    if (!commentId) return fail(400, { error: 'Comment ID is required' });

    await deleteComment(supabase, commentId);
    return { success: true };
  }
};

import type { PageServerLoad, Actions } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getPeakBySlug, getRelatedPeaks } from '$lib/server/peaks';
import { getUserSummitsForPeak, createSummit, deleteSummit } from '$lib/server/summits';
import { canLogSummit } from '$lib/server/subscriptions';
import {
  getPeakReviews,
  getUserReviewForPeak,
  getPeakReviewStats,
  createReview,
  updateReview,
  deleteReview
} from '$lib/server/reviews';
import {
  getImagesForPeak,
  uploadPeakImage,
  deletePeakImage,
  isAdmin,
  flagImage
} from '$lib/server/images';
import { getConditionsForPeak, getForecastForPeak } from '$lib/server/conditions';
import { getRecentTrailReports, createTrailReport } from '$lib/server/trailReports';
import { checkAndAwardAchievements } from '$lib/server/achievements';
import { isOnWatchlist, addToWatchlist, removeFromWatchlist } from '$lib/server/watchlist';
import { getTopicsForPeak } from '$lib/server/forum';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createSupabaseServerClient(cookies);

  const peak = await getPeakBySlug(supabase, params.slug);

  if (!peak) {
    throw error(404, {
      message: 'Peak not found'
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  let userSummits: Awaited<ReturnType<typeof getUserSummitsForPeak>> = [];
  let userReview: Awaited<ReturnType<typeof getUserReviewForPeak>> = null;

  let summitLimit: { allowed: boolean; remaining: number; isPro: boolean } | null = null;
  let isWatched = false;

  if (session?.user) {
    [userSummits, userReview, summitLimit, isWatched] = await Promise.all([
      getUserSummitsForPeak(supabase, session.user.id, peak.id),
      getUserReviewForPeak(supabase, session.user.id, peak.id),
      canLogSummit(supabase, session.user.id),
      isOnWatchlist(supabase, session.user.id, peak.id)
    ]);
  }

  const [reviews, reviewStats, images, conditions, trailReports, relatedPeaks, forecast, peakDiscussions] = await Promise.all([
    getPeakReviews(supabase, peak.id),
    getPeakReviewStats(supabase, peak.id),
    getImagesForPeak(supabase, peak.id),
    getConditionsForPeak(supabase, peak.id),
    getRecentTrailReports(supabase, peak.id),
    getRelatedPeaks(supabase, peak.id, peak.range, peak.elevation),
    getForecastForPeak(supabase, peak.id, { name: peak.name, slug: peak.slug, elevation: peak.elevation }),
    getTopicsForPeak(supabase, peak.id, 5)
  ]);

  return {
    peak,
    userSummits,
    isLoggedIn: !!session,
    currentUserId: session?.user?.id,
    isAdmin: isAdmin(session?.user?.id),
    reviews,
    userReview,
    avgRating: reviewStats.avgRating,
    totalReviews: reviewStats.totalReviews,
    images,
    conditions,
    trailReports,
    relatedPeaks,
    summitLimit,
    isWatched,
    forecast,
    peakDiscussions
  };
};

export const actions: Actions = {
  logSummit: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in to log a summit' });
    }

    const formData = await request.formData();
    const peakId = formData.get('peak_id') as string;
    const dateSummited = formData.get('date_summited') as string;
    const routeId = formData.get('route_id') as string | null;
    const conditions = formData.get('conditions') as string | null;
    const notes = formData.get('notes') as string | null;
    const startTime = formData.get('start_time') as string | null;
    const summitTime = formData.get('summit_time') as string | null;
    const partySize = formData.get('party_size') as string | null;

    if (!peakId || !dateSummited) {
      return fail(400, { message: 'Peak ID and date are required' });
    }

    const summitCheck = await canLogSummit(supabase, session.user.id);
    if (!summitCheck.allowed) {
      return fail(403, { limitReached: true, remaining: 0 });
    }

    try {
      await createSummit(supabase, {
        user_id: session.user.id,
        peak_id: peakId,
        date_summited: dateSummited,
        route_id: routeId || null,
        conditions: conditions || null,
        notes: notes || null,
        start_time: startTime || null,
        summit_time: summitTime || null,
        party_size: partySize ? parseInt(partySize, 10) : null
      });

      const newAchievements = await checkAndAwardAchievements(supabase, session.user.id, 'summit');

      return { success: true, newAchievements };
    } catch (e) {
      console.error('Error logging summit:', e);
      return fail(500, { message: 'Failed to log summit' });
    }
  },

  deleteSummit: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in' });
    }

    const formData = await request.formData();
    const summitId = formData.get('summit_id') as string;

    if (!summitId) {
      return fail(400, { message: 'Summit ID required' });
    }

    try {
      await deleteSummit(supabase, summitId);
      return { success: true };
    } catch (e) {
      console.error('Error deleting summit:', e);
      return fail(500, { message: 'Failed to delete summit' });
    }
  },

  submitReview: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in to submit a review' });
    }

    const formData = await request.formData();
    const peakId = formData.get('peak_id') as string;
    const rating = parseInt(formData.get('rating') as string, 10);
    const title = formData.get('title') as string | null;
    const body = formData.get('body') as string | null;
    const dateClimbed = formData.get('date_climbed') as string | null;
    const conditions = formData.get('conditions') as string | null;

    if (!peakId || !rating || rating < 1 || rating > 5) {
      return fail(400, { message: 'Peak ID and valid rating (1-5) required' });
    }

    try {
      await createReview(supabase, {
        user_id: session.user.id,
        peak_id: peakId,
        rating,
        title: title || null,
        body: body || null,
        date_climbed: dateClimbed || null,
        conditions: conditions || null
      });

      const newAchievements = await checkAndAwardAchievements(supabase, session.user.id, 'review');

      return { success: true, newAchievements };
    } catch (e: any) {
      console.error('Error submitting review:', e);
      if (e.code === '23505') {
        return fail(400, { message: 'You have already reviewed this peak' });
      }
      return fail(500, { message: 'Failed to submit review' });
    }
  },

  updateReview: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in' });
    }

    const formData = await request.formData();
    const reviewId = formData.get('review_id') as string;
    const rating = parseInt(formData.get('rating') as string, 10);
    const title = formData.get('title') as string | null;
    const body = formData.get('body') as string | null;
    const dateClimbed = formData.get('date_climbed') as string | null;
    const conditions = formData.get('conditions') as string | null;

    if (!reviewId || !rating || rating < 1 || rating > 5) {
      return fail(400, { message: 'Review ID and valid rating required' });
    }

    try {
      await updateReview(supabase, reviewId, {
        rating,
        title: title || null,
        body: body || null,
        date_climbed: dateClimbed || null,
        conditions: conditions || null
      });

      return { success: true };
    } catch (e) {
      console.error('Error updating review:', e);
      return fail(500, { message: 'Failed to update review' });
    }
  },

  deleteReview: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in' });
    }

    const formData = await request.formData();
    const reviewId = formData.get('review_id') as string;

    if (!reviewId) {
      return fail(400, { message: 'Review ID required' });
    }

    try {
      await deleteReview(supabase, reviewId);
      return { success: true };
    } catch (e) {
      console.error('Error deleting review:', e);
      return fail(500, { message: 'Failed to delete review' });
    }
  },

  uploadImage: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in to upload photos' });
    }

    const formData = await request.formData();
    const peakId = formData.get('peak_id') as string;
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string | null;
    const isPrivate = formData.get('is_private') === 'true';
    const category = formData.get('category') as string | null;

    if (!peakId || !file) {
      return fail(400, { message: 'Peak ID and file required' });
    }

    try {
      await uploadPeakImage(supabase, peakId, session.user.id, file, caption || undefined, isPrivate, category || undefined);
      return { success: true };
    } catch (e) {
      console.error('Error uploading image:', e);
      return fail(500, { message: 'Failed to upload image' });
    }
  },

  deleteImage: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in' });
    }

    const formData = await request.formData();
    const imageId = formData.get('image_id') as string;

    if (!imageId) {
      return fail(400, { message: 'Image ID required' });
    }

    // Verify ownership or admin
    if (!isAdmin(session.user.id)) {
      const { data: image } = await supabase
        .from('peak_images')
        .select('uploaded_by')
        .eq('id', imageId)
        .single();

      if (image?.uploaded_by !== session.user.id) {
        return fail(403, { message: 'Can only delete your own photos' });
      }
    }

    try {
      await deletePeakImage(supabase, imageId);
      return { success: true };
    } catch (e) {
      console.error('Error deleting image:', e);
      return fail(500, { message: 'Failed to delete image' });
    }
  },

  flagImage: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in to report photos' });
    }

    const formData = await request.formData();
    const imageId = formData.get('image_id') as string;
    const reason = formData.get('reason') as 'inappropriate' | 'spam' | 'inaccurate' | 'other';
    const details = formData.get('details') as string | null;

    if (!imageId || !reason) {
      return fail(400, { message: 'Image ID and reason required' });
    }

    try {
      await flagImage(supabase, imageId, session.user.id, reason, details || undefined);
      return { success: true };
    } catch (e: any) {
      if (e.message === 'You have already reported this photo') {
        return fail(400, { message: e.message });
      }
      console.error('Error flagging image:', e);
      return fail(500, { message: 'Failed to report photo' });
    }
  },

  addToWatchlist: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in' });
    }

    const formData = await request.formData();
    const peakId = formData.get('peak_id') as string;

    if (!peakId) {
      return fail(400, { message: 'Peak ID required' });
    }

    try {
      await addToWatchlist(supabase, session.user.id, peakId);
      return { success: true };
    } catch (e) {
      console.error('Error adding to watchlist:', e);
      return fail(500, { message: 'Failed to add to watchlist' });
    }
  },

  removeFromWatchlist: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in' });
    }

    const formData = await request.formData();
    const peakId = formData.get('peak_id') as string;

    if (!peakId) {
      return fail(400, { message: 'Peak ID required' });
    }

    try {
      await removeFromWatchlist(supabase, session.user.id, peakId);
      return { success: true };
    } catch (e) {
      console.error('Error removing from watchlist:', e);
      return fail(500, { message: 'Failed to remove from watchlist' });
    }
  },

  submitTrailReport: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in to submit a trail report' });
    }

    const formData = await request.formData();
    const peakId = formData.get('peak_id') as string;
    const hikeDate = formData.get('hike_date') as string;
    const trailStatus = formData.get('trail_status') as string;
    const snowDepthStr = formData.get('snow_depth_inches') as string | null;
    const crowdLevel = formData.get('crowd_level') as string;
    const roadStatus = formData.get('road_status') as string;
    const parkingNotes = formData.get('parking_notes') as string | null;
    const hazardsStr = formData.get('hazards') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!peakId || !hikeDate) {
      return fail(400, { message: 'Peak ID and hike date are required' });
    }

    try {
      await createTrailReport(supabase, {
        user_id: session.user.id,
        peak_id: peakId,
        hike_date: hikeDate,
        trail_status: trailStatus || null,
        snow_depth_inches: snowDepthStr ? parseInt(snowDepthStr, 10) : null,
        crowd_level: crowdLevel || null,
        road_status: roadStatus || null,
        parking_notes: parkingNotes || null,
        hazards: hazardsStr ? JSON.parse(hazardsStr) : [],
        notes: notes || null
      });

      const newAchievements = await checkAndAwardAchievements(supabase, session.user.id, 'trail_report');

      return { success: true, newAchievements };
    } catch (e) {
      console.error('Error submitting trail report:', e);
      return fail(500, { message: 'Failed to submit trail report' });
    }
  }
};

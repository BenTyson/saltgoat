import type { PageServerLoad, Actions } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getRouteBySlug } from '$lib/server/peaks';
import { getBestTrace, getTracesForRoute, uploadTrace, toggleVote, deleteTrace, getTraceDownloadUrl } from '$lib/server/traces';
import { getForecastForPeak } from '$lib/server/conditions';
import { getSubscription, isPro } from '$lib/server/subscriptions';
import { isAdmin } from '$lib/server/admin';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createSupabaseServerClient(cookies);

  const result = await getRouteBySlug(supabase, params.slug, params.route);

  if (!result) {
    throw error(404, {
      message: 'Route not found'
    });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;
  const userId = session?.user?.id;

  let userIsPro = false;
  if (userId) {
    if (isAdmin(userId)) {
      userIsPro = true;
    } else {
      const subscription = await getSubscription(supabase, userId);
      userIsPro = isPro(subscription);
    }
  }

  // Fetch parking reports + traces + forecast in parallel
  const [parkingResult, bestTrace, allTracesRaw, forecast] = await Promise.all([
    supabase
      .from('trail_reports')
      .select('parking_status, arrival_time, hike_date')
      .eq('peak_id', result.peak.id)
      .not('parking_status', 'is', null)
      .order('hike_date', { ascending: false })
      .limit(5),
    getBestTrace(supabase, result.route.id),
    getTracesForRoute(supabase, result.route.id, userId),
    getForecastForPeak(supabase, result.peak.id, {
      name: result.peak.name,
      slug: result.peak.slug,
      elevation: result.peak.elevation
    })
  ]);

  // Map traces to the shape TrailMapSection expects
  const allTraces = allTracesRaw.map((t) => ({
    id: t.id,
    uploaderName: t.uploader?.display_name || 'Anonymous',
    uploaderId: t.uploaded_by,
    voteCount: t.vote_count,
    userVoted: t.userVoted,
    trailGeometry: t.trail_geometry,
    storagePath: t.storage_path,
    pointCount: t.point_count,
    distanceMiles: t.distance_miles,
    elevationGain: t.elevation_gain
  }));

  // Build download URL map
  const downloadUrls: Record<string, string> = {};
  for (const t of allTracesRaw) {
    downloadUrls[t.storage_path] = getTraceDownloadUrl(supabase, t.storage_path);
  }

  return {
    ...result,
    recentParkingReports: parkingResult.data || [],
    bestTrace,
    allTraces,
    downloadUrls,
    isLoggedIn: !!session,
    currentUserId: userId,
    forecast,
    isPro: userIsPro
  };
};

export const actions: Actions = {
  uploadTrace: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in to upload traces' });
    }

    const formData = await request.formData();
    const routeId = formData.get('route_id') as string;
    const file = formData.get('file') as File;

    if (!routeId || !file) {
      return fail(400, { message: 'Route ID and file required' });
    }

    try {
      const gpxContent = await file.text();
      await uploadTrace(supabase, routeId, session.user.id, gpxContent);
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to upload trace';
      return fail(400, { message });
    }
  },

  voteTrace: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in to vote' });
    }

    const formData = await request.formData();
    const traceId = formData.get('trace_id') as string;

    if (!traceId) {
      return fail(400, { message: 'Trace ID required' });
    }

    try {
      await toggleVote(supabase, traceId, session.user.id);
      return { success: true };
    } catch (e) {
      return fail(500, { message: 'Failed to toggle vote' });
    }
  },

  deleteTrace: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;

    if (!session?.user) {
      return fail(401, { message: 'Must be logged in' });
    }

    const formData = await request.formData();
    const traceId = formData.get('trace_id') as string;

    if (!traceId) {
      return fail(400, { message: 'Trace ID required' });
    }

    // Verify ownership
    const { data: trace } = await supabase
      .from('route_traces')
      .select('uploaded_by')
      .eq('id', traceId)
      .single();

    if (trace?.uploaded_by !== session.user.id) {
      return fail(403, { message: 'Can only delete your own traces' });
    }

    try {
      await deleteTrace(supabase, traceId);
      return { success: true };
    } catch (e) {
      return fail(500, { message: 'Failed to delete trace' });
    }
  }
};

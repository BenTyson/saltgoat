import type { PageServerLoad, Actions } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { isAdmin } from '$lib/server/admin';
import {
  getAdminPhotos,
  getAdminReviews,
  getAdminTrailReports,
  getAdminTraces,
  adminDeleteReview,
  adminDeleteTrailReport,
  adminDeleteTrace
} from '$lib/server/admin';
import { moderateImage } from '$lib/server/images';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, url }) => {
  const supabase = createSupabaseServerClient(cookies);

  const contentType = url.searchParams.get('type') ?? 'photos';
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const status = url.searchParams.get('status') ?? undefined;

  let photos = { items: [] as any[], total: 0 };
  let reviews = { items: [] as any[], total: 0 };
  let trailReports = { items: [] as any[], total: 0 };
  let traces = { items: [] as any[], total: 0 };

  switch (contentType) {
    case 'photos':
      photos = await getAdminPhotos(supabase, { status, page, limit: 25 });
      break;
    case 'reviews':
      reviews = await getAdminReviews(supabase, { page, limit: 25 });
      break;
    case 'trail_reports':
      trailReports = await getAdminTrailReports(supabase, { page, limit: 25 });
      break;
    case 'traces':
      traces = await getAdminTraces(supabase, { page, limit: 25 });
      break;
  }

  return {
    contentType,
    page,
    status: status ?? '',
    photos,
    reviews,
    trailReports,
    traces,
    totalPages: Math.ceil(
      (contentType === 'photos' ? photos.total :
       contentType === 'reviews' ? reviews.total :
       contentType === 'trail_reports' ? trailReports.total :
       traces.total) / 25
    )
  };
};

export const actions: Actions = {
  approvePhoto: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;
    if (!session?.user || !isAdmin(session.user.id)) return fail(403);

    const formData = await request.formData();
    const imageId = formData.get('image_id') as string;
    await moderateImage(supabase, imageId, 'approve', session.user.id);
    return { success: true };
  },

  removePhoto: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;
    if (!session?.user || !isAdmin(session.user.id)) return fail(403);

    const formData = await request.formData();
    const imageId = formData.get('image_id') as string;
    await moderateImage(supabase, imageId, 'remove', session.user.id);
    return { success: true };
  },

  deleteReview: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;
    if (!session?.user || !isAdmin(session.user.id)) return fail(403);

    const formData = await request.formData();
    const reviewId = formData.get('review_id') as string;
    await adminDeleteReview(supabase, reviewId);
    return { success: true };
  },

  deleteTrailReport: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;
    if (!session?.user || !isAdmin(session.user.id)) return fail(403);

    const formData = await request.formData();
    const reportId = formData.get('report_id') as string;
    await adminDeleteTrailReport(supabase, reportId);
    return { success: true };
  },

  deleteTrace: async ({ request, cookies }) => {
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();
    const session = user ? { user } : null;
    if (!session?.user || !isAdmin(session.user.id)) return fail(403);

    const formData = await request.formData();
    const traceId = formData.get('trace_id') as string;
    await adminDeleteTrace(supabase, traceId);
    return { success: true };
  }
};

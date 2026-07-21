import type { LayoutServerLoad } from './$types';
import { assertAdmin } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { supabase } = locals;
  const { user } = await locals.safeGetSession();

  assertAdmin(user);

  // Badge counts for tabs
  const [pendingFlagsResult, flaggedImagesResult] = await Promise.all([
    supabase.from('content_flags').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('peak_images').select('id', { count: 'exact', head: true }).eq('status', 'flagged')
  ]);

  const moderationCount = (pendingFlagsResult.count ?? 0) + (flaggedImagesResult.count ?? 0);

  return {
    moderationCount
  };
};

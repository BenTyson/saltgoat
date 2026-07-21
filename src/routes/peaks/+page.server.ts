import type { PageServerLoad } from './$types';
import { getAllPeaks } from '$lib/server/peaks';

export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals;

  try {
    // Get peaks and the validated user in parallel. safeGetSession() runs the
    // single per-request getUser() (memoized in hooks).
    const [peaks, { user }] = await Promise.all([
      getAllPeaks(supabase),
      locals.safeGetSession()
    ]);

    // Get user's summited peak IDs if logged in
    let summitedPeakIds: string[] = [];
    if (user) {
      const { data: summits } = await supabase
        .from('user_summits')
        .select('peak_id')
        .eq('user_id', user.id);

      summitedPeakIds = [...new Set(summits?.map(s => s.peak_id) || [])];
    }

    return {
      peaks,
      isLoggedIn: !!user,
      summitedPeakIds
    };
  } catch (error) {
    console.error('Error loading peaks:', error);
    return { peaks: [], isLoggedIn: false, summitedPeakIds: [] };
  }
};

import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getAllPeaks } from '$lib/server/peaks';

export const load: PageServerLoad = async ({ cookies }) => {
  const supabase = createSupabaseServerClient(cookies);

  try {
    // Get peaks and user in parallel. getUser() revalidates the JWT (unlike
    // getSession); we reshape to a minimal session for downstream checks.
    const [peaks, { data: { user } }] = await Promise.all([
      getAllPeaks(supabase),
      supabase.auth.getUser()
    ]);
    const session = user ? { user } : null;

    // Get user's summited peak IDs if logged in
    let summitedPeakIds: string[] = [];
    if (session?.user) {
      const { data: summits } = await supabase
        .from('user_summits')
        .select('peak_id')
        .eq('user_id', session.user.id);

      summitedPeakIds = [...new Set(summits?.map(s => s.peak_id) || [])];
    }

    return {
      peaks,
      isLoggedIn: !!session,
      summitedPeakIds
    };
  } catch (error) {
    console.error('Error loading peaks:', error);
    return { peaks: [], isLoggedIn: false, summitedPeakIds: [] };
  }
};

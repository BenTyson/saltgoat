import type { PageServerLoad } from './$types';
import { getAdminOverviewStats } from '$lib/server/admin';
import { getForumStats } from '$lib/server/forum';

export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals;
  const [stats, forumStats] = await Promise.all([
    getAdminOverviewStats(supabase),
    getForumStats(supabase)
  ]);

  return { stats, forumStats };
};

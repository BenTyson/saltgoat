import type { PageServerLoad } from './$types';
import { getSubscriptionMetrics } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals;
  const metrics = await getSubscriptionMetrics(supabase);

  return { metrics };
};

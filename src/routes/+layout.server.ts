import type { LayoutServerLoad } from './$types';
import { getSubscription, type Subscription } from '$lib/server/subscriptions';
import { isAdmin } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { supabase } = locals;

  // Single validated auth read for the whole request (getUser under the hood).
  // The real session is returned to the client — Header depends on it.
  const { session, user } = await locals.safeGetSession();

  // Get user profile and subscription if logged in
  let profile = null;
  let subscription: Subscription | null = null;
  if (user) {
    const [profileResult, sub] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      getSubscription(supabase, user.id)
    ]);
    profile = profileResult.data;
    subscription = sub;
  }

  // Get all peaks for search (lightweight query)
  const { data: peaks } = await supabase
    .from('peaks')
    .select('id, name, slug, elevation, rank, range')
    .order('rank');

  return {
    session,
    profile,
    subscription,
    peaks: peaks ?? [],
    isAdmin: isAdmin(user?.id)
  };
};

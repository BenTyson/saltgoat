import type { LayoutServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getSubscription, type Subscription } from '$lib/server/subscriptions';
import { isAdmin } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const supabase = createSupabaseServerClient(cookies);

  // Validate the JWT against the auth server (getUser) before trusting it for
  // authorization. Only then read the full session object to hand to the client.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = user
    ? await supabase.auth.getSession()
    : { data: { session: null } };

  // Get user profile and subscription if logged in
  let profile = null;
  let subscription: Subscription | null = null;
  if (session?.user) {
    const [profileResult, sub] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      getSubscription(supabase, session.user.id)
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
    isAdmin: isAdmin(session?.user?.id)
  };
};

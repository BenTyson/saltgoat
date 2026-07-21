import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getSubscription, isPro } from '$lib/server/subscriptions';

export const load: PageServerLoad = async ({ cookies }) => {
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  let subscription = null;
  let userIsPro = false;

  if (session?.user) {
    subscription = await getSubscription(supabase, session.user.id);
    userIsPro = isPro(subscription);
  }

  return {
    isLoggedIn: !!session,
    userIsPro,
    hasStripeCustomer: !!subscription?.stripe_customer_id
  };
};

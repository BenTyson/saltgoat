import type { PageServerLoad } from './$types';
import { getSubscription, isPro } from '$lib/server/subscriptions';

export const load: PageServerLoad = async ({ locals }) => {
  const { supabase } = locals;
  const { user } = await locals.safeGetSession();

  let subscription = null;
  let userIsPro = false;

  if (user) {
    subscription = await getSubscription(supabase, user.id);
    userIsPro = isPro(subscription);
  }

  return {
    isLoggedIn: !!user,
    userIsPro,
    hasStripeCustomer: !!subscription?.stripe_customer_id
  };
};

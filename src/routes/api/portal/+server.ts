import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getSubscription } from '$lib/server/subscriptions';
import { createPortalSession } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ cookies, url }) => {
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  if (!session?.user) {
    throw redirect(303, '/auth');
  }

  const subscription = await getSubscription(supabase, session.user.id);
  if (!subscription?.stripe_customer_id) {
    throw error(400, 'No active subscription found');
  }

  const { url: portalUrl } = await createPortalSession(subscription.stripe_customer_id, url.origin);
  throw redirect(303, portalUrl);
};

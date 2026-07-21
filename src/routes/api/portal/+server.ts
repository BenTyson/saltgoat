import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubscription } from '$lib/server/subscriptions';
import { createPortalSession } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ locals, url }) => {
  const { supabase } = locals;
  const { user } = await locals.safeGetSession();

  if (!user) {
    throw redirect(303, '/auth');
  }

  const subscription = await getSubscription(supabase, user.id);
  if (!subscription?.stripe_customer_id) {
    throw error(400, 'No active subscription found');
  }

  const { url: portalUrl } = await createPortalSession(subscription.stripe_customer_id, url.origin);
  throw redirect(303, portalUrl);
};

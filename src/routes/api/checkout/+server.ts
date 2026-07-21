import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCheckoutSession } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ locals, url }) => {
  const { user } = await locals.safeGetSession();

  if (!user) {
    throw redirect(303, '/auth');
  }

  const { url: checkoutUrl } = await createCheckoutSession(user.id, user.email ?? '', url.origin);
  throw redirect(303, checkoutUrl);
};

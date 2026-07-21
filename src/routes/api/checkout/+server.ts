import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { createCheckoutSession } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ cookies, url }) => {
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  if (!session?.user) {
    throw redirect(303, '/auth');
  }

  const { url: checkoutUrl } = await createCheckoutSession(session.user.id, session.user.email ?? '', url.origin);
  throw redirect(303, checkoutUrl);
};

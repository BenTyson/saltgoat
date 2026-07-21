import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getPublicTrip } from '$lib/server/trips';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  const trip = await getPublicTrip(supabase, params.id);

  if (!trip) {
    throw error(404, 'Trip not found');
  }

  const isOwner = session?.user?.id === trip.user_id;

  if (!trip.is_public && !isOwner) {
    throw error(404, 'Trip not found');
  }

  return {
    trip,
    isOwner
  };
};

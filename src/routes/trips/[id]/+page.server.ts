import type { PageServerLoad } from './$types';
import { getPublicTrip } from '$lib/server/trips';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { supabase } = locals;
  const { user } = await locals.safeGetSession();

  const trip = await getPublicTrip(supabase, params.id);

  if (!trip) {
    throw error(404, 'Trip not found');
  }

  const isOwner = user?.id === trip.user_id;

  if (!trip.is_public && !isOwner) {
    throw error(404, 'Trip not found');
  }

  return {
    trip,
    isOwner
  };
};

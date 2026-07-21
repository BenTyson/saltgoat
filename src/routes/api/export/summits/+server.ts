import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getSubscription, isPro } from '$lib/server/subscriptions';
import { getUserSummits } from '$lib/server/summits';

export const GET: RequestHandler = async ({ cookies }) => {
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user } } = await supabase.auth.getUser();
  const session = user ? { user } : null;

  if (!session?.user) {
    throw error(401, 'Must be logged in');
  }

  const subscription = await getSubscription(supabase, session.user.id);
  if (!isPro(subscription)) {
    throw error(403, 'Pro subscription required');
  }

  const summits = await getUserSummits(supabase, session.user.id);

  const headers = ['Date', 'Peak', 'Elevation', 'Range', 'Route', 'Difficulty Class', 'Conditions', 'Party Size', 'Start Time', 'Summit Time', 'Notes'];

  const rows = summits.map((s) => [
    s.date_summited,
    s.peak?.name ?? '',
    s.peak?.elevation?.toString() ?? '',
    s.peak?.range ?? '',
    s.route?.name ?? '',
    s.route?.difficulty_class?.toString() ?? '',
    s.conditions ?? '',
    s.party_size?.toString() ?? '',
    s.start_time ?? '',
    s.summit_time ?? '',
    s.notes ?? ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((field) => `"${field.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="saltgoat-summits.csv"'
    }
  });
};

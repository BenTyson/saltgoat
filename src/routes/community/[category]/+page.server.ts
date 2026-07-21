import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getCategoryBySlug, getTopicsByCategory, getUserTopicViewTimestamps } from '$lib/server/forum';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const supabase = createSupabaseServerClient(cookies);

	const category = await getCategoryBySlug(supabase, params.category);
	if (!category) {
		error(404, 'Category not found');
	}

	const { topics, nextCursor } = await getTopicsByCategory(supabase, category.id, { limit: 20 });

	const { data: { user } } = await supabase.auth.getUser();
	const session = user ? { user } : null;
	const userId = session?.user?.id ?? null;

	let topicViews: Record<string, string> = {};
	if (userId && topics.length > 0) {
		topicViews = await getUserTopicViewTimestamps(
			supabase,
			userId,
			topics.map((t) => t.id)
		);
	}

	return {
		category,
		topics,
		nextCursor,
		topicViews,
		isLoggedIn: !!session
	};
};

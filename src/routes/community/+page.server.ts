import type { PageServerLoad } from './$types';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { getCategories, getRecentTopics, getPopularTopics, getUserTopicViewTimestamps, getUserBookmarks } from '$lib/server/forum';

export const load: PageServerLoad = async ({ cookies }) => {
	const supabase = createSupabaseServerClient(cookies);

	const { data: { user } } = await supabase.auth.getUser();
	const session = user ? { user } : null;

	const [categories, recentTopics, popularTopics] = await Promise.all([
		getCategories(supabase),
		getRecentTopics(supabase, 5),
		getPopularTopics(supabase, 5)
	]);

	let bookmarkedTopics: Awaited<ReturnType<typeof getUserBookmarks>>['topics'] = [];
	let topicViews: Record<string, string> = {};
	if (session?.user) {
		const allTopicIds = [...recentTopics, ...popularTopics].map((t) => t.id);
		const [bookmarkResult, views] = await Promise.all([
			getUserBookmarks(supabase, session.user.id, { limit: 5 }),
			allTopicIds.length > 0
				? getUserTopicViewTimestamps(supabase, session.user.id, allTopicIds)
				: {} as Record<string, string>
		]);
		bookmarkedTopics = bookmarkResult.topics;
		topicViews = views;
	}

	return {
		categories,
		recentTopics,
		popularTopics,
		bookmarkedTopics,
		topicViews,
		isLoggedIn: !!session
	};
};

import type { PageServerLoad } from './$types';
import { getCategories, getRecentTopics, getPopularTopics, getUserTopicViewTimestamps, getUserBookmarks } from '$lib/server/forum';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const { user } = await locals.safeGetSession();

	const [categories, recentTopics, popularTopics] = await Promise.all([
		getCategories(supabase),
		getRecentTopics(supabase, 5),
		getPopularTopics(supabase, 5)
	]);

	let bookmarkedTopics: Awaited<ReturnType<typeof getUserBookmarks>>['topics'] = [];
	let topicViews: Record<string, string> = {};
	if (user) {
		const allTopicIds = [...recentTopics, ...popularTopics].map((t) => t.id);
		const [bookmarkResult, views] = await Promise.all([
			getUserBookmarks(supabase, user.id, { limit: 5 }),
			allTopicIds.length > 0
				? getUserTopicViewTimestamps(supabase, user.id, allTopicIds)
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
		isLoggedIn: !!user
	};
};

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/server/supabase';
import {
	getTopicBySlug,
	getReplies,
	createReply,
	updateTopic,
	updateReply,
	deleteTopic,
	deleteReply,
	recordTopicView,
	getReactionsForPosts,
	toggleForumReaction,
	toggleBookmark,
	getBookmarkStatus
} from '$lib/server/forum';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const supabase = createSupabaseServerClient(cookies);

	const topic = await getTopicBySlug(supabase, params.category, params.topic);
	if (!topic) {
		error(404, 'Topic not found');
	}

	const { data: { user } } = await supabase.auth.getUser();
	const session = user ? { user } : null;

	const userId = session?.user?.id ?? null;

	const { replies, nextCursor } = await getReplies(supabase, topic.id, { limit: 30 });

	// Batch-fetch reactions for topic + all replies on this page
	const [topicReactions, replyReactions, bookmarkStatus] = await Promise.all([
		getReactionsForPosts(supabase, 'topic', [topic.id], userId),
		getReactionsForPosts(supabase, 'reply', replies.map((r) => r.id), userId),
		userId ? getBookmarkStatus(supabase, [topic.id], userId) : ({} as Record<string, boolean>)
	]);

	// Record view for logged-in users
	if (userId) {
		recordTopicView(supabase, topic.id, userId);
	}

	return {
		topic,
		replies,
		nextCursor,
		topicReactions: topicReactions[topic.id] ?? { counts: {}, userReactions: [] },
		replyReactions,
		isBookmarked: bookmarkStatus[topic.id] ?? false,
		isLoggedIn: !!session,
		currentUserId: userId
	};
};

export const actions: Actions = {
	createReply: async ({ request, cookies }) => {
		const supabase = createSupabaseServerClient(cookies);
		const { data: { user } } = await supabase.auth.getUser();
		const session = user ? { user } : null;

		if (!session?.user) {
			return fail(401, { message: 'Must be logged in to reply' });
		}

		const formData = await request.formData();
		const topicId = formData.get('topic_id') as string;
		const body = formData.get('body') as string;
		const replyToId = (formData.get('reply_to_id') as string) || undefined;

		if (!topicId || !body?.trim()) {
			return fail(400, { message: 'Reply body is required' });
		}

		const trimmedBody = body.trim();
		if (trimmedBody.length < 1 || trimmedBody.length > 5000) {
			return fail(400, { message: 'Reply must be 1-5,000 characters' });
		}

		try {
			await createReply(supabase, {
				topicId,
				authorId: session.user.id,
				body: trimmedBody,
				replyToId
			});
		} catch (err) {
			return fail(500, { message: 'Failed to create reply' });
		}

		return { success: true };
	},

	toggleReaction: async ({ request, cookies }) => {
		const supabase = createSupabaseServerClient(cookies);
		const { data: { user } } = await supabase.auth.getUser();
		const session = user ? { user } : null;

		if (!session?.user) {
			return fail(401, { message: 'Must be logged in to react' });
		}

		const formData = await request.formData();
		const reactableType = formData.get('reactable_type') as 'topic' | 'reply';
		const reactableId = formData.get('reactable_id') as string;
		const reactionType = formData.get('reaction_type') as string;

		if (!reactableType || !reactableId || !reactionType) {
			return fail(400, { message: 'Missing reaction data' });
		}

		try {
			await toggleForumReaction(supabase, {
				reactableType,
				reactableId,
				userId: session.user.id,
				reactionType
			});
		} catch (err) {
			return fail(500, { message: 'Failed to toggle reaction' });
		}

		return { success: true };
	},

	toggleBookmark: async ({ request, cookies }) => {
		const supabase = createSupabaseServerClient(cookies);
		const { data: { user } } = await supabase.auth.getUser();
		const session = user ? { user } : null;

		if (!session?.user) {
			return fail(401, { message: 'Must be logged in to bookmark' });
		}

		const formData = await request.formData();
		const topicId = formData.get('topic_id') as string;

		if (!topicId) {
			return fail(400, { message: 'Missing topic ID' });
		}

		try {
			await toggleBookmark(supabase, topicId, session.user.id);
		} catch (err) {
			return fail(500, { message: 'Failed to toggle bookmark' });
		}

		return { success: true };
	},

	updateTopic: async ({ request, cookies }) => {
		const supabase = createSupabaseServerClient(cookies);
		const { data: { user } } = await supabase.auth.getUser();
		const session = user ? { user } : null;

		if (!session?.user) {
			return fail(401, { message: 'Must be logged in' });
		}

		const formData = await request.formData();
		const topicId = formData.get('topic_id') as string;
		const title = (formData.get('title') as string)?.trim();
		const body = (formData.get('body') as string)?.trim();

		if (!title || title.length < 5 || title.length > 200) {
			return fail(400, { message: 'Title must be 5-200 characters' });
		}
		if (!body || body.length < 10 || body.length > 10000) {
			return fail(400, { message: 'Body must be 10-10,000 characters' });
		}

		try {
			await updateTopic(supabase, topicId, session.user.id, { title, body });
		} catch (err) {
			return fail(500, { message: 'Failed to update topic' });
		}

		return { success: true };
	},

	updateReply: async ({ request, cookies }) => {
		const supabase = createSupabaseServerClient(cookies);
		const { data: { user } } = await supabase.auth.getUser();
		const session = user ? { user } : null;

		if (!session?.user) {
			return fail(401, { message: 'Must be logged in' });
		}

		const formData = await request.formData();
		const replyId = formData.get('reply_id') as string;
		const body = (formData.get('body') as string)?.trim();

		if (!body || body.length < 1 || body.length > 5000) {
			return fail(400, { message: 'Reply must be 1-5,000 characters' });
		}

		try {
			await updateReply(supabase, replyId, session.user.id, { body });
		} catch (err) {
			return fail(500, { message: 'Failed to update reply' });
		}

		return { success: true };
	},

	deleteTopic: async ({ request, cookies, params }) => {
		const supabase = createSupabaseServerClient(cookies);
		const { data: { user } } = await supabase.auth.getUser();
		const session = user ? { user } : null;

		if (!session?.user) {
			return fail(401, { message: 'Must be logged in' });
		}

		const formData = await request.formData();
		const topicId = formData.get('topic_id') as string;

		try {
			await deleteTopic(supabase, topicId, session.user.id);
		} catch (err) {
			return fail(500, { message: 'Failed to delete topic' });
		}

		redirect(303, `/community/${params.category}`);
	},

	deleteReply: async ({ request, cookies }) => {
		const supabase = createSupabaseServerClient(cookies);
		const { data: { user } } = await supabase.auth.getUser();
		const session = user ? { user } : null;

		if (!session?.user) {
			return fail(401, { message: 'Must be logged in' });
		}

		const formData = await request.formData();
		const replyId = formData.get('reply_id') as string;

		try {
			await deleteReply(supabase, replyId, session.user.id);
		} catch (err) {
			return fail(500, { message: 'Failed to delete reply' });
		}

		return { success: true };
	}
};

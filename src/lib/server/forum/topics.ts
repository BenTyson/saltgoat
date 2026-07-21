import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { ForumTopicWithAuthor, TopicDetail } from './types';
import { db, TOPIC_SELECT, TOPIC_DETAIL_SELECT, generateUniqueSlug, insertMentions, enrichWithAuthors } from './utils';

export async function getTopicsByCategory(
	supabase: SupabaseClient<Database>,
	categoryId: string,
	opts: { cursor?: string; limit?: number } = {}
): Promise<{ topics: ForumTopicWithAuthor[]; nextCursor: string | null }> {
	const { cursor, limit = 20 } = opts;
	const client = db(supabase);

	let pinnedTopics: any[] = [];

	if (!cursor) {
		const { data: pinned } = await client
			.from('forum_topics')
			.select(TOPIC_SELECT)
			.eq('category_id', categoryId)
			.eq('is_pinned', true)
			.order('last_reply_at', { ascending: false });
		pinnedTopics = pinned ?? [];
	}

	let query = client
		.from('forum_topics')
		.select(TOPIC_SELECT)
		.eq('category_id', categoryId)
		.eq('is_pinned', false)
		.order('last_reply_at', { ascending: false })
		.limit(limit + 1);

	if (cursor) {
		query = query.lt('last_reply_at', cursor);
	}

	const { data } = await query;
	const regular = data ?? [];
	const hasMore = regular.length > limit;
	const page = regular.slice(0, limit);
	const nextCursor = hasMore ? page[page.length - 1].last_reply_at : null;

	const allTopics = [...pinnedTopics, ...page];
	await enrichWithAuthors(supabase, allTopics, (t) => t.author_id);

	return { topics: allTopics as ForumTopicWithAuthor[], nextCursor };
}

export async function getPopularTopics(
	supabase: SupabaseClient<Database>,
	limit = 5
): Promise<ForumTopicWithAuthor[]> {
	const client = db(supabase);
	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

	const { data } = await client
		.from('forum_topics')
		.select(TOPIC_SELECT)
		.gte('created_at', thirtyDaysAgo)
		.order('reply_count', { ascending: false })
		.limit(limit);

	const topics = data ?? [];
	await enrichWithAuthors(supabase, topics, (t) => t.author_id);
	return topics as ForumTopicWithAuthor[];
}

export async function getRecentTopics(
	supabase: SupabaseClient<Database>,
	limit = 5
): Promise<ForumTopicWithAuthor[]> {
	const client = db(supabase);

	const { data } = await client
		.from('forum_topics')
		.select(TOPIC_SELECT)
		.order('created_at', { ascending: false })
		.limit(limit);

	const topics = data ?? [];
	await enrichWithAuthors(supabase, topics, (t) => t.author_id);
	return topics as ForumTopicWithAuthor[];
}

export async function getTopicsForPeak(
	supabase: SupabaseClient<Database>,
	peakId: string,
	limit = 5
): Promise<ForumTopicWithAuthor[]> {
	const client = db(supabase);

	const { data } = await client
		.from('forum_topics')
		.select(TOPIC_SELECT)
		.eq('peak_id', peakId)
		.order('last_reply_at', { ascending: false })
		.limit(limit);

	const topics = data ?? [];
	await enrichWithAuthors(supabase, topics, (t) => t.author_id);
	return topics as ForumTopicWithAuthor[];
}

export async function getUserTopics(
	supabase: SupabaseClient<Database>,
	userId: string,
	opts: { cursor?: string; limit?: number } = {}
): Promise<{ topics: ForumTopicWithAuthor[]; nextCursor: string | null }> {
	const { cursor, limit = 20 } = opts;
	const client = db(supabase);

	let query = client
		.from('forum_topics')
		.select(TOPIC_SELECT)
		.eq('author_id', userId)
		.order('created_at', { ascending: false })
		.limit(limit + 1);

	if (cursor) {
		query = query.lt('created_at', cursor);
	}

	const { data } = await query;
	const topics = data ?? [];
	const hasMore = topics.length > limit;
	const page = topics.slice(0, limit);
	const nextCursor = hasMore ? page[page.length - 1].created_at : null;

	await enrichWithAuthors(supabase, page, (t) => t.author_id);

	return { topics: page as ForumTopicWithAuthor[], nextCursor };
}

export async function getTopicDetail(
	supabase: SupabaseClient<Database>,
	topicId: string
): Promise<TopicDetail | null> {
	const client = db(supabase);

	const { data, error } = await client
		.from('forum_topics')
		.select(TOPIC_DETAIL_SELECT)
		.eq('id', topicId)
		.single();

	if (error) {
		if (error.code !== 'PGRST116') logger.error('Error fetching topic', { error: error });
		return null;
	}

	const topic = data as any;
	await enrichWithAuthors(supabase, [topic], (t) => t.author_id);
	return topic as TopicDetail;
}

export async function getTopicBySlug(
	supabase: SupabaseClient<Database>,
	categorySlug: string,
	topicSlug: string
): Promise<TopicDetail | null> {
	const client = db(supabase);

	const { data: category } = await client
		.from('forum_categories')
		.select('id')
		.eq('slug', categorySlug)
		.single();

	if (!category) return null;

	const { data, error } = await client
		.from('forum_topics')
		.select(TOPIC_DETAIL_SELECT)
		.eq('category_id', category.id)
		.eq('slug', topicSlug)
		.single();

	if (error) {
		if (error.code !== 'PGRST116') logger.error('Error fetching topic by slug', { error: error });
		return null;
	}

	const topic = data as any;
	await enrichWithAuthors(supabase, [topic], (t) => t.author_id);
	return topic as TopicDetail;
}

export async function createTopic(
	supabase: SupabaseClient<Database>,
	data: {
		title: string;
		body: string;
		categoryId: string;
		authorId: string;
		peakId?: string;
		routeId?: string;
	}
): Promise<ForumTopicWithAuthor> {
	const client = db(supabase);
	const slug = await generateUniqueSlug(client, data.categoryId, data.title);

	const { data: topic, error } = await client
		.from('forum_topics')
		.insert({
			slug,
			title: data.title,
			body: data.body,
			category_id: data.categoryId,
			author_id: data.authorId,
			peak_id: data.peakId ?? null,
			route_id: data.routeId ?? null
		})
		.select(TOPIC_SELECT)
		.single();

	if (error) throw error;

	await insertMentions(client, 'topic', topic.id, data.body);
	await enrichWithAuthors(supabase, [topic], (t) => t.author_id);

	return topic as unknown as ForumTopicWithAuthor;
}

export async function updateTopic(
	supabase: SupabaseClient<Database>,
	topicId: string,
	userId: string,
	data: { title?: string; body?: string }
): Promise<void> {
	const { error } = await db(supabase)
		.from('forum_topics')
		.update(data)
		.eq('id', topicId)
		.eq('author_id', userId);

	if (error) throw error;
}

export async function deleteTopic(
	supabase: SupabaseClient<Database>,
	topicId: string,
	userId: string
): Promise<void> {
	const { error } = await db(supabase)
		.from('forum_topics')
		.delete()
		.eq('id', topicId)
		.eq('author_id', userId);

	if (error) throw error;
}

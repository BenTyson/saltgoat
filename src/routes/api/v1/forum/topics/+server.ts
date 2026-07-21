import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/supabase';
import { createTopic } from '$lib/server/forum';
import { rateLimit, clientKey, tooManyRequests } from '$lib/server/rateLimit';
import { logger } from '$lib/server/logger';

/** POST /api/v1/forum/topics — create a new forum topic */
export const POST: RequestHandler = async (event) => {
	const { request } = event;

	const limit = rateLimit('ugc', clientKey(event));
	if (!limit.allowed) return tooManyRequests(limit);

	const { supabase, user, error: authError } = await requireAuth(request);

	if (!supabase || !user) {
		return new Response(JSON.stringify({ error: authError }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await request.json();
	const { title, body: topicBody, category_id, peak_id, route_id } = body;

	if (!title?.trim() || !topicBody?.trim() || !category_id) {
		return new Response(
			JSON.stringify({ error: 'title, body, and category_id are required' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const trimmedTitle = title.trim();
	const trimmedBody = topicBody.trim();

	if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
		return new Response(
			JSON.stringify({ error: 'Title must be 5-200 characters' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	if (trimmedBody.length < 10 || trimmedBody.length > 10000) {
		return new Response(
			JSON.stringify({ error: 'Body must be 10-10,000 characters' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	try {
		const topic = await createTopic(supabase, {
			title: trimmedTitle,
			body: trimmedBody,
			categoryId: category_id,
			authorId: user.id,
			peakId: peak_id || undefined,
			routeId: route_id || undefined
		});

		return new Response(JSON.stringify({ topic }), {
			status: 201,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		logger.error('Error creating forum topic', { error: e });
		return new Response(JSON.stringify({ error: 'Failed to create topic' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

import type { RequestHandler } from './$types';
import { createSupabaseApiClient, createSupabaseServerClient, requireAuth } from '$lib/server/supabase';
import { getReplies, createReply, getReactionsForPosts } from '$lib/server/forum';
import { rateLimit, clientKey, tooManyRequests } from '$lib/server/rateLimit';
import { logger } from '$lib/server/logger';

/** GET /api/v1/forum/topics/[id]/replies — paginated replies */
export const GET: RequestHandler = async ({ params, url, cookies, request }) => {
	const { supabase: apiClient } = createSupabaseApiClient(request);
	const supabase = apiClient || createSupabaseServerClient(cookies);

	const cursor = url.searchParams.get('cursor') ?? undefined;
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 30), 50);

	const { replies, nextCursor } = await getReplies(supabase, params.id, { cursor, limit });

	// Try to get user ID for reaction highlighting
	let userId: string | undefined;
	if (apiClient) {
		try {
			const { data: { user } } = await apiClient.auth.getUser();
			userId = user?.id;
		} catch { /* optional */ }
	} else {
		const { data: { session } } = await supabase.auth.getSession();
		userId = session?.user?.id;
	}

	const replyIds = replies.map((r) => r.id);
	const reactions = await getReactionsForPosts(supabase, 'reply', replyIds, userId);

	return new Response(JSON.stringify({ replies, nextCursor, reactions }), {
		headers: { 'Content-Type': 'application/json' }
	});
};

/** POST /api/v1/forum/topics/[id]/replies — create a reply */
export const POST: RequestHandler = async (event) => {
	const { params, request } = event;

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
	const { body: replyBody, reply_to_id } = body;

	if (!replyBody?.trim()) {
		return new Response(JSON.stringify({ error: 'body is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const trimmedBody = replyBody.trim();
	if (trimmedBody.length < 1 || trimmedBody.length > 5000) {
		return new Response(JSON.stringify({ error: 'Reply must be 1-5,000 characters' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const reply = await createReply(supabase, {
			topicId: params.id,
			authorId: user.id,
			body: trimmedBody,
			replyToId: reply_to_id || undefined
		});

		return new Response(JSON.stringify({ reply }), {
			status: 201,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		logger.error('Error creating reply', { error: e });
		return new Response(JSON.stringify({ error: 'Failed to create reply' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

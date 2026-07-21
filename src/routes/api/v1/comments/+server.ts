import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/supabase';
import { createComment, deleteComment } from '$lib/server/comments';
import { rateLimit, clientKey, tooManyRequests } from '$lib/server/rateLimit';
import { logger } from '$lib/server/logger';

/** POST /api/v1/comments — create a comment on a summit */
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
	const { summit_id, body: commentBody } = body;

	if (!summit_id || !commentBody?.trim()) {
		return new Response(JSON.stringify({ error: 'summit_id and body are required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const comment = await createComment(supabase, summit_id, user.id, commentBody.trim());
		if (!comment) {
			return new Response(JSON.stringify({ error: 'Failed to create comment' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		return new Response(JSON.stringify({ comment }), {
			status: 201,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		logger.error('Error creating comment', { error: e });
		return new Response(JSON.stringify({ error: 'Failed to create comment' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

/** DELETE /api/v1/comments — delete own comment */
export const DELETE: RequestHandler = async ({ request }) => {
	const { supabase, user, error: authError } = await requireAuth(request);

	if (!supabase || !user) {
		return new Response(JSON.stringify({ error: authError }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await request.json();
	const { comment_id } = body;

	if (!comment_id) {
		return new Response(JSON.stringify({ error: 'comment_id is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		await deleteComment(supabase, comment_id);
		return new Response(null, { status: 204 });
	} catch (e) {
		logger.error('Error deleting comment', { error: e });
		return new Response(JSON.stringify({ error: 'Failed to delete comment' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

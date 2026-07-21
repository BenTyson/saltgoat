import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { ForumSearchResult } from './types';
import { db } from './utils';

export async function searchForum(
	supabase: SupabaseClient<Database>,
	query: string,
	opts: { category?: string; limit?: number; offset?: number } = {}
): Promise<ForumSearchResult[]> {
	const { category, limit = 20, offset = 0 } = opts;
	const client = db(supabase);

	let categoryId: string | null = null;
	if (category) {
		const { data: cat } = await client
			.from('forum_categories')
			.select('id')
			.eq('slug', category)
			.single();
		categoryId = cat?.id ?? null;
	}

	const { data, error } = await client.rpc('search_forum', {
		search_query: query,
		category_filter: categoryId,
		result_limit: limit,
		result_offset: offset
	});

	if (error) {
		logger.error('Error searching forum', { error: error });
		return [];
	}

	return (data ?? []) as ForumSearchResult[];
}

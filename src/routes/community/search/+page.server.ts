import type { PageServerLoad } from './$types';
import { searchForum, getCategories } from '$lib/server/forum';

export const load: PageServerLoad = async ({ url, locals }) => {
	const { supabase } = locals;

	const query = url.searchParams.get('q')?.trim() ?? '';
	const category = url.searchParams.get('category') ?? undefined;

	const [categories, results] = await Promise.all([
		getCategories(supabase),
		query.length >= 2 ? searchForum(supabase, query, { category, limit: 30 }) : []
	]);

	return {
		query,
		category: category ?? '',
		categories,
		results
	};
};

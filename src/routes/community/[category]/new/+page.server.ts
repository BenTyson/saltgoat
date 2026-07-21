import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getCategoryBySlug, createTopic } from '$lib/server/forum';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { supabase } = locals;

	const { user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, `/auth?redirect=/community/${params.category}/new`);
	}

	const category = await getCategoryBySlug(supabase, params.category);
	if (!category) {
		error(404, 'Category not found');
	}

	// Get peaks list for the picker
	const { data: peaks } = await supabase
		.from('peaks')
		.select('id, name, slug')
		.order('name');

	const preselectedPeakSlug = url.searchParams.get('peak') ?? null;

	return {
		category,
		peaks: peaks ?? [],
		preselectedPeakSlug
	};
};

export const actions: Actions = {
	createTopic: async ({ request, locals, params }) => {
		const { supabase } = locals;
		const { user } = await locals.safeGetSession();

		if (!user) {
			return fail(401, { message: 'Must be logged in to create a topic' });
		}

		const formData = await request.formData();
		const title = (formData.get('title') as string)?.trim();
		const body = (formData.get('body') as string)?.trim();
		const categoryId = formData.get('category_id') as string;
		const peakId = (formData.get('peak_id') as string) || undefined;

		if (!title || title.length < 5) {
			return fail(400, { message: 'Title must be at least 5 characters' });
		}
		if (title.length > 200) {
			return fail(400, { message: 'Title must be under 200 characters' });
		}
		if (!body || body.length < 10) {
			return fail(400, { message: 'Body must be at least 10 characters' });
		}
		if (body.length > 10000) {
			return fail(400, { message: 'Body must be under 10,000 characters' });
		}

		try {
			const topic = await createTopic(supabase, {
				title,
				body,
				categoryId,
				authorId: user.id,
				peakId
			});

			redirect(303, `/community/${params.category}/${topic.slug}`);
		} catch (err) {
			// redirect throws, so re-throw it
			if (err && typeof err === 'object' && 'status' in err) throw err;
			return fail(500, { message: 'Failed to create topic' });
		}
	}
};

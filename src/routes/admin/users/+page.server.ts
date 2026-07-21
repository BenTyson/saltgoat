import type { PageServerLoad } from './$types';
import { getAdminUserList } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals, url }) => {
  const { supabase } = locals;

  const search = url.searchParams.get('search') ?? undefined;
  const sortBy = url.searchParams.get('sort') ?? 'created_at';
  const sortDir = (url.searchParams.get('dir') ?? 'desc') as 'asc' | 'desc';
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);

  const result = await getAdminUserList(supabase, { search, sortBy, sortDir, page, limit: 25 });

  return {
    users: result.users,
    total: result.total,
    search: search ?? '',
    sortBy,
    sortDir,
    page,
    totalPages: Math.ceil(result.total / 25)
  };
};

import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { redirect } from '@sveltejs/kit';

const ADMIN_USER_ID = 'c983d602-d0e0-4da6-be9d-f91a456bfdb0';

export function isAdmin(userId: string | undefined): boolean {
	return userId === ADMIN_USER_ID;
}

export function assertAdmin(session: { user?: { id: string } } | null): void {
	if (!session?.user || !isAdmin(session.user.id)) {
		throw redirect(302, '/');
	}
}

// ── Overview Stats ──────────────────────────────────────────────────

export interface OverviewStats {
	totalUsers: number;
	activeUsers7d: number;
	proSubscribers: number;
	pendingFlags: number;
	flaggedImages: number;
	totalSummits: number;
	totalReviews: number;
	totalPhotos: number;
	totalTrailReports: number;
	recentSignups: Array<{ id: string; display_name: string | null; username: string | null; created_at: string | null }>;
}

export async function getAdminOverviewStats(
	supabase: SupabaseClient<Database>
): Promise<OverviewStats> {
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

	const [
		usersResult,
		proResult,
		pendingFlagsResult,
		flaggedImagesResult,
		summitsResult,
		reviewsResult,
		photosResult,
		trailReportsResult,
		recentSummitUsersResult,
		recentReviewUsersResult,
		recentReportUsersResult,
		recentSignupsResult
	] = await Promise.all([
		supabase.from('profiles').select('id', { count: 'exact', head: true }),
		supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'pro').eq('status', 'active'),
		supabase.from('content_flags').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		supabase.from('peak_images').select('id', { count: 'exact', head: true }).eq('status', 'flagged'),
		supabase.from('user_summits').select('id', { count: 'exact', head: true }),
		supabase.from('user_reviews').select('id', { count: 'exact', head: true }),
		supabase.from('peak_images').select('id', { count: 'exact', head: true }).neq('status', 'removed'),
		supabase.from('trail_reports').select('id', { count: 'exact', head: true }),
		supabase.from('user_summits').select('user_id').gte('created_at', sevenDaysAgo),
		supabase.from('user_reviews').select('user_id').gte('created_at', sevenDaysAgo),
		supabase.from('trail_reports').select('user_id').gte('created_at', sevenDaysAgo),
		supabase.from('profiles').select('id, display_name, username, created_at').order('created_at', { ascending: false }).limit(10)
	]);

	// Compute active users (distinct across summits, reviews, trail reports in last 7d)
	const activeUserIds = new Set<string>();
	for (const row of recentSummitUsersResult.data ?? []) activeUserIds.add(row.user_id);
	for (const row of recentReviewUsersResult.data ?? []) activeUserIds.add(row.user_id);
	for (const row of recentReportUsersResult.data ?? []) activeUserIds.add(row.user_id);

	return {
		totalUsers: usersResult.count ?? 0,
		activeUsers7d: activeUserIds.size,
		proSubscribers: proResult.count ?? 0,
		pendingFlags: pendingFlagsResult.count ?? 0,
		flaggedImages: flaggedImagesResult.count ?? 0,
		totalSummits: summitsResult.count ?? 0,
		totalReviews: reviewsResult.count ?? 0,
		totalPhotos: photosResult.count ?? 0,
		totalTrailReports: trailReportsResult.count ?? 0,
		recentSignups: recentSignupsResult.data ?? []
	};
}

// ── User List ───────────────────────────────────────────────────────

export interface AdminUser {
	id: string;
	display_name: string | null;
	username: string | null;
	avatar_url: string | null;
	created_at: string | null;
	summit_count: number;
	photo_count: number;
	plan: string | null;
}

export async function getAdminUserList(
	supabase: SupabaseClient<Database>,
	options: {
		search?: string;
		sortBy?: string;
		sortDir?: 'asc' | 'desc';
		page?: number;
		limit?: number;
	} = {}
): Promise<{ users: AdminUser[]; total: number }> {
	const { search, sortBy = 'created_at', sortDir = 'desc', page = 1, limit = 25 } = options;
	const offset = (page - 1) * limit;

	let query = supabase
		.from('profiles')
		.select('id, display_name, username, avatar_url, created_at', { count: 'exact' });

	if (search) {
		query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%`);
	}

	const validSorts = ['created_at', 'display_name', 'username'];
	const sortColumn = validSorts.includes(sortBy) ? sortBy : 'created_at';
	query = query.order(sortColumn, { ascending: sortDir === 'asc' }).range(offset, offset + limit - 1);

	const { data, count, error } = await query;
	if (error) {
		logger.error('Error fetching admin user list', { error: error });
		return { users: [], total: 0 };
	}

	if (!data || data.length === 0) return { users: [], total: count ?? 0 };

	const userIds = data.map((u) => u.id);

	// Get summit counts and photo counts in parallel
	const [summitCounts, photoCounts, subscriptions] = await Promise.all([
		supabase.from('user_summits').select('user_id').in('user_id', userIds),
		supabase.from('peak_images').select('uploaded_by').in('uploaded_by', userIds).neq('status', 'removed'),
		supabase.from('user_subscriptions').select('user_id, plan').in('user_id', userIds).eq('status', 'active')
	]);

	const summitMap = new Map<string, number>();
	for (const row of summitCounts.data ?? []) {
		summitMap.set(row.user_id, (summitMap.get(row.user_id) ?? 0) + 1);
	}

	const photoMap = new Map<string, number>();
	for (const row of photoCounts.data ?? []) {
		photoMap.set(row.uploaded_by, (photoMap.get(row.uploaded_by) ?? 0) + 1);
	}

	const subMap = new Map<string, string>();
	for (const row of subscriptions.data ?? []) {
		subMap.set(row.user_id, row.plan);
	}

	const users: AdminUser[] = data.map((u) => ({
		...u,
		summit_count: summitMap.get(u.id) ?? 0,
		photo_count: photoMap.get(u.id) ?? 0,
		plan: subMap.get(u.id) ?? 'free'
	}));

	// Client-side sort for summit_count since it's computed
	if (sortBy === 'summit_count') {
		users.sort((a, b) => sortDir === 'asc' ? a.summit_count - b.summit_count : b.summit_count - a.summit_count);
	}

	return { users, total: count ?? 0 };
}

// ── Content Queries ─────────────────────────────────────────────────

export interface AdminPhoto {
	id: string;
	peak_id: string;
	uploaded_by: string;
	storage_path: string;
	caption: string | null;
	status: string | null;
	flag_count: number | null;
	category: string | null;
	created_at: string | null;
	url: string;
	peak_name: string;
	peak_slug: string;
	uploader_name: string | null;
}

export async function getAdminPhotos(
	supabase: SupabaseClient<Database>,
	options: { status?: string; page?: number; limit?: number } = {}
): Promise<{ items: AdminPhoto[]; total: number }> {
	const { status, page = 1, limit = 25 } = options;
	const offset = (page - 1) * limit;

	let query = supabase
		.from('peak_images')
		.select('*, peak:peaks(name, slug)', { count: 'exact' });

	if (status) {
		query = query.eq('status', status);
	}

	query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

	const { data, count, error } = await query;
	if (error) {
		logger.error('Error fetching admin photos', { error: error });
		return { items: [], total: 0 };
	}

	if (!data || data.length === 0) return { items: [], total: count ?? 0 };

	const uploaderIds = [...new Set(data.map((p) => p.uploaded_by))];
	const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', uploaderIds);
	const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

	const items: AdminPhoto[] = data.map((p) => {
		const peak = p.peak as { name: string; slug: string } | null;
		const { data: urlData } = supabase.storage.from('peak-images').getPublicUrl(p.storage_path);
		return {
			id: p.id,
			peak_id: p.peak_id,
			uploaded_by: p.uploaded_by,
			storage_path: p.storage_path,
			caption: p.caption,
			status: p.status,
			flag_count: p.flag_count,
			category: p.category,
			created_at: p.created_at,
			url: urlData.publicUrl,
			peak_name: peak?.name ?? 'Unknown',
			peak_slug: peak?.slug ?? '',
			uploader_name: profileMap.get(p.uploaded_by) ?? null
		};
	});

	return { items, total: count ?? 0 };
}

export interface AdminReview {
	id: string;
	user_id: string;
	peak_id: string;
	rating: number;
	title: string | null;
	body: string | null;
	date_climbed: string | null;
	created_at: string | null;
	peak_name: string;
	peak_slug: string;
	author_name: string | null;
}

export async function getAdminReviews(
	supabase: SupabaseClient<Database>,
	options: { page?: number; limit?: number } = {}
): Promise<{ items: AdminReview[]; total: number }> {
	const { page = 1, limit = 25 } = options;
	const offset = (page - 1) * limit;

	const { data, count, error } = await supabase
		.from('user_reviews')
		.select('*, peak:peaks(name, slug)', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		logger.error('Error fetching admin reviews', { error: error });
		return { items: [], total: 0 };
	}

	if (!data || data.length === 0) return { items: [], total: count ?? 0 };

	const userIds = [...new Set(data.map((r) => r.user_id))];
	const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
	const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

	const items: AdminReview[] = data.map((r) => {
		const peak = r.peak as { name: string; slug: string } | null;
		return {
			id: r.id,
			user_id: r.user_id,
			peak_id: r.peak_id,
			rating: r.rating,
			title: r.title,
			body: r.body,
			date_climbed: r.date_climbed,
			created_at: r.created_at,
			peak_name: peak?.name ?? 'Unknown',
			peak_slug: peak?.slug ?? '',
			author_name: profileMap.get(r.user_id) ?? null
		};
	});

	return { items, total: count ?? 0 };
}

export interface AdminTrailReport {
	id: string;
	user_id: string;
	peak_id: string;
	hike_date: string | null;
	trail_status: string | null;
	crowd_level: string | null;
	notes: string | null;
	created_at: string | null;
	peak_name: string;
	peak_slug: string;
	author_name: string | null;
}

export async function getAdminTrailReports(
	supabase: SupabaseClient<Database>,
	options: { page?: number; limit?: number } = {}
): Promise<{ items: AdminTrailReport[]; total: number }> {
	const { page = 1, limit = 25 } = options;
	const offset = (page - 1) * limit;

	const { data, count, error } = await supabase
		.from('trail_reports')
		.select('*, peak:peaks(name, slug)', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		logger.error('Error fetching admin trail reports', { error: error });
		return { items: [], total: 0 };
	}

	if (!data || data.length === 0) return { items: [], total: count ?? 0 };

	const userIds = [...new Set(data.map((r) => r.user_id))];
	const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
	const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

	const items: AdminTrailReport[] = data.map((r) => {
		const peak = r.peak as { name: string; slug: string } | null;
		return {
			id: r.id,
			user_id: r.user_id,
			peak_id: r.peak_id,
			hike_date: r.hike_date,
			trail_status: r.trail_status,
			crowd_level: r.crowd_level,
			notes: r.notes,
			created_at: r.created_at,
			peak_name: peak?.name ?? 'Unknown',
			peak_slug: peak?.slug ?? '',
			author_name: profileMap.get(r.user_id) ?? null
		};
	});

	return { items, total: count ?? 0 };
}

export interface AdminTrace {
	id: string;
	route_id: string;
	uploaded_by: string;
	point_count: number | null;
	distance_miles: number | null;
	vote_count: number | null;
	created_at: string | null;
	route_name: string;
	uploader_name: string | null;
}

export async function getAdminTraces(
	supabase: SupabaseClient<Database>,
	options: { page?: number; limit?: number } = {}
): Promise<{ items: AdminTrace[]; total: number }> {
	const { page = 1, limit = 25 } = options;
	const offset = (page - 1) * limit;

	const { data, count, error } = await supabase
		.from('route_traces')
		.select('*, route:routes(name)', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		logger.error('Error fetching admin traces', { error: error });
		return { items: [], total: 0 };
	}

	if (!data || data.length === 0) return { items: [], total: count ?? 0 };

	const uploaderIds = [...new Set(data.map((t) => t.uploaded_by))];
	const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', uploaderIds);
	const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

	const items: AdminTrace[] = data.map((t) => {
		const route = t.route as { name: string } | null;
		return {
			id: t.id,
			route_id: t.route_id,
			uploaded_by: t.uploaded_by,
			point_count: t.point_count,
			distance_miles: t.distance_miles,
			vote_count: t.vote_count,
			created_at: t.created_at,
			route_name: route?.name ?? 'Unknown',
			uploader_name: profileMap.get(t.uploaded_by) ?? null
		};
	});

	return { items, total: count ?? 0 };
}

// ── Subscription Metrics ────────────────────────────────────────────

export interface SubscriptionMetrics {
	totalPro: number;
	totalFree: number;
	activeCount: number;
	trialingCount: number;
	canceledCount: number;
	pastDueCount: number;
	conversionRate: number;
	subscriptions: Array<{
		id: string;
		user_id: string;
		plan: string;
		status: string | null;
		current_period_end: string | null;
		created_at: string | null;
		display_name: string | null;
		username: string | null;
	}>;
}

export async function getSubscriptionMetrics(
	supabase: SupabaseClient<Database>
): Promise<SubscriptionMetrics> {
	const [totalUsersResult, subsResult] = await Promise.all([
		supabase.from('profiles').select('id', { count: 'exact', head: true }),
		supabase.from('user_subscriptions').select('*').order('created_at', { ascending: false })
	]);

	const totalUsers = totalUsersResult.count ?? 0;
	const subs = subsResult.data ?? [];

	const activeCount = subs.filter((s) => s.status === 'active').length;
	const trialingCount = subs.filter((s) => s.status === 'trialing').length;
	const canceledCount = subs.filter((s) => s.status === 'canceled').length;
	const pastDueCount = subs.filter((s) => s.status === 'past_due').length;
	const totalPro = subs.filter((s) => s.plan === 'pro' && s.status === 'active').length;
	const totalFree = totalUsers - totalPro;
	const conversionRate = totalUsers > 0 ? (totalPro / totalUsers) * 100 : 0;

	// Get profile info for subscribers
	const userIds = subs.map((s) => s.user_id);
	const { data: profiles } = userIds.length > 0
		? await supabase.from('profiles').select('id, display_name, username').in('id', userIds)
		: { data: [] };

	const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

	const subscriptions = subs.map((s) => {
		const profile = profileMap.get(s.user_id);
		return {
			id: s.id,
			user_id: s.user_id,
			plan: s.plan,
			status: s.status,
			current_period_end: s.current_period_end,
			created_at: s.created_at,
			display_name: profile?.display_name ?? null,
			username: profile?.username ?? null
		};
	});

	return {
		totalPro,
		totalFree,
		activeCount,
		trialingCount,
		canceledCount,
		pastDueCount,
		conversionRate,
		subscriptions
	};
}

// ── Moderation Helpers ──────────────────────────────────────────────

export interface ResolvedFlag {
	id: string;
	content_type: string;
	content_id: string;
	reason: string;
	details: string | null;
	status: string | null;
	created_at: string | null;
	reviewed_by: string | null;
	reporter_name: string | null;
	reviewer_name: string | null;
}

export async function getResolvedFlags(
	supabase: SupabaseClient<Database>,
	limit = 50
): Promise<ResolvedFlag[]> {
	const { data, error } = await supabase
		.from('content_flags')
		.select('*')
		.in('status', ['dismissed', 'actioned'])
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) {
		logger.error('Error fetching resolved flags', { error: error });
		return [];
	}

	if (!data || data.length === 0) return [];

	const allUserIds = [...new Set([
		...data.map((f) => f.reported_by),
		...data.filter((f) => f.reviewed_by).map((f) => f.reviewed_by!)
	])];

	const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', allUserIds);
	const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

	return data.map((f) => ({
		...f,
		reporter_name: profileMap.get(f.reported_by) ?? null,
		reviewer_name: f.reviewed_by ? profileMap.get(f.reviewed_by) ?? null : null
	}));
}

export async function getRecentPhotos(
	supabase: SupabaseClient<Database>,
	limit = 20
): Promise<AdminPhoto[]> {
	const result = await getAdminPhotos(supabase, { page: 1, limit });
	return result.items;
}

export async function adminDeleteReview(
	supabase: SupabaseClient<Database>,
	reviewId: string
): Promise<void> {
	const { error } = await supabase.from('user_reviews').delete().eq('id', reviewId);
	if (error) throw error;

	// Resolve any related flags
	await supabase
		.from('content_flags')
		.update({ status: 'actioned' })
		.eq('content_type', 'review')
		.eq('content_id', reviewId)
		.eq('status', 'pending');
}

export async function adminDeleteTrailReport(
	supabase: SupabaseClient<Database>,
	reportId: string
): Promise<void> {
	const { error } = await supabase.from('trail_reports').delete().eq('id', reportId);
	if (error) throw error;

	await supabase
		.from('content_flags')
		.update({ status: 'actioned' })
		.eq('content_type', 'trail_report')
		.eq('content_id', reportId)
		.eq('status', 'pending');
}

export async function adminDeleteTrace(
	supabase: SupabaseClient<Database>,
	traceId: string
): Promise<void> {
	// Get storage path before deleting
	const { data: trace } = await supabase
		.from('route_traces')
		.select('storage_path')
		.eq('id', traceId)
		.single();

	if (trace?.storage_path) {
		await supabase.storage.from('gpx-traces').remove([trace.storage_path]);
	}

	const { error } = await supabase.from('route_traces').delete().eq('id', traceId);
	if (error) throw error;
}

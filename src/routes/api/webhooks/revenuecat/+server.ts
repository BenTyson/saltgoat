import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { sendRaw } from '$lib/server/sparrow';
import { safeBearerEqual } from '$lib/server/security';
import { rateLimit, clientKey, tooManyRequests } from '$lib/server/rateLimit';
import { logger } from '$lib/server/logger';

interface RevenueCatEvent {
	type: string;
	app_user_id: string;
	original_transaction_id?: string;
	product_id?: string;
	expiration_at_ms?: number;
	event_timestamp_ms?: number;
	store?: string;
}

interface RevenueCatWebhook {
	event: RevenueCatEvent;
}

function getPlatform(store?: string): string | null {
	if (store === 'APP_STORE' || store === 'MAC_APP_STORE') return 'ios';
	if (store === 'PLAY_STORE') return 'android';
	return null;
}

// Generic UUID matcher (any version) — `user_subscriptions.user_id` is a
// Postgres `uuid` column, so anything else can never match a row.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: RequestHandler = async (event) => {
	const { request } = event;

	const secret = env.REVENUECAT_WEBHOOK_SECRET;
	if (!secret) {
		return json({ error: 'Webhook not configured' }, { status: 500 });
	}

	// R-H1 fix: rate-limit only FAILED auth attempts, checked AFTER the secret
	// compare, not before. The IP/clientKey is attacker-spoofable (see
	// rateLimit.ts), so limiting it pre-auth let an attacker exhaust a real
	// caller's (RevenueCat's) bucket with junk requests and 429 legitimate
	// webhook traffic — without ever needing the secret. Gating on auth
	// failure caps secret brute-forcing while leaving authenticated traffic
	// (the only traffic that matters here) unthrottled.
	const authHeader = request.headers.get('Authorization');
	if (!safeBearerEqual(authHeader, secret)) {
		const limit = rateLimit('webhook', clientKey(event));
		if (!limit.allowed) return tooManyRequests(limit);
		return json({ error: 'Invalid authorization' }, { status: 401 });
	}

	const body = (await request.json()) as RevenueCatWebhook;
	const rcEvent = body.event;
	if (!rcEvent?.type || !rcEvent?.app_user_id) {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	const userId = rcEvent.app_user_id;

	// R-RC1 fix: RevenueCat sends anonymous ($RCAnonymousID:...) or alias ids
	// for purchases made before/without Purchases.logIn(user.id). Those can
	// never match a `user_subscriptions.user_id` (uuid) row — writing them is
	// undeliverable by construction. Pre-fix this either silently 200'd (masking
	// the mismatch) or, with the H2 fix in place, would hard-fail every retry
	// for RC's ~24h retry window. Skip immediately with 200 so RC stops retrying.
	if (!UUID_RE.test(userId)) {
		logger.warn('revenuecat webhook: non-UUID app_user_id, skipping', {
			type: rcEvent.type,
			appUserId: userId
		});
		return json({ received: true, skipped: 'non-uuid app_user_id' });
	}

	const supabase = createSupabaseServiceClient();

	// R-RC2 fix: guard against out-of-order delivery. RC retries a failed event
	// for up to ~24h, so a transiently-failed RENEWAL can retry AFTER a newer
	// EXPIRATION has already landed and would otherwise resurrect Pro with
	// stale data (writes are individually idempotent but not commutative).
	//
	// We don't have a dedicated `last_event_at` column (no DB migration in this
	// pass — this session has no `supabase db push` credentials), so we
	// repurpose `updated_at`, which every write below sets and nothing else in
	// the app treats as a wall-clock audit field (see admin.ts / leaderboard.ts
	// — both only read `plan`/`status`, or order by `created_at`). Instead of
	// stamping `now()`, we stamp RC's own `event_timestamp_ms`, making it
	// directly comparable across events: skip (200) if this event is not newer
	// than the state already applied. A dedicated `last_event_at` column would
	// be cleaner and should replace this once a migration can be pushed.
	const eventTime = rcEvent.event_timestamp_ms
		? new Date(rcEvent.event_timestamp_ms).toISOString()
		: new Date().toISOString();

	const { data: existing } = await supabase
		.from('user_subscriptions')
		.select('updated_at')
		.eq('user_id', userId)
		.maybeSingle();

	// Compare as Date instants, not raw strings: Postgres (`+00:00` suffix) and
	// JS `toISOString()` (`.000Z` suffix) format timestamps differently, so a
	// lexicographic string compare isn't reliably ordered at the boundary.
	if (existing?.updated_at && new Date(eventTime).getTime() <= new Date(existing.updated_at).getTime()) {
		logger.info('revenuecat webhook: stale/out-of-order event, skipping', {
			type: rcEvent.type,
			userId,
			eventTime,
			appliedAt: existing.updated_at
		});
		return json({ received: true, skipped: 'stale event' });
	}

	const now = eventTime;

	// Each case sets `dbError` from its write. If any write fails we log with
	// context and return 5xx so RevenueCat retries (it retries non-2xx up to 24h).
	// R-H2 fix: RENEWAL/CANCELLATION/EXPIRATION/BILLING_ISSUE_DETECTED now
	// upsert (not `.update().eq()`) keyed on `user_id`. A plain `.update()`
	// matching zero rows (e.g. the INITIAL_PURCHASE that should have created
	// this row never landed) returns no error and 200s with no state change —
	// a paying customer silently never gets Pro. Upsert makes every branch
	// self-healing: it creates the row if missing instead of silently no-op'ing.
	let dbError: { message: string; code?: string } | null = null;

	switch (rcEvent.type) {
		case 'INITIAL_PURCHASE': {
			const periodEnd = rcEvent.expiration_at_ms
				? new Date(rcEvent.expiration_at_ms).toISOString()
				: null;

			const { error } = await supabase.from('user_subscriptions').upsert(
				{
					user_id: userId,
					plan: 'pro',
					status: 'active',
					platform: getPlatform(rcEvent.store),
					app_store_transaction_id: rcEvent.original_transaction_id ?? null,
					revenuecat_id: userId,
					current_period_end: periodEnd,
					updated_at: now
				},
				{ onConflict: 'user_id' }
			);
			dbError = error;

			// Send Pro upgrade email — non-blocking, failure doesn't affect webhook response
			if (!error) {
				sendProUpgradeEmail(supabase, userId).catch((err) =>
					logger.error('Pro upgrade email failed', { error: err, userId })
				);
			}
			break;
		}
		case 'RENEWAL': {
			const periodEnd = rcEvent.expiration_at_ms
				? new Date(rcEvent.expiration_at_ms).toISOString()
				: null;

			// Upsert (not update): also heals the H2 "lost INITIAL_PURCHASE" case —
			// a RENEWAL carries everything needed to grant Pro, so if no row
			// exists yet this creates it instead of silently no-op'ing.
			const { error } = await supabase.from('user_subscriptions').upsert(
				{
					user_id: userId,
					plan: 'pro',
					status: 'active',
					platform: getPlatform(rcEvent.store),
					current_period_end: periodEnd,
					updated_at: now
				},
				{ onConflict: 'user_id' }
			);
			dbError = error;
			break;
		}
		case 'CANCELLATION': {
			const { error } = await supabase.from('user_subscriptions').upsert(
				{
					user_id: userId,
					status: 'canceled',
					updated_at: now
				},
				{ onConflict: 'user_id' }
			);
			dbError = error;
			break;
		}
		case 'EXPIRATION': {
			const { error } = await supabase.from('user_subscriptions').upsert(
				{
					user_id: userId,
					plan: 'free',
					status: 'canceled',
					updated_at: now
				},
				{ onConflict: 'user_id' }
			);
			dbError = error;
			break;
		}
		case 'BILLING_ISSUE_DETECTED': {
			const { error } = await supabase.from('user_subscriptions').upsert(
				{
					user_id: userId,
					status: 'past_due',
					updated_at: now
				},
				{ onConflict: 'user_id' }
			);
			dbError = error;
			break;
		}
		default: {
			// Unknown/unhandled event type — record it instead of silently 200-ing.
			logger.info('revenuecat webhook: unhandled event type', {
				type: rcEvent.type,
				userId
			});
		}
	}

	if (dbError) {
		// A paying customer must not silently miss Pro. Log + 5xx forces a retry.
		logger.error('revenuecat webhook: subscription write failed', {
			error: dbError,
			eventType: rcEvent.type,
			userId
		});
		return json({ error: 'Subscription update failed' }, { status: 500 });
	}

	return json({ received: true });
};

async function sendProUpgradeEmail(
	supabase: ReturnType<typeof createSupabaseServiceClient>,
	userId: string
): Promise<void> {
	const {
		data: { user }
	} = await supabase.auth.admin.getUserById(userId);
	if (!user?.email) return;

	const { data: profile } = await supabase
		.from('profiles')
		.select('display_name')
		.eq('id', userId)
		.single();

	await sendRaw({
		to: user.email,
		from: 'SaltGoat <hello@saltgoat.co>',
		subject: "You're on SaltGoat Pro",
		html: proUpgradeHtml(profile?.display_name ?? undefined)
	});
}

function proUpgradeHtml(name?: string): string {
	const thanks = name ? `Thanks, ${name}.` : 'Thanks for upgrading.';
	return `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:48px 32px;color:#0f172a;background:#ffffff;">
  <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin:0 0 32px;">SaltGoat</p>
  <h1 style="font-size:26px;font-weight:700;margin:0 0 20px;line-height:1.25;">You&rsquo;re on Pro.</h1>
  <p style="font-size:16px;line-height:1.65;color:#334155;margin:0 0 16px;">${thanks} You now have access to:</p>
  <ul style="font-size:15px;line-height:1.9;color:#334155;margin:0 0 24px;padding-left:20px;">
    <li>7-day elevation-band weather forecasts for every 14er</li>
    <li>Unlimited summit logging</li>
    <li>All Pro features as they ship</li>
  </ul>
  <a href="https://saltgoat.co/peaks" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:8px;font-size:15px;font-weight:600;">Explore peaks &rarr;</a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:48px 0 24px;">
  <p style="font-size:12px;color:#94a3b8;margin:0;"><a href="https://saltgoat.co" style="color:#94a3b8;text-decoration:none;">saltgoat.co</a></p>
</div>`;
}

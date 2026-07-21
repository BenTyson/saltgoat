import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { subscribe, sendRaw } from '$lib/server/sparrow';
import { safeBearerEqual } from '$lib/server/security';
import { rateLimit, clientKey, tooManyRequests } from '$lib/server/rateLimit';
import { logger } from '$lib/server/logger';

interface WebhookPayload {
	type: 'INSERT' | 'UPDATE' | 'DELETE';
	table: string;
	schema: string;
	record: Record<string, unknown> | null;
	old_record: Record<string, unknown> | null;
}

export const POST: RequestHandler = async (event) => {
	const { request } = event;

	const secret = env.SUPABASE_WEBHOOK_SECRET;
	if (!secret) {
		return json({ error: 'Webhook not configured' }, { status: 500 });
	}

	// R-H1 fix: rate-limit only FAILED auth attempts, checked AFTER the secret
	// compare (was before). The client IP is attacker-spoofable (see
	// rateLimit.ts), so limiting pre-auth let an attacker exhaust Supabase's
	// real egress IP bucket with junk requests and 429 legitimate signup
	// webhooks (silently killing welcome emails). Gating on auth failure caps
	// secret brute-forcing while leaving authenticated traffic unthrottled.
	const authHeader = request.headers.get('Authorization');
	if (!safeBearerEqual(authHeader, secret)) {
		const limit = rateLimit('webhook', clientKey(event));
		if (!limit.allowed) return tooManyRequests(limit);
		return json({ error: 'Invalid authorization' }, { status: 401 });
	}

	let payload: WebhookPayload;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	if (payload.type !== 'INSERT' || !payload.record?.id) {
		return json({ received: true });
	}

	const userId = payload.record.id as string;
	const displayName = (payload.record.display_name as string) || undefined;

	try {
		const supabase = createSupabaseServiceClient();
		const {
			data: { user }
		} = await supabase.auth.admin.getUserById(userId);
		if (!user?.email) return json({ received: true });

		await Promise.allSettled([
			subscribe(user.email, displayName),
			sendRaw({
				to: user.email,
				from: 'SaltGoat <hello@saltgoat.co>',
				subject: 'Welcome to SaltGoat',
				html: welcomeHtml(displayName)
			})
		]);
	} catch (err) {
		logger.error('user-signup webhook error', { error: err, userId });
	}

	return json({ received: true });
};

function welcomeHtml(name?: string): string {
	const greeting = name ? `Hey ${name}` : 'Welcome';
	return `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:48px 32px;color:#0f172a;background:#ffffff;">
  <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin:0 0 32px;">SaltGoat</p>
  <h1 style="font-size:26px;font-weight:700;margin:0 0 20px;line-height:1.25;">${greeting} &mdash; you&rsquo;re in.</h1>
  <p style="font-size:16px;line-height:1.65;color:#334155;margin:0 0 16px;">SaltGoat is where Colorado 14er climbers log summits, share trip reports, and track progress across all 58 peaks.</p>
  <p style="font-size:16px;line-height:1.65;color:#334155;margin:0 0 32px;">Start by exploring a peak or logging your first summit.</p>
  <a href="https://saltgoat.co/peaks" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:8px;font-size:15px;font-weight:600;">Browse peaks &rarr;</a>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:48px 0 24px;">
  <p style="font-size:12px;color:#94a3b8;margin:0;">You received this because you created a SaltGoat account. &nbsp;&middot;&nbsp; <a href="https://saltgoat.co" style="color:#94a3b8;text-decoration:none;">saltgoat.co</a></p>
</div>`;
}

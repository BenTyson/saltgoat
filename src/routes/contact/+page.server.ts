import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { sendRaw } from '$lib/server/sparrow';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { rateLimit, clientKey } from '$lib/server/rateLimit';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async ({ url }) => {
	return { sent: url.searchParams.get('sent') === 'true' };
};

export const actions: Actions = {
	default: async (event) => {
		const { request } = event;

		// Throttle per IP to prevent contact-form email-bombing.
		const limit = rateLimit('contact', clientKey(event));
		if (!limit.allowed) {
			return fail(429, {
				error: `Too many messages. Please wait ${limit.retryAfter}s and try again.`
			});
		}

		const data = await request.formData();

		// Honeypot — bots fill this, humans don't
		if (data.get('website')) {
			return fail(400, { error: 'Invalid submission' });
		}

		const name = (data.get('name') as string)?.trim() || '';
		const email = (data.get('email') as string)?.trim().toLowerCase();
		const subject = (data.get('subject') as string)?.trim();
		const message = (data.get('message') as string)?.trim();

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'A valid email address is required.' });
		}
		if (!subject || subject.length < 3) {
			return fail(400, { error: 'Subject is required.' });
		}
		if (!message || message.length < 10) {
			return fail(400, { error: 'Message must be at least 10 characters.' });
		}

		try {
			const supabase = createSupabaseServiceClient();
			await Promise.all([
				sendRaw({
					to: 'hello@saltgoat.co',
					from: 'SaltGoat Contact <hello@saltgoat.co>',
					subject: `[Contact] ${subject}`,
					html: contactHtml({ name, email, subject, message }),
					reply_to: email
				}),
				supabase.from('contact_submissions').insert({ name: name || null, email, subject, message })
			]);
		} catch (err) {
			logger.error('contact form submission failed', { error: err, email });
			return fail(500, { error: 'Failed to send your message. Please try again.' });
		}

		redirect(303, '/contact?sent=true');
	}
};

function contactHtml(params: {
	name: string;
	email: string;
	subject: string;
	message: string;
}): string {
	const { name, email, subject, message } = params;
	const safeMessage = message
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\n/g, '<br>');
	const from = name ? `${name} &lt;${email}&gt;` : email;

	return `<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#0f172a;background:#ffffff;">
  <h2 style="font-size:18px;font-weight:700;margin:0 0 24px;">New contact message</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
    <tr>
      <td style="padding:8px 12px 8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;white-space:nowrap;vertical-align:top;">From</td>
      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;">${from}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px 8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;white-space:nowrap;vertical-align:top;">Subject</td>
      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;">${subject}</td>
    </tr>
  </table>
  <div style="font-size:15px;line-height:1.65;color:#334155;">${safeMessage}</div>
</div>`;
}

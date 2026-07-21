import type { PageServerLoad } from './$types';
import type { ForecastResponse, DayForecast } from '$lib/types/database';
import { getPeakBySlug } from '$lib/server/peaks';
import { getForecastForPeak } from '$lib/server/conditions';
import { getSubscription, isPro } from '$lib/server/subscriptions';
import { isAdmin } from '$lib/server/admin';
import { error } from '@sveltejs/kit';

/** Aggregate AM/PM/Night into a single daily row for free users */
function aggregateToDaily(day: DayForecast): DayForecast {
	const periods = [day.morning, day.afternoon, day.night];
	const avg = (vals: number[]) => Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
	const daily = {
		temperature_f: avg(periods.map((p) => p.temperature_f)),
		feels_like_f: Math.min(...periods.map((p) => p.feels_like_f)),
		humidity_percent: avg(periods.map((p) => p.humidity_percent)),
		wind_speed_mph: Math.max(...periods.map((p) => p.wind_speed_mph)),
		wind_gust_mph: Math.max(...periods.map((p) => p.wind_gust_mph)),
		wind_direction: periods[1].wind_direction, // afternoon as representative
		precipitation_in: +(periods.reduce((s, p) => s + p.precipitation_in, 0)).toFixed(2),
		snow_in: +(periods.reduce((s, p) => s + p.snow_in, 0)).toFixed(2),
		cloud_cover_percent: avg(periods.map((p) => p.cloud_cover_percent)),
		weather_code: Math.max(...periods.map((p) => p.weather_code)),
		freezing_level_ft: 0,
		cloud_base_ft: null as number | null,
		uv_index: 0,
		visibility_miles: 0,
	};
	return { ...day, morning: daily, afternoon: daily, night: daily };
}

/** Strip forecast down to free-tier: summit band only, daily aggregated, no insights/summaries */
function toFreeForecast(forecast: ForecastResponse): ForecastResponse {
	const summitBand = forecast.bands.summit;
	const freeDays = summitBand.days.map(aggregateToDaily);
	const freeSummit = { ...summitBand, days: freeDays, summary: '' };
	return {
		...forecast,
		bands: { summit: freeSummit, mid: freeSummit, base: freeSummit },
		insights: [],
	};
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;

	const peak = await getPeakBySlug(supabase, params.slug);

	if (!peak) {
		throw error(404, { message: 'Peak not found' });
	}

	const { user } = await locals.safeGetSession();

	let userIsPro = false;
	if (user) {
		if (isAdmin(user.id)) {
			userIsPro = true;
		} else {
			const subscription = await getSubscription(supabase, user.id);
			userIsPro = isPro(subscription);
		}
	}

	const forecast = await getForecastForPeak(supabase, peak.id, {
		name: peak.name,
		slug: peak.slug,
		elevation: peak.elevation
	});

	return {
		peak,
		forecast: forecast && !userIsPro ? toFreeForecast(forecast) : forecast,
		isPro: userIsPro,
	};
};

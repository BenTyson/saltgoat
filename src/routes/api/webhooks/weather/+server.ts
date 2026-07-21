// Weather data pipeline — triggered by external cron (Railway / cron-job.org)
// Schedule: 4x daily at 00:00, 06:00, 12:00, 18:00 Mountain Time (06:00, 12:00, 18:00, 00:00 UTC)
// Fetches 3 elevation bands x 58 peaks = 174 Open-Meteo calls per run (~696/day)
// Rate limiting: 2 peaks concurrent, bands fetched sequentially, 1.5s between batches (~60s total)

import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { safeSecretEqual } from '$lib/server/security';
import { rateLimit, clientKey, tooManyRequests } from '$lib/server/rateLimit';
import { logger } from '$lib/server/logger';
import {
  fetchWeatherForPeak,
  upsertConditions,
  fetchDetailedWeather,
  aggregateHourlyToPeriods,
  upsertForecasts,
  periodsToLegacyForecast,
  cleanStaleForecasts,
  computeElevationBands
} from '$lib/server/conditions';
const CONCURRENCY = 2;

interface PeakWithTrailhead {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  trailhead_elevation: number | null;
}

async function processPeak(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  peak: PeakWithTrailhead
): Promise<{ v2Success: boolean; v1Success: boolean; error?: string }> {
  const bands = computeElevationBands(peak.elevation, peak.trailhead_elevation);
  let v2Success = false;
  let v1Success = false;

  // Fetch all 3 elevation bands sequentially to avoid rate limiting
  try {
    const bandResults: { band: typeof bands[0]; periods: ReturnType<typeof aggregateHourlyToPeriods> }[] = [];
    for (const band of bands) {
      const raw = await fetchDetailedWeather(peak.latitude, peak.longitude, band.elevation_ft);
      const periods = aggregateHourlyToPeriods(raw, band.elevation_ft);
      bandResults.push({ band, periods });
    }

    // Upsert all bands into peak_forecasts
    await Promise.all(
      bandResults.map(({ band, periods }) =>
        upsertForecasts(supabase, peak.id, band, periods)
      )
    );
    v2Success = true;

    // Write summit band back to legacy peak_conditions for backward compat
    const summitResult = bandResults.find((r) => r.band.band === 'summit');
    if (summitResult) {
      const legacyForecast = periodsToLegacyForecast(summitResult.periods);
      await upsertConditions(supabase, peak.id, legacyForecast);
      v1Success = true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // If v2 failed, try legacy v1 fetch as fallback so peak_conditions stays fresh
    if (!v1Success) {
      try {
        const forecast = await fetchWeatherForPeak(peak.latitude, peak.longitude);
        await upsertConditions(supabase, peak.id, forecast);
        v1Success = true;
      } catch {
        // Both failed
      }
    }

    return { v2Success, v1Success, error: message };
  }

  return { v2Success, v1Success };
}

export const POST: RequestHandler = async (event) => {
  const { request } = event;

  // Rate limit secret-check attempts per IP to blunt brute-force.
  const limit = rateLimit('webhook', clientKey(event));
  if (!limit.allowed) return tooManyRequests(limit);

  const webhookSecret = env.WEBHOOK_SECRET;
  const secret =
    request.headers.get('x-webhook-secret') ||
    request.headers.get('X-Webhook-Secret') ||
    request.headers.get('X-WEBHOOK-SECRET');

  if (!webhookSecret || !safeSecretEqual(secret, webhookSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const startTime = Date.now();

  try {
    const supabase = createSupabaseServiceClient();

    // Get all peaks with their lowest-elevation route's trailhead
    const { data: peaks, error: peaksError } = await supabase
      .from('peaks')
      .select('id, name, latitude, longitude, elevation');

    if (peaksError) {
      throw new Error(`Failed to fetch peaks: ${peaksError.message}`);
    }
    if (!peaks || peaks.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No peaks found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get trailhead elevations: pick the first route per peak (ordered by id)
    const { data: routes } = await supabase
      .from('routes')
      .select('peak_id, trailhead_elevation')
      .not('trailhead_elevation', 'is', null)
      .order('id', { ascending: true });

    // Build a map of peak_id → trailhead_elevation (first route wins)
    const trailheadMap = new Map<string, number>();
    if (routes) {
      for (const route of routes) {
        if (!trailheadMap.has(route.peak_id) && route.trailhead_elevation != null) {
          trailheadMap.set(route.peak_id, route.trailhead_elevation);
        }
      }
    }

    const peaksWithTrailhead: PeakWithTrailhead[] = peaks.map((p) => ({
      ...p,
      trailhead_elevation: trailheadMap.get(p.id) ?? null
    }));

    console.log(`Fetching weather for ${peaksWithTrailhead.length} peaks (3 elevation bands each)...`);

    let v2Success = 0;
    let v1Success = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process peaks in batches of CONCURRENCY
    for (let i = 0; i < peaksWithTrailhead.length; i += CONCURRENCY) {
      const batch = peaksWithTrailhead.slice(i, i + CONCURRENCY);

      const results = await Promise.all(
        batch.map((peak) => processPeak(supabase, peak))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.v2Success) v2Success++;
        if (result.v1Success) v1Success++;
        if (result.error) {
          errorCount++;
          errors.push(`${batch[j].name}: ${result.error}`);
        }
      }

      // Pause between batches to stay under Open-Meteo rate limits
      if (i + CONCURRENCY < peaksWithTrailhead.length) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    // Clean up old forecast data
    await cleanStaleForecasts(supabase);

    const duration = Date.now() - startTime;
    // One structured line per cron run so weather-pipeline health is grep-able.
    logger.info('weather webhook run complete', {
      v2Success,
      v1Success,
      errorCount,
      peakCount: peaksWithTrailhead.length,
      durationMs: duration
    });

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        v2: v2Success,
        v1_legacy: v1Success,
        errors: errorCount,
        errorDetails: errors.slice(0, 5),
        duration: `${duration}ms`
      }),
      {
        status: errorCount === peaks.length ? 500 : 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    logger.error('weather webhook error', { error });
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// Support GET for manual testing
export const GET: RequestHandler = async (event) => {
  const { url } = event;

  const limit = rateLimit('webhook', clientKey(event));
  if (!limit.allowed) return tooManyRequests(limit);

  const secret = url.searchParams.get('secret');
  const webhookSecret = env.WEBHOOK_SECRET;

  if (!webhookSecret || !safeSecretEqual(secret, webhookSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // safeSecretEqual guarantees `secret` is a non-null string past the guard above.
  const request = new Request(url, {
    method: 'POST',
    headers: { 'x-webhook-secret': secret as string }
  });

  return POST({ request, url } as Parameters<RequestHandler>[0]);
};

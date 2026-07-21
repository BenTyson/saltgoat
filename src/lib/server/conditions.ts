import { logger } from '$lib/server/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables, TablesInsert, ForecastResponse, ElevationBandForecast, DayForecast, PeriodForecast, PeakForecastRow } from '$lib/types/database';
import { generateForecastSummary, generateHikerInsights } from '$lib/utils/weather';

export type PeakConditions = Tables<'peak_conditions'>;
export type PeakConditionsInsert = TablesInsert<'peak_conditions'>;
export type PeakForecastInsert = TablesInsert<'peak_forecasts'>;

// Re-export weather utilities for convenience
export { weatherCodeToDescription, weatherCodeToIcon, degreesToCardinal } from '$lib/utils/weather';

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    uv_index_max: number[];
    precipitation_sum: number[];
    snowfall_sum: number[];
    weather_code: number[];
  };
}

export interface ForecastDay {
  date: string;
  high_f: number;
  low_f: number;
  precipitation_in: number;
  snow_in: number;
  uv_index: number;
  weather_code: number;
  // Current conditions only for today
  temperature_f?: number;
  feels_like_f?: number;
  humidity_percent?: number;
  wind_speed_mph?: number;
  wind_gust_mph?: number;
  wind_direction?: number;
  cloud_cover_percent?: number;
}

// ─── LEGACY: peak_conditions (v1 weather system) ─────────────────────
//
// The functions below (fetchWeatherForPeak, upsertConditions, getConditionsForPeak)
// serve the legacy peak_conditions table used by:
//   - GET /api/v1/peaks/[slug]/conditions (mobile v1.x clients)
//   - GET /api/v1/peaks/[slug] → conditions field
//
// Deprecation timeline:
//   1. [Current] Dual-write: webhook writes to both peak_forecasts (v2) and
//      peak_conditions (v1) on every run. Both tables stay fresh.
//   2. [Monitor] Track request volume to /api/v1/peaks/[slug]/conditions via
//      Railway logs. When <10% of mobile clients are on v1.x (pre-forecast),
//      proceed to step 3.
//   3. [Stop writes] Remove upsertConditions() calls from the webhook. The
//      peak_conditions table will go stale but won't break reads.
//   4. [Remove reads] Once 0% traffic to legacy endpoints, remove
//      getConditionsForPeak() and the /conditions endpoint.
//   5. [Drop table] Migration to DROP TABLE peak_conditions and clean up types.
//
// Do NOT remove any code here until step 4. Old mobile clients in the wild
// will crash if the endpoint disappears before they update.
// ──────────────────────────────────────────────────────────────────────

export async function fetchWeatherForPeak(
  latitude: number,
  longitude: number
): Promise<ForecastDay[]> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    daily: 'temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,snowfall_sum,weather_code',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'America/Denver',
    forecast_days: '7'
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();
  const forecast: ForecastDay[] = [];

  for (let i = 0; i < data.daily.time.length; i++) {
    const day: ForecastDay = {
      date: data.daily.time[i],
      high_f: Math.round(data.daily.temperature_2m_max[i]),
      low_f: Math.round(data.daily.temperature_2m_min[i]),
      precipitation_in: data.daily.precipitation_sum[i],
      snow_in: data.daily.snowfall_sum[i],
      uv_index: Math.round(data.daily.uv_index_max[i]),
      weather_code: data.daily.weather_code[i]
    };

    // Add current conditions to today's forecast
    if (i === 0) {
      day.temperature_f = Math.round(data.current.temperature_2m);
      day.feels_like_f = Math.round(data.current.apparent_temperature);
      day.humidity_percent = Math.round(data.current.relative_humidity_2m);
      day.wind_speed_mph = Math.round(data.current.wind_speed_10m);
      day.wind_gust_mph = Math.round(data.current.wind_gusts_10m);
      day.wind_direction = Math.round(data.current.wind_direction_10m);
      day.cloud_cover_percent = Math.round(data.current.cloud_cover);
    }

    forecast.push(day);
  }

  return forecast;
}

export async function upsertConditions(
  supabase: SupabaseClient<Database>,
  peakId: string,
  forecast: ForecastDay[]
): Promise<void> {
  const records: PeakConditionsInsert[] = forecast.map((day) => ({
    peak_id: peakId,
    forecast_date: day.date,
    high_f: day.high_f,
    low_f: day.low_f,
    temperature_f: day.temperature_f ?? null,
    feels_like_f: day.feels_like_f ?? null,
    humidity_percent: day.humidity_percent ?? null,
    wind_speed_mph: day.wind_speed_mph ?? null,
    wind_gust_mph: day.wind_gust_mph ?? null,
    wind_direction: day.wind_direction ?? null,
    precipitation_in: day.precipitation_in,
    snow_in: day.snow_in,
    cloud_cover_percent: day.cloud_cover_percent ?? null,
    uv_index: day.uv_index,
    weather_code: day.weather_code,
    fetched_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('peak_conditions')
    .upsert(records, { onConflict: 'peak_id,forecast_date' });

  if (error) {
    logger.error('Error upserting conditions', { error: error });
    throw error;
  }
}

export async function getConditionsForPeak(
  supabase: SupabaseClient<Database>,
  peakId: string
): Promise<PeakConditions[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('peak_conditions')
    .select('*')
    .eq('peak_id', peakId)
    .gte('forecast_date', today)
    .order('forecast_date', { ascending: true })
    .limit(7);

  if (error) {
    logger.error('Error fetching conditions', { error: error });
    return [];
  }

  return data ?? [];
}

// ─── V2: Elevation-banded, sub-daily forecasts ─────────────────────────

export interface ElevationBand {
  band: 'summit' | 'mid' | 'base';
  elevation_ft: number;
}

export type TimePeriod = 'morning' | 'afternoon' | 'night';

interface OpenMeteoHourlyResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    dewpoint_2m: number[];
    precipitation: number[];
    snowfall: number[];
    rain: number[];
    weather_code: number[];
    cloud_cover: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    visibility: number[];
    uv_index: number[];
    freezinglevel_height: number[];
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export interface PeriodData {
  date: string;
  time_period: TimePeriod;
  temperature_f: number;
  feels_like_f: number;
  humidity_percent: number;
  dewpoint_f: number;
  wind_speed_mph: number;
  wind_gust_mph: number;
  wind_direction: number;
  precipitation_in: number;
  snow_in: number;
  rain_in: number;
  cloud_cover_percent: number;
  weather_code: number;
  visibility_miles: number;
  freezing_level_ft: number;
  cloud_base_ft: number | null;
  uv_index: number;
  high_f: number;
  low_f: number;
  sunrise: string;
  sunset: string;
}

export function computeElevationBands(
  peakElevation: number,
  trailheadElevation: number | null
): ElevationBand[] {
  const summit = peakElevation;
  const base = trailheadElevation ?? summit - 4000;
  const mid = Math.round((summit + base) / 2 / 100) * 100;

  return [
    { band: 'summit', elevation_ft: summit },
    { band: 'mid', elevation_ft: mid },
    { band: 'base', elevation_ft: base }
  ];
}

export async function fetchDetailedWeather(
  latitude: number,
  longitude: number,
  elevation_ft: number
): Promise<OpenMeteoHourlyResponse> {
  const elevation_m = Math.round(elevation_ft * 0.3048);

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    elevation: elevation_m.toString(),
    hourly:
      'temperature_2m,apparent_temperature,relative_humidity_2m,' +
      'dewpoint_2m,precipitation,snowfall,rain,' +
      'weather_code,cloud_cover,' +
      'wind_speed_10m,wind_direction_10m,wind_gusts_10m,' +
      'visibility,uv_index,freezinglevel_height',
    daily: 'sunrise,sunset,temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'America/Denver',
    forecast_days: '7'
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  return response.json();
}

// Most severe WMO weather code wins
const WMO_SEVERITY: Record<number, number> = {
  0: 0, 1: 1, 2: 2, 3: 3, // clear → overcast
  45: 4, 48: 5, // fog
  51: 6, 53: 7, 55: 8, // drizzle
  61: 9, 63: 10, 65: 11, // rain
  66: 12, 67: 13, // freezing rain
  71: 14, 73: 15, 75: 16, 77: 17, // snow
  80: 18, 81: 19, 82: 20, // rain showers
  85: 21, 86: 22, // snow showers
  95: 23, 96: 24, 99: 25 // thunderstorms
};

function mostSevereWeatherCode(codes: number[]): number {
  let maxSeverity = -1;
  let maxCode = 0;
  for (const code of codes) {
    const severity = WMO_SEVERITY[code] ?? 0;
    if (severity > maxSeverity) {
      maxSeverity = severity;
      maxCode = code;
    }
  }
  return maxCode;
}

function modeOfDirections(directions: number[]): number {
  if (directions.length === 0) return 0;
  // Bucket into 16 cardinal directions (22.5° each), take the mode
  const buckets = new Map<number, number>();
  for (const d of directions) {
    const bucket = Math.round(d / 22.5) % 16;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  let maxCount = 0;
  let maxBucket = 0;
  for (const [bucket, count] of buckets) {
    if (count > maxCount) {
      maxCount = count;
      maxBucket = bucket;
    }
  }
  return maxBucket * 22.5;
}

// Meters to feet
function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

// Meters to miles
function metersToMiles(m: number): number {
  return Math.round((m / 1609.344) * 10) / 10;
}

// Cloud base from dewpoint depression: ((temp - dewpoint) / 4.4) * 1000 + station_elevation
function calculateCloudBase(
  tempF: number,
  dewpointF: number,
  elevationFt: number
): number | null {
  const spread = tempF - dewpointF;
  if (spread < 0) return null;
  // The 4.4°F per 1000ft is the standard lapse rate for cloud base estimation
  return Math.round((spread / 4.4) * 1000 + elevationFt);
}

// Period hour ranges in Mountain Time (Open-Meteo returns in this TZ)
// Morning: 06:00-11:59, Afternoon: 12:00-17:59, Night: 18:00-05:59
function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
}

export function aggregateHourlyToPeriods(
  data: OpenMeteoHourlyResponse,
  elevationFt: number
): PeriodData[] {
  const { hourly, daily } = data;
  const totalHours = hourly.time.length;

  // Build a map of daily values for sunrise/sunset/high/low
  const dailyMap = new Map<string, {
    sunrise: string;
    sunset: string;
    high_f: number;
    low_f: number;
  }>();
  for (let i = 0; i < daily.time.length; i++) {
    dailyMap.set(daily.time[i], {
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i],
      high_f: Math.round(daily.temperature_2m_max[i]),
      low_f: Math.round(daily.temperature_2m_min[i])
    });
  }

  // Group hourly indices by date + period
  const groups = new Map<string, number[]>();
  for (let i = 0; i < totalHours; i++) {
    // Open-Meteo format: "2026-04-02T06:00"
    const timeStr = hourly.time[i];
    const date = timeStr.slice(0, 10);
    const hour = parseInt(timeStr.slice(11, 13), 10);
    const period = getTimePeriod(hour);
    const key = `${date}|${period}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  }

  const periods: PeriodData[] = [];

  for (const [key, indices] of groups) {
    const [date, period] = key.split('|') as [string, TimePeriod];
    const dayData = dailyMap.get(date);
    if (!dayData || indices.length === 0) continue;

    // Gather raw values for this period
    const temps = indices.map((i) => hourly.temperature_2m[i]);
    const feelsLike = indices.map((i) => hourly.apparent_temperature[i]);
    const humidity = indices.map((i) => hourly.relative_humidity_2m[i]);
    const dewpoints = indices.map((i) => hourly.dewpoint_2m[i]);
    const windSpeeds = indices.map((i) => hourly.wind_speed_10m[i]);
    const windGusts = indices.map((i) => hourly.wind_gusts_10m[i]);
    const windDirs = indices.map((i) => hourly.wind_direction_10m[i]);
    const precip = indices.map((i) => hourly.precipitation[i]);
    const snow = indices.map((i) => hourly.snowfall[i]);
    const rain = indices.map((i) => hourly.rain[i]);
    const clouds = indices.map((i) => hourly.cloud_cover[i]);
    const codes = indices.map((i) => hourly.weather_code[i]);
    const vis = indices.map((i) => hourly.visibility[i]);
    const uv = indices.map((i) => hourly.uv_index[i]);
    const freezing = indices.map((i) => hourly.freezinglevel_height[i]);

    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const avgDewpoint = dewpoints.reduce((a, b) => a + b, 0) / dewpoints.length;

    periods.push({
      date,
      time_period: period,
      temperature_f: Math.round(avgTemp),
      feels_like_f: Math.round(Math.min(...feelsLike)),
      humidity_percent: Math.round(humidity.reduce((a, b) => a + b, 0) / humidity.length),
      dewpoint_f: Math.round(avgDewpoint),
      wind_speed_mph: Math.round(Math.max(...windSpeeds)),
      wind_gust_mph: Math.round(Math.max(...windGusts)),
      wind_direction: Math.round(modeOfDirections(windDirs)),
      precipitation_in: Math.round(precip.reduce((a, b) => a + b, 0) * 100) / 100,
      snow_in: Math.round(snow.reduce((a, b) => a + b, 0) * 100) / 100,
      rain_in: Math.round(rain.reduce((a, b) => a + b, 0) * 100) / 100,
      cloud_cover_percent: Math.round(clouds.reduce((a, b) => a + b, 0) / clouds.length),
      weather_code: mostSevereWeatherCode(codes),
      visibility_miles: metersToMiles(Math.min(...vis)),
      freezing_level_ft: metersToFeet(Math.min(...freezing)),
      cloud_base_ft: calculateCloudBase(avgTemp, avgDewpoint, elevationFt),
      uv_index: Math.round(Math.max(...uv)),
      high_f: dayData.high_f,
      low_f: dayData.low_f,
      sunrise: dayData.sunrise,
      sunset: dayData.sunset
    });
  }

  // Sort by date then period order
  const periodOrder: Record<TimePeriod, number> = { morning: 0, afternoon: 1, night: 2 };
  periods.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return periodOrder[a.time_period] - periodOrder[b.time_period];
  });

  return periods;
}

export async function upsertForecasts(
  supabase: SupabaseClient<Database>,
  peakId: string,
  band: ElevationBand,
  periods: PeriodData[]
): Promise<void> {
  const records: PeakForecastInsert[] = periods.map((p) => ({
    peak_id: peakId,
    elevation_band: band.band,
    elevation_ft: band.elevation_ft,
    forecast_date: p.date,
    time_period: p.time_period,
    temperature_f: p.temperature_f,
    feels_like_f: p.feels_like_f,
    humidity_percent: p.humidity_percent,
    dewpoint_f: p.dewpoint_f,
    wind_speed_mph: p.wind_speed_mph,
    wind_gust_mph: p.wind_gust_mph,
    wind_direction: p.wind_direction,
    precipitation_in: p.precipitation_in,
    snow_in: p.snow_in,
    rain_in: p.rain_in,
    cloud_cover_percent: p.cloud_cover_percent,
    weather_code: p.weather_code,
    visibility_miles: p.visibility_miles,
    freezing_level_ft: p.freezing_level_ft,
    cloud_base_ft: p.cloud_base_ft,
    uv_index: p.uv_index,
    high_f: p.high_f,
    low_f: p.low_f,
    sunrise: p.sunrise,
    sunset: p.sunset,
    fetched_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('peak_forecasts')
    .upsert(records, { onConflict: 'peak_id,elevation_band,forecast_date,time_period' });

  if (error) {
    logger.error('Error upserting forecasts', { error: error });
    throw error;
  }
}

/**
 * Convert summit-band period data back to legacy ForecastDay format
 * for backward-compatible writes to peak_conditions.
 */
export function periodsToLegacyForecast(periods: PeriodData[]): ForecastDay[] {
  // Group by date
  const byDate = new Map<string, PeriodData[]>();
  for (const p of periods) {
    if (!byDate.has(p.date)) byDate.set(p.date, []);
    byDate.get(p.date)!.push(p);
  }

  const forecast: ForecastDay[] = [];
  const dates = [...byDate.keys()].sort();

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const dayPeriods = byDate.get(date)!;
    const morning = dayPeriods.find((p) => p.time_period === 'morning');
    const afternoon = dayPeriods.find((p) => p.time_period === 'afternoon');

    // Aggregate precipitation/snow across all periods for the day
    const totalPrecip = dayPeriods.reduce((sum, p) => sum + p.precipitation_in, 0);
    const totalSnow = dayPeriods.reduce((sum, p) => sum + p.snow_in, 0);

    const day: ForecastDay = {
      date,
      high_f: dayPeriods[0].high_f,
      low_f: dayPeriods[0].low_f,
      precipitation_in: Math.round(totalPrecip * 100) / 100,
      snow_in: Math.round(totalSnow * 100) / 100,
      uv_index: Math.max(...dayPeriods.map((p) => p.uv_index)),
      weather_code: mostSevereWeatherCode(dayPeriods.map((p) => p.weather_code))
    };

    // For today (first date), add "current" conditions from morning or afternoon
    if (i === 0) {
      const current = afternoon ?? morning ?? dayPeriods[0];
      day.temperature_f = current.temperature_f;
      day.feels_like_f = current.feels_like_f;
      day.humidity_percent = current.humidity_percent;
      day.wind_speed_mph = current.wind_speed_mph;
      day.wind_gust_mph = current.wind_gust_mph;
      day.wind_direction = current.wind_direction;
      day.cloud_cover_percent = current.cloud_cover_percent;
    }

    forecast.push(day);
  }

  return forecast;
}

export async function cleanStaleForecasts(
  supabase: SupabaseClient<Database>
): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoff = yesterday.toISOString().split('T')[0];

  const { error } = await supabase
    .from('peak_forecasts')
    .delete()
    .lt('forecast_date', cutoff);

  if (error) {
    logger.error('Error cleaning stale forecasts', { error: error });
  }
}

// ─── V2: Query function for API layer ───────────────────────────────

function rowToPeriod(row: PeakForecastRow): PeriodForecast {
  return {
    temperature_f: row.temperature_f ?? 0,
    feels_like_f: row.feels_like_f ?? 0,
    humidity_percent: row.humidity_percent ?? 0,
    wind_speed_mph: row.wind_speed_mph ?? 0,
    wind_gust_mph: row.wind_gust_mph ?? 0,
    wind_direction: row.wind_direction ?? 0,
    precipitation_in: Number(row.precipitation_in ?? 0),
    snow_in: Number(row.snow_in ?? 0),
    cloud_cover_percent: row.cloud_cover_percent ?? 0,
    weather_code: row.weather_code ?? 0,
    freezing_level_ft: row.freezing_level_ft ?? 0,
    cloud_base_ft: row.cloud_base_ft ?? null,
    uv_index: row.uv_index ?? 0,
    visibility_miles: Number(row.visibility_miles ?? 0)
  };
}

const BAND_LABELS: Record<string, (ft: number) => string> = {
  summit: (ft) => `Summit (${ft.toLocaleString()}')`,
  mid: (ft) => `Mid Mountain (${ft.toLocaleString()}')`,
  base: (ft) => `Trailhead (${ft.toLocaleString()}')`
};

function groupRowsIntoBand(
  rows: PeakForecastRow[],
  bandName: string
): ElevationBandForecast {
  const bandRows = rows.filter((r) => r.elevation_band === bandName);
  const elevationFt = bandRows[0]?.elevation_ft ?? 0;

  // Group by date
  const byDate = new Map<string, PeakForecastRow[]>();
  for (const row of bandRows) {
    if (!byDate.has(row.forecast_date)) byDate.set(row.forecast_date, []);
    byDate.get(row.forecast_date)!.push(row);
  }

  const days: DayForecast[] = [];
  const dates = [...byDate.keys()].sort();

  for (const date of dates) {
    const dayRows = byDate.get(date)!;
    const morning = dayRows.find((r) => r.time_period === 'morning');
    const afternoon = dayRows.find((r) => r.time_period === 'afternoon');
    const night = dayRows.find((r) => r.time_period === 'night');

    // Need all 3 periods for a complete day
    if (!morning || !afternoon || !night) continue;

    days.push({
      date,
      high_f: morning.high_f ?? 0,
      low_f: morning.low_f ?? 0,
      sunrise: morning.sunrise ?? '',
      sunset: morning.sunset ?? '',
      morning: rowToPeriod(morning),
      afternoon: rowToPeriod(afternoon),
      night: rowToPeriod(night)
    });
  }

  const labelFn = BAND_LABELS[bandName] ?? ((ft: number) => `${bandName} (${ft.toLocaleString()}')`);

  return {
    elevation_ft: elevationFt,
    label: labelFn(elevationFt),
    summary: generateForecastSummary(days),
    days
  };
}

export async function getForecastForPeak(
  supabase: SupabaseClient<Database>,
  peakId: string,
  peak: { name: string; slug: string; elevation: number }
): Promise<ForecastResponse | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data: rows, error } = await supabase
    .from('peak_forecasts')
    .select('*')
    .eq('peak_id', peakId)
    .gte('forecast_date', today)
    .order('forecast_date', { ascending: true })
    .order('time_period', { ascending: true });

  if (error) {
    logger.error('Error fetching forecasts', { error: error });
    return null;
  }

  if (!rows || rows.length === 0) return null;

  const bands = {
    summit: groupRowsIntoBand(rows, 'summit'),
    mid: groupRowsIntoBand(rows, 'mid'),
    base: groupRowsIntoBand(rows, 'base')
  };

  const insights = generateHikerInsights(bands);

  return {
    peak: { name: peak.name, slug: peak.slug, elevation: peak.elevation },
    bands,
    insights,
    fetched_at: rows[0].fetched_at ?? new Date().toISOString()
  };
}

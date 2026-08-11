<script lang="ts">
  import type { ForecastResponse, DayForecast } from '$lib/types/database';
  import { weatherCodeToDescription, degreesToCardinal } from '$lib/utils/weather';
  import WeatherIcon from './WeatherIcon.svelte';
  import HikerInsights from './HikerInsights.svelte';

  interface Props {
    forecast: ForecastResponse;
  }

  let { forecast }: Props = $props();

  const summit = $derived(forecast.bands.summit);
  const today = $derived(summit.days[0]);
  const upcoming = $derived(summit.days.slice(1, 4));

  // Use afternoon as "current" conditions, fall back to morning
  const current = $derived(today?.afternoon ?? today?.morning);

  // Top insight by severity
  const topInsight = $derived(forecast.insights[0] ?? null);

  function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  function formatShortDay(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Most representative weather code for the day (afternoon, then morning)
  function dayIcon(day: DayForecast): number {
    return day.afternoon.weather_code;
  }
</script>

{#if today && current}
  <section class="mt-10 animate-fade-in-up" style="animation-delay: 175ms">
    <div class="flex items-center gap-5 mb-4">
      <h2 class="heading-section text-slate-900 dark:text-white">Summit Weather</h2>
      <div class="rule-line"></div>
    </div>

    <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
      <!-- Current conditions -->
      <div class="p-6">
        <div class="flex flex-wrap items-start justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <WeatherIcon code={current.weather_code} class="h-10 w-10" />
            </div>
            <div>
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-slate-900 dark:text-white">{current.temperature_f}°</span>
                {#if current.feels_like_f !== current.temperature_f}
                  <span class="text-sm text-slate-500 dark:text-slate-400">Feels {current.feels_like_f}°</span>
                {/if}
              </div>
              <p class="text-slate-600 dark:text-slate-400">{weatherCodeToDescription(current.weather_code)}</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-6">
            <div class="text-center">
              <span class="block text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">High / Low</span>
              <span class="text-lg font-semibold text-slate-900 dark:text-white">{today.high_f}° / {today.low_f}°</span>
            </div>
            <div class="text-center">
              <span class="block text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Wind</span>
              <span class="text-lg font-semibold text-slate-900 dark:text-white">
                {current.wind_speed_mph} mph {degreesToCardinal(current.wind_direction)}
              </span>
            </div>
            {#if current.snow_in > 0}
              <div class="text-center">
                <span class="block text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Snow</span>
                <span class="text-lg font-semibold text-sky-500">{current.snow_in}"</span>
              </div>
            {:else if current.precipitation_in > 0}
              <div class="text-center">
                <span class="block text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Precip</span>
                <span class="text-lg font-semibold text-blue-500">{current.precipitation_in}"</span>
              </div>
            {/if}
          </div>
        </div>

        {#if forecast.fetched_at}
          <p class="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Updated {timeAgo(forecast.fetched_at)}
          </p>
        {/if}
      </div>

      <!-- 3-day mini forecast -->
      {#if upcoming.length > 0}
        <div class="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-4">
          <div class="grid grid-cols-3 gap-3">
            {#each upcoming as day}
              <div class="text-center p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <span class="block text-xs font-medium text-slate-500 dark:text-slate-400">{formatShortDay(day.date)}</span>
                <div class="my-1 flex justify-center">
                  <WeatherIcon code={dayIcon(day)} class="h-6 w-6" />
                </div>
                <span class="text-sm font-semibold text-slate-900 dark:text-white">{day.high_f}°</span>
                <span class="text-sm text-slate-400 dark:text-slate-500"> / {day.low_f}°</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Top insight -->
      {#if topInsight}
        <div class="border-t border-slate-200 dark:border-slate-700 px-4 py-3">
          <HikerInsights insights={[topInsight]} />
        </div>
      {/if}

      <!-- View Full Forecast link -->
      <div class="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/20">
        <a
          href="/peaks/{forecast.peak.slug}/weather"
          class="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
        >
          View Full Forecast
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  </section>
{/if}

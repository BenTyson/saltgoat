<script lang="ts">
  import type { PeakWithStandardRoute } from '$lib/types/database';
  import Badge from '../ui/Badge.svelte';

  interface Props {
    peak: PeakWithStandardRoute;
    featured?: boolean;
    class?: string;
  }

  let { peak, featured = false, class: className = '' }: Props = $props();

  // Use $derived for reactive values that depend on props
  const difficultyClass = $derived(peak.standard_route?.difficulty_class ?? 1);

  const classAccents: Record<number, string> = {
    1: 'border-l-class-1',
    2: 'border-l-class-2',
    3: 'border-l-class-3',
    4: 'border-l-class-4'
  };
</script>

<a
  href="/peaks/{peak.slug}"
  class="
    group relative block overflow-hidden rounded-lg
    border border-slate-200 border-l-2 bg-white
    transition-all duration-300
    hover:border-slate-300 hover:shadow-card-hover
    dark:border-slate-700/80 dark:bg-slate-800/60
    dark:hover:border-slate-600
    {classAccents[difficultyClass]}
    {featured ? 'ring-1 ring-accent/40' : ''}
    {className}
  "
>
  <div class="relative flex gap-5 p-4 sm:p-5">
    <!-- Image / Gradient Placeholder -->
    <div class="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md sm:h-32 sm:w-32">
      {#if peak.hero_image_url}
        <img
          src={peak.hero_image_url}
          alt="{peak.name} - Colorado 14er"
          class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          width="144"
          height="144"
        />
      {:else}
        <div class="h-full w-full peak-gradient relative">
          <div class="absolute inset-0 flex items-center justify-center">
            <svg
              class="h-10 w-10 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 2L2 22h20L12 2z"
              />
            </svg>
          </div>
        </div>
      {/if}
    </div>

    <!-- Content -->
    <div class="min-w-0 flex-1 flex flex-col justify-between py-0.5">
      <div>
        <div class="flex items-baseline gap-3">
          <span class="eyebrow !text-[10px]">No. {peak.rank}</span>
          <span class="text-xs text-slate-400 dark:text-slate-500 truncate">{peak.range}</span>
        </div>

        <div class="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3
            class="
              font-display font-normal text-xl sm:text-2xl tracking-tight
              text-slate-900 dark:text-white
              transition-colors duration-200
              group-hover:text-accent-dark dark:group-hover:text-accent
            "
          >
            {peak.name}
          </h3>
          <span class="stats-number text-base sm:text-lg text-slate-500 dark:text-slate-400">
            {peak.elevation.toLocaleString()}'
          </span>
        </div>
      </div>

      <!-- Bottom row: Badge + Stats -->
      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Badge variant="class-{difficultyClass}" size="sm">Class {difficultyClass}</Badge>
        {#if peak.standard_route?.distance_miles}
          <span class="stats-number text-sm text-slate-500 dark:text-slate-400">
            {peak.standard_route.distance_miles} mi
          </span>
        {/if}
        {#if peak.standard_route?.elevation_gain_ft}
          <span class="stats-number text-sm text-slate-500 dark:text-slate-400">
            {peak.standard_route.elevation_gain_ft.toLocaleString()}' gain
          </span>
        {/if}
      </div>
    </div>

    <!-- Arrow -->
    <div class="hidden sm:flex items-center pr-1">
      <svg
        class="h-5 w-5 text-slate-300 dark:text-slate-600 transition-all duration-300 group-hover:text-accent group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </div>
  </div>
</a>

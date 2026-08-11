<script lang="ts">
  import type { Route } from '$lib/types/database';

  interface Props {
    route:
      | Route
      | Pick<
          Route,
          'distance_miles' | 'elevation_gain_ft' | 'difficulty_class' | 'typical_time_hours'
        >;
    compact?: boolean;
    class?: string;
  }

  let { route, compact = false, class: className = '' }: Props = $props();

  const classText: Record<number, string> = {
    1: 'text-class-1',
    2: 'text-class-2',
    3: 'text-class-3',
    4: 'text-class-4'
  };
</script>

<div
  class="
    grid grid-cols-2 sm:grid-cols-4
    divide-y sm:divide-y-0 sm:divide-x
    divide-slate-200 dark:divide-slate-700/70
    border-y border-slate-200 dark:border-slate-700/70
    {className}
  "
>
  <!-- Distance -->
  <div class="flex flex-col items-center py-4 sm:py-5">
    <div class="stats-number font-display text-2xl text-slate-900 dark:text-white sm:text-3xl">
      {route.distance_miles}
    </div>
    <div class="eyebrow mt-1.5">miles RT</div>
  </div>

  <!-- Elevation Gain -->
  <div class="flex flex-col items-center py-4 sm:py-5">
    <div class="stats-number font-display text-2xl text-slate-900 dark:text-white sm:text-3xl">
      {route.elevation_gain_ft.toLocaleString()}'
    </div>
    <div class="eyebrow mt-1.5">gain</div>
  </div>

  <!-- Difficulty Class -->
  <div class="flex flex-col items-center py-4 sm:py-5">
    <div class="stats-number font-display text-2xl sm:text-3xl {classText[route.difficulty_class]}">
      Class {route.difficulty_class}
    </div>
    <div class="eyebrow mt-1.5">difficulty</div>
  </div>

  <!-- Time -->
  <div class="flex flex-col items-center py-4 sm:py-5">
    <div class="stats-number font-display text-2xl text-slate-900 dark:text-white sm:text-3xl">
      {route.typical_time_hours || '—'}
    </div>
    <div class="eyebrow mt-1.5">hours</div>
  </div>
</div>

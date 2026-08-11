<script lang="ts">
  interface Props {
    nearestTown?: string | null;
    nationalForest?: string | null;
    prominenceFt?: number | null;
    range: string;
    class?: string;
  }

  let { nearestTown, nationalForest, prominenceFt, range, class: className = '' }: Props = $props();

  // Only show if we have at least one piece of data to display
  const hasData = nearestTown || nationalForest || prominenceFt;
</script>

{#if hasData}
  <section
    class="
      animate-fade-in-up rounded-lg overflow-hidden
      border border-slate-200 dark:border-slate-700
      bg-white dark:bg-slate-800/60
      {className}
    "
  >
    <div class="p-5">
      <h3 class="eyebrow">Quick Facts</h3>

      <dl class="mt-4 grid grid-cols-2 gap-4">
        <!-- Range (always shown) -->
        <div class="col-span-2 sm:col-span-1">
          <dt class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mountain Range
          </dt>
          <dd class="mt-1 font-medium text-slate-900 dark:text-white">{range}</dd>
        </div>

        <!-- Nearest Town -->
        {#if nearestTown}
          <div class="col-span-2 sm:col-span-1">
            <dt class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Nearest Town
            </dt>
            <dd class="mt-1 font-medium text-slate-900 dark:text-white">{nearestTown}</dd>
          </div>
        {/if}

        <!-- National Forest -->
        {#if nationalForest}
          <div class="col-span-2 sm:col-span-1">
            <dt class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              National Forest
            </dt>
            <dd class="mt-1 font-medium text-slate-900 dark:text-white">{nationalForest}</dd>
          </div>
        {/if}

        <!-- Prominence -->
        {#if prominenceFt}
          <div class="col-span-2 sm:col-span-1">
            <dt class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Prominence
            </dt>
            <dd class="mt-1 font-medium text-slate-900 dark:text-white">
              <span class="stats-number">{prominenceFt.toLocaleString()}'</span>
            </dd>
          </div>
        {/if}
      </dl>
    </div>
  </section>
{/if}

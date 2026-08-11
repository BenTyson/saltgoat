<script lang="ts">
  interface Props {
    stats: {
      pace: { month: string; count: number }[];
      seasonal: { spring: number; summer: number; fall: number; winter: number };
      records: {
        earliestStartTime: string | null;
        mostPeaksInOneDay: number;
        topElevationDay: { date: string; totalElevation: number; peaks: string[] } | null;
      };
      routePreferences: { class: number; count: number }[];
      favoriteClass: number | null;
      topConditions: { condition: string; count: number }[];
    };
  }

  let { stats }: Props = $props();

  const maxPace = $derived(Math.max(...stats.pace.map(p => p.count), 1));
  const totalSummitsInPace = $derived(stats.pace.reduce((sum, p) => sum + p.count, 0));
  const maxConditionCount = $derived(stats.topConditions.length > 0 ? stats.topConditions[0].count : 1);

  const seasonColors: Record<string, string> = {
    spring: 'bg-semantic-success',
    summer: 'bg-semantic-warning',
    fall: 'bg-semantic-warning',
    winter: 'bg-sky-500'
  };

  const seasonLabels: Record<string, string> = {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter'
  };

  function formatTime(time: string): string {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${ampm}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

<div class="space-y-8">
  <!-- Summit Pace -->
  {#if totalSummitsInPace > 0}
    <section>
      <h3 class="text-sm font-semibold text-accent uppercase tracking-wider mb-4">Summit Pace (12 Months)</h3>
      <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-card">
        <div class="flex items-end gap-1 h-32">
          {#each stats.pace as month}
            {@const height = month.count > 0 ? Math.max((month.count / maxPace) * 100, 8) : 0}
            <div class="flex-1 flex flex-col items-center gap-1">
              {#if month.count > 0}
                <span class="text-xs font-medium text-slate-600 dark:text-slate-400">{month.count}</span>
              {/if}
              <div
                class="w-full rounded-t transition-all duration-300 {month.count > 0 ? 'bg-gradient-to-t from-accent to-accent-warm' : 'bg-slate-200 dark:bg-slate-700'}"
                style="height: {month.count > 0 ? height : 4}%"
              ></div>
            </div>
          {/each}
        </div>
        <div class="flex gap-1 mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
          {#each stats.pace as month}
            <div class="flex-1 text-center">
              <span class="text-[10px] text-slate-500 dark:text-slate-400">{month.month}</span>
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Seasonal Activity -->
  <section>
    <h3 class="text-sm font-semibold text-accent uppercase tracking-wider mb-4">Seasonal Activity</h3>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {#each Object.entries(stats.seasonal) as [season, count]}
        <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-card text-center">
          <div class="inline-flex items-center gap-2 mb-2">
            <div class="w-3 h-3 rounded-full {seasonColors[season]}"></div>
            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{seasonLabels[season]}</span>
          </div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white">{count}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">summits</div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Personal Records -->
  {#if stats.records.mostPeaksInOneDay > 0}
    <section>
      <h3 class="text-sm font-semibold text-accent uppercase tracking-wider mb-4">Personal Records</h3>
      <div class="grid sm:grid-cols-3 gap-3">
        {#if stats.records.earliestStartTime}
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-card">
            <div class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Earliest Start</div>
            <div class="text-xl font-bold text-slate-900 dark:text-white">{formatTime(stats.records.earliestStartTime)}</div>
          </div>
        {/if}
        <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-card">
          <div class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Most Peaks in a Day</div>
          <div class="text-xl font-bold text-slate-900 dark:text-white">{stats.records.mostPeaksInOneDay}</div>
        </div>
        {#if stats.records.topElevationDay}
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-card">
            <div class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Top Elevation Day</div>
            <div class="text-xl font-bold text-slate-900 dark:text-white">{stats.records.topElevationDay.totalElevation.toLocaleString()}'</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {formatDate(stats.records.topElevationDay.date)} -- {stats.records.topElevationDay.peaks.join(', ')}
            </div>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Route Preferences -->
  {#if stats.routePreferences.length > 0}
    <section>
      <h3 class="text-sm font-semibold text-accent uppercase tracking-wider mb-4">Route Preferences</h3>
      <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-card space-y-3">
        {#each stats.routePreferences as pref}
          {@const total = stats.routePreferences.reduce((s, p) => s + p.count, 0)}
          {@const pct = total > 0 ? (pref.count / total) * 100 : 0}
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-slate-700 dark:text-slate-200">Class {pref.class}</span>
              <span class="text-slate-500 dark:text-slate-400">{pref.count} ({pct.toFixed(0)}%)</span>
            </div>
            <div class="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                class="bg-class-{pref.class} h-full rounded-full transition-all duration-500"
                style="width: {pct}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Top Conditions -->
  {#if stats.topConditions.length > 0}
    <section>
      <h3 class="text-sm font-semibold text-accent uppercase tracking-wider mb-4">Conditions</h3>
      <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-card space-y-3">
        {#each stats.topConditions as cond}
          {@const pct = (cond.count / maxConditionCount) * 100}
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-slate-700 dark:text-slate-200">{cond.condition}</span>
              <span class="text-slate-500 dark:text-slate-400">{cond.count}</span>
            </div>
            <div class="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                class="bg-accent h-full rounded-full transition-all duration-500"
                style="width: {pct}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

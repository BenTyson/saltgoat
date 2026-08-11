<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const leaderboard = $derived(data.leaderboard);
  const stats = $derived(data.stats);
  const recentActivity = $derived(data.recentActivity);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  function getRankStyle(rank: number): string {
    if (rank === 1) return 'bg-accent text-mountain-navy';
    if (rank === 2) return 'bg-slate-300 text-slate-800';
    if (rank === 3) return 'bg-accent-dark text-white';
    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
  }
</script>

<svelte:head>
  <title>Leaderboard | SaltGoat</title>
  <meta name="description" content="See who's leading the charge to summit all 58 Colorado 14ers. Track your rank among fellow peak baggers." />
</svelte:head>

<div class="min-h-screen bg-white dark:bg-slate-900">
  <Container class="py-12">
    <!-- Header -->
    <div class="mb-10">
      <p class="eyebrow-accent mb-3">The race to 58</p>
      <h1 class="heading-page text-slate-900 dark:text-white">
        Leaderboard
      </h1>
      <p class="text-slate-600 dark:text-slate-400 mt-3">
        Who's leading the charge across Colorado's fourteeners
      </p>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700/70 border-y border-slate-200 dark:border-slate-700/70 mb-10">
      <div class="py-6 px-4 text-center">
        <div class="stats-number font-display text-3xl sm:text-4xl text-slate-900 dark:text-white">{stats.totalClimbers}</div>
        <div class="eyebrow mt-2">Active Climbers</div>
      </div>
      <div class="py-6 px-4 text-center">
        <div class="stats-number font-display text-3xl sm:text-4xl text-slate-900 dark:text-white">{stats.totalSummitsLogged.toLocaleString()}</div>
        <div class="eyebrow mt-2">Summits Logged</div>
      </div>
      <div class="py-6 px-4 text-center">
        <div class="stats-number font-display text-3xl sm:text-4xl text-slate-900 dark:text-white">{stats.peakBaggers}</div>
        <div class="eyebrow mt-2">Peak Baggers</div>
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-8">
      <!-- Leaderboard Table -->
      <div class="lg:col-span-2">
        <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
          <!-- Table Header -->
          <div class="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div class="col-span-1 text-center">Rank</div>
            <div class="col-span-5">Climber</div>
            <div class="col-span-2 text-center">Peaks</div>
            <div class="col-span-2 text-center">Progress</div>
            <div class="col-span-2 text-right">Last Summit</div>
          </div>

          <!-- Table Body -->
          {#if leaderboard.length > 0}
            <div class="divide-y divide-slate-200 dark:divide-slate-700">
              {#each leaderboard as entry, index}
                <a
                  href="/users/{entry.userId}"
                  class="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors {index < 3 ? 'bg-accent/[0.04] dark:bg-accent/[0.06]' : ''}"
                >
                  <!-- Rank -->
                  <div class="col-span-1 flex justify-center">
                    <span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold {getRankStyle(entry.rank)}">
                      {entry.rank}
                    </span>
                  </div>

                  <!-- Climber -->
                  <div class="col-span-5">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-mountain-slate flex items-center justify-center text-white text-sm font-bold">
                        {entry.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div class="font-medium text-slate-900 dark:text-white text-sm group-hover:text-accent transition-colors flex items-center gap-1.5">
                          {entry.displayName}
                          {#if entry.isPro}
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent">PRO</span>
                          {/if}
                        </div>
                        {#if entry.uniquePeaks === 58}
                          <div class="text-xs text-accent font-medium flex items-center gap-1">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2L2 22h20L12 2z" />
                            </svg>
                            Peak Bagger
                          </div>
                        {:else if entry.totalSummits > entry.uniquePeaks}
                          <div class="text-xs text-slate-500 dark:text-slate-400">
                            {entry.totalSummits} total summits
                          </div>
                        {/if}
                      </div>
                    </div>
                  </div>

                  <!-- Peaks -->
                  <div class="col-span-2 text-center">
                    <span class="text-lg font-bold text-slate-900 dark:text-white">{entry.uniquePeaks}</span>
                    <span class="text-slate-400 dark:text-slate-500">/58</span>
                  </div>

                  <!-- Progress -->
                  <div class="col-span-2">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                        <div
                          class="h-full rounded-full bg-accent transition-all"
                          style="width: {entry.progress}%"
                        ></div>
                      </div>
                      <span class="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums w-10 text-right">
                        {entry.progress.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <!-- Last Summit -->
                  <div class="col-span-2 text-right text-sm text-slate-500 dark:text-slate-400">
                    {entry.lastSummitDate ? formatDate(entry.lastSummitDate) : '-'}
                  </div>
                </a>
              {/each}
            </div>
          {:else}
            <div class="p-12 text-center">
              <div class="mx-auto h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <svg class="h-8 w-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">No climbers yet</h3>
              <p class="text-slate-500 dark:text-slate-400">
                Be the first to log a summit!
              </p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Recent Activity Sidebar -->
      <div>
        <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
          <div class="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            <h2 class="eyebrow">Recent Activity</h2>
          </div>

          {#if recentActivity.length > 0}
            <div class="divide-y divide-slate-200 dark:divide-slate-700">
              {#each recentActivity as activity}
                <div class="p-4">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent-warm/20 flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 22h20L12 2z" />
                      </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-slate-900 dark:text-white">
                        <span class="font-medium">{activity.displayName}</span>
                        <span class="text-slate-500 dark:text-slate-400"> summited </span>
                        <a href="/peaks/{activity.peakSlug}" class="font-medium text-accent hover:text-accent-warm transition-colors">
                          {activity.peakName}
                        </a>
                      </p>
                      <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatDate(activity.dateSummited)}
                      </p>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No recent activity
            </div>
          {/if}
        </div>

        <!-- Call to Action -->
        <div class="mt-6 rounded-lg border border-accent/25 bg-accent/[0.06] p-6 text-center">
          <h3 class="font-display text-xl text-slate-900 dark:text-white mb-2">
            Join the challenge
          </h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Create an account to track your progress and compete with other climbers.
          </p>
          <a
            href="/auth"
            class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent text-mountain-navy font-semibold text-sm hover:bg-accent-light transition-colors"
          >
            Get started
          </a>
        </div>
      </div>
    </div>
  </Container>
</div>

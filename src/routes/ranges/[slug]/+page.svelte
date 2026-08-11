<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import PeakCard from '$lib/components/peak/PeakCard.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const rangeInfo = $derived(data.rangeInfo);
  const peaks = $derived(data.peaks);
  const userSummitedPeaks = $derived(data.userSummitedPeaks);
  const isLoggedIn = $derived(data.isLoggedIn);
  const stats = $derived(data.stats);

  // Sort options
  let sortBy = $state<'elevation' | 'name' | 'difficulty'>('elevation');

  const sortedPeaks = $derived(() => {
    const sorted = [...peaks];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'difficulty':
        return sorted.sort((a, b) =>
          (a.standard_route?.difficulty_class || 1) - (b.standard_route?.difficulty_class || 1)
        );
      case 'elevation':
      default:
        return sorted.sort((a, b) => b.elevation - a.elevation);
    }
  });

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>{rangeInfo.name} | SaltGoat</title>
  <meta name="description" content="{rangeInfo.description}" />
  <meta property="og:title" content="{rangeInfo.name} - Colorado 14ers | SaltGoat" />
  <meta property="og:description" content="{rangeInfo.description}" />
  <meta property="og:type" content="website" />
  <link rel="canonical" href="https://saltgoat.co/ranges/{rangeInfo.slug}" />
</svelte:head>

<!-- Hero Section -->
<div class="relative bg-gradient-to-br from-mountain-blue via-mountain-blue/90 to-mountain-mist overflow-hidden">
  <div class="absolute inset-0 opacity-10">
    <svg class="absolute bottom-0 w-full h-48" viewBox="0 0 1200 200" preserveAspectRatio="none">
      <path d="M0,200 L0,100 L200,150 L400,50 L600,120 L800,30 L1000,100 L1200,60 L1200,200 Z" fill="currentColor" class="text-white" />
    </svg>
  </div>

  <Container class="relative py-12 sm:py-16">
    <!-- Breadcrumb -->
    <nav class="mb-4 text-sm text-white/60">
      <a href="/ranges" class="hover:text-white transition-colors">Ranges</a>
      <span class="mx-2">›</span>
      <span class="text-white/90">{rangeInfo.name}</span>
    </nav>

    <div class="max-w-3xl">
      <h1 class="text-3xl sm:text-4xl font-display font-normal text-white mb-3">
        {rangeInfo.name}
      </h1>
      <p class="text-lg text-white/80 leading-relaxed mb-6">
        {rangeInfo.description}
      </p>

      <!-- Stats bar -->
      <div class="flex flex-wrap gap-6">
        <div class="flex items-center gap-2 text-white/90">
          <svg class="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
          </svg>
          <span><strong>{stats.totalPeaks}</strong> Peaks</span>
        </div>
        <div class="flex items-center gap-2 text-white/90">
          <svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span><strong>{stats.highestElevation.toLocaleString()}'</strong> Highest</span>
        </div>
        <div class="flex items-center gap-2 text-white/90">
          <svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <span>{rangeInfo.location}</span>
        </div>
      </div>

      <!-- User progress -->
      {#if isLoggedIn}
        <div class="mt-6 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-white/90">Your Progress</span>
            <span class="text-sm font-bold text-white">{stats.summitedCount} / {stats.totalPeaks}</span>
          </div>
          <div class="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 {stats.progress === 100 ? 'bg-semantic-success-light' : 'bg-accent'}"
              style="width: {stats.progress}%"
            ></div>
          </div>
          {#if stats.progress === 100}
            <p class="mt-2 text-sm text-semantic-success-light font-medium">
              Range complete! You've summited all {stats.totalPeaks} peaks.
            </p>
          {:else if stats.summitedCount > 0}
            <p class="mt-2 text-sm text-white/70">
              {stats.totalPeaks - stats.summitedCount} more to complete this range
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </Container>
</div>

<Container class="py-10">
  <!-- Info Cards -->
  <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
    <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-card">
      <div class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Best Season</div>
      <div class="font-semibold text-slate-900 dark:text-white">{rangeInfo.bestSeason}</div>
    </div>
    <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-card">
      <div class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Character</div>
      <div class="font-semibold text-slate-900 dark:text-white">{rangeInfo.character.split(' - ')[0]}</div>
    </div>
    <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-card">
      <div class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Elevation Range</div>
      <div class="font-semibold text-slate-900 dark:text-white">
        {stats.lowestElevation.toLocaleString()}' - {stats.highestElevation.toLocaleString()}'
      </div>
    </div>
    <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-card">
      <div class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nearest Towns</div>
      <div class="font-semibold text-slate-900 dark:text-white truncate">{rangeInfo.nearestTowns.join(', ')}</div>
    </div>
  </div>

  <!-- Peaks Section -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    <h2 class="heading-section text-slate-900 dark:text-white">
      Peaks in {rangeInfo.name}
    </h2>

    <!-- Sort dropdown -->
    <div class="flex items-center gap-2">
      <label for="sort" class="text-sm text-slate-600 dark:text-slate-400">Sort by:</label>
      <select
        id="sort"
        bind:value={sortBy}
        class="
          rounded-lg border border-slate-300 dark:border-slate-600
          bg-white dark:bg-slate-700
          px-3 py-1.5 text-sm
          text-slate-900 dark:text-white
          focus:border-accent focus:ring-2 focus:ring-accent/20
        "
      >
        <option value="elevation">Elevation</option>
        <option value="name">Name</option>
        <option value="difficulty">Difficulty</option>
      </select>
    </div>
  </div>

  <!-- Peak Cards List -->
  <div class="space-y-4">
    {#each sortedPeaks() as peak}
      {@const summitDate = userSummitedPeaks[peak.id]}
      <div class="relative">
        <PeakCard {peak} />
        <!-- Summit badge overlay -->
        {#if summitDate}
          <div class="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-semantic-success text-white text-xs font-semibold shadow-md flex items-center gap-1.5">
            <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            Summited {formatDate(summitDate)}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Back to ranges -->
  <div class="mt-10 text-center">
    <a
      href="/ranges"
      class="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-accent transition-colors"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
      </svg>
      Back to all ranges
    </a>
  </div>
</Container>

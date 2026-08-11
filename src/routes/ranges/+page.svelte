<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const ranges = $derived(data.ranges);
  const isLoggedIn = $derived(data.isLoggedIn);

  // Gradient backgrounds for range cards (rotating through a palette)
  const gradients = [
    'from-mountain-blue/20 to-mountain-mist/20',
    'from-accent/20 to-accent-warm/20',
    'from-semantic-success/20 to-semantic-success-light/20',
    'from-violet-500/20 to-purple-500/20',
    'from-semantic-warning/20 to-semantic-warning/20',
    'from-semantic-danger/50/20 to-pink-500/20',
    'from-cyan-500/20 to-sky-500/20'
  ];

  // Icon colors matching gradients
  const iconColors = [
    'text-mountain-blue dark:text-mountain-mist',
    'text-accent',
    'text-semantic-success',
    'text-violet-500',
    'text-semantic-warning',
    'text-semantic-danger/50',
    'text-cyan-500'
  ];
</script>

<svelte:head>
  <title>Mountain Ranges | SaltGoat</title>
  <meta name="description" content="Explore Colorado's 14er mountain ranges - from the gentle giants of the Sawatch to the rugged peaks of the San Juans." />
</svelte:head>

<!-- Hero Section -->
<div class="relative bg-gradient-to-br from-mountain-blue via-mountain-blue/90 to-mountain-mist overflow-hidden">
  <!-- Decorative mountains -->
  <div class="absolute inset-0 opacity-10">
    <svg class="absolute bottom-0 w-full h-48" viewBox="0 0 1200 200" preserveAspectRatio="none">
      <path d="M0,200 L0,100 L200,150 L400,50 L600,120 L800,30 L1000,100 L1200,60 L1200,200 Z" fill="currentColor" class="text-white" />
    </svg>
  </div>

  <Container class="relative py-16 sm:py-20">
    <div class="max-w-3xl">
      <h1 class="text-4xl sm:text-5xl font-display font-normal text-white mb-4">
        Mountain Ranges
      </h1>
      <p class="text-xl text-white/80 leading-relaxed">
        Colorado's 58 fourteeners are spread across seven distinct mountain ranges, each with its own character, challenges, and beauty. From the accessible Sawatch to the rugged San Juans, discover your next adventure.
      </p>

      <!-- Quick stats -->
      <div class="flex flex-wrap gap-6 mt-8">
        <div class="flex items-center gap-2 text-white/90">
          <svg class="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
          </svg>
          <span class="font-semibold">7 Ranges</span>
        </div>
        <div class="flex items-center gap-2 text-white/90">
          <svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          <span class="font-semibold">58 Peaks</span>
        </div>
        <div class="flex items-center gap-2 text-white/90">
          <svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span class="font-semibold">14,000'+ Elevation</span>
        </div>
      </div>
    </div>
  </Container>
</div>

<Container class="py-12">
  <!-- Range Cards Grid -->
  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {#each ranges as range, i}
      {@const gradient = gradients[i % gradients.length]}
      {@const iconColor = iconColors[i % iconColors.length]}
      {@const progressPct = range.userSummitedCount !== undefined
        ? (range.userSummitedCount / range.peakCount) * 100
        : 0}

      <a
        href="/ranges/{range.slug}"
        class="
          group relative rounded-2xl overflow-hidden
          bg-white dark:bg-slate-800
          border border-slate-200 dark:border-slate-700
          shadow-card hover:shadow-card-elevated
          transition-all duration-300
          hover:-translate-y-1
        "
      >
        <!-- Gradient header -->
        <div class="h-32 bg-gradient-to-br {gradient} relative">
          <!-- Mountain icon -->
          <div class="absolute inset-0 flex items-center justify-center">
            <svg class="h-16 w-16 {iconColor} opacity-50 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
            </svg>
          </div>

          <!-- Peak count badge -->
          <div class="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm">
            {range.peakCount} {range.peakCount === 1 ? 'peak' : 'peaks'}
          </div>

          <!-- User progress (if logged in) -->
          {#if range.userSummitedCount !== undefined}
            <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-black/10">
              <div
                class="h-full bg-semantic-success transition-all duration-500"
                style="width: {progressPct}%"
              ></div>
            </div>
          {/if}
        </div>

        <!-- Content -->
        <div class="p-5">
          <div class="flex items-start justify-between gap-2 mb-2">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-accent transition-colors">
              {range.name}
            </h2>
            {#if range.userSummitedCount !== undefined && range.userSummitedCount > 0}
              <span class="flex-shrink-0 px-2 py-0.5 rounded-full bg-semantic-success/10 dark:bg-semantic-success/20 text-semantic-success-dark dark:text-semantic-success-light text-xs font-semibold">
                {range.userSummitedCount}/{range.peakCount}
              </span>
            {/if}
          </div>

          <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
            {range.character}
          </p>

          <!-- Stats row -->
          <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <span class="flex items-center gap-1">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {range.highestElevation.toLocaleString()}'
            </span>
            <span class="flex items-center gap-1">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {range.classRange}
            </span>
            {#if range.highestPeak}
              <span class="flex items-center gap-1">
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clip-rule="evenodd" />
                </svg>
                {range.highestPeak}
              </span>
            {/if}
          </div>
        </div>

        <!-- Hover indicator -->
        <div class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </a>
    {/each}
  </div>

  <!-- Range Comparison Table (Desktop) -->
  <section class="mt-16 hidden lg:block">
    <h2 class="heading-section text-slate-900 dark:text-white mb-6">
      Range Comparison
    </h2>
    <div class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto bg-white dark:bg-slate-800 shadow-card">
      <table class="w-full">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            <th class="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Range</th>
            <th class="text-center px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Peaks</th>
            <th class="text-center px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Highest</th>
            <th class="text-center px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Difficulty</th>
            <th class="text-left px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Character</th>
            {#if isLoggedIn}
              <th class="text-center px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Progress</th>
            {/if}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
          {#each ranges as range}
            {@const progressPct = range.userSummitedCount !== undefined
              ? (range.userSummitedCount / range.peakCount) * 100
              : 0}
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <td class="px-6 py-4">
                <a href="/ranges/{range.slug}" class="font-semibold text-slate-900 dark:text-white hover:text-accent transition-colors">
                  {range.name}
                </a>
              </td>
              <td class="text-center px-4 py-4 text-slate-600 dark:text-slate-300 font-medium">
                {range.peakCount}
              </td>
              <td class="text-center px-4 py-4">
                <div class="text-slate-900 dark:text-white font-medium">{range.highestElevation.toLocaleString()}'</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">{range.highestPeak}</div>
              </td>
              <td class="text-center px-4 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {range.classRange}
              </td>
              <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                {range.character}
              </td>
              {#if isLoggedIn}
                <td class="px-4 py-4">
                  <div class="flex items-center gap-2">
                    <div class="w-20 h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                      <div
                        class="h-full rounded-full {progressPct === 100 ? 'bg-semantic-success' : 'bg-accent'} transition-all"
                        style="width: {progressPct}%"
                      ></div>
                    </div>
                    <span class="text-xs text-slate-500 dark:text-slate-400 w-10">
                      {range.userSummitedCount}/{range.peakCount}
                    </span>
                  </div>
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</Container>

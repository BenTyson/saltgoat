<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import StatsBar from '$lib/components/peak/StatsBar.svelte';
  import TrailMapSection from '$lib/components/map/TrailMapSection.svelte';
  import ParkingCard from '$lib/components/parking/ParkingCard.svelte';
  import RouteWeatherStrip from '$lib/components/weather/RouteWeatherStrip.svelte';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const { peak, route } = data;

  const exposureColors: Record<string, string> = {
    Low: 'text-class-1',
    Moderate: 'text-class-2',
    High: 'text-class-3',
    Extreme: 'text-class-4'
  };

  const exposureBgColors: Record<string, string> = {
    Low: 'bg-class-1/10',
    Moderate: 'bg-class-2/10',
    High: 'bg-class-3/10',
    Extreme: 'bg-class-4/10'
  };

  let copySuccess = $state(false);

  async function copyCoordinates() {
    if (route.trailhead_latitude && route.trailhead_longitude) {
      const coords = `${route.trailhead_latitude}, ${route.trailhead_longitude}`;
      await navigator.clipboard.writeText(coords);
      copySuccess = true;
      setTimeout(() => (copySuccess = false), 2000);
    }
  }

  async function handleUploadTrace(file: File) {
    const formData = new FormData();
    formData.append('route_id', route.id);
    formData.append('file', file);

    const response = await fetch('?/uploadTrace', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    // SvelteKit form action responses have a specific shape
    if (result.type === 'failure') {
      throw new Error(result.data?.message || 'Upload failed');
    }

    await invalidateAll();
  }

  async function handleVoteTrace(traceId: string) {
    const formData = new FormData();
    formData.append('trace_id', traceId);

    await fetch('?/voteTrace', {
      method: 'POST',
      body: formData
    });

    await invalidateAll();
  }

  async function handleDeleteTrace(traceId: string) {
    const formData = new FormData();
    formData.append('trace_id', traceId);

    await fetch('?/deleteTrace', {
      method: 'POST',
      body: formData
    });

    await invalidateAll();
  }

  function handleDownload(storagePath: string): string {
    return data.downloadUrls[storagePath] || '#';
  }
</script>

<svelte:head>
  <title>{route.name} - {peak.name} | SaltGoat</title>
  <meta
    name="description"
    content="{route.name} route on {peak.name}. {route.distance_miles} miles, {route.elevation_gain_ft.toLocaleString()}' gain, Class {route.difficulty_class}. {route.description?.slice(0, 100)}..."
  />
</svelte:head>

<Container class="py-8 sm:py-12">
  <!-- Breadcrumb -->
  <nav class="mb-6 text-sm text-slate-500 dark:text-slate-400 animate-fade-in-up">
    <a href="/peaks" class="hover:text-mountain-blue dark:hover:text-accent transition-colors">Peaks</a>
    <span class="mx-2">›</span>
    <a href="/peaks/{peak.slug}" class="hover:text-mountain-blue dark:hover:text-accent transition-colors"
      >{peak.name}</a
    >
    <span class="mx-2">›</span>
    <span class="text-slate-700 dark:text-slate-200">{route.name}</span>
  </nav>

  <!-- Route Header Card -->
  <div
    class="
      animate-fade-in-up rounded-2xl overflow-hidden
      bg-white/90 dark:bg-slate-800/90 backdrop-blur-md
      shadow-card-elevated border border-slate-200/50 dark:border-slate-700/50
    "
    style="animation-delay: 100ms"
  >
    <!-- Gradient top border based on difficulty -->
    <div
      class="
        h-1.5
        {route.difficulty_class === 1 ? 'bg-gradient-to-r from-class-1 to-semantic-success-light' :
         route.difficulty_class === 2 ? 'bg-gradient-to-r from-class-2 to-blue-400' :
         route.difficulty_class === 3 ? 'bg-gradient-to-r from-class-3 to-semantic-warning-light' :
         route.difficulty_class === 4 ? 'bg-gradient-to-r from-class-4 to-semantic-danger-light' :
         'bg-accent'}
      "
    ></div>

    <div class="p-6 sm:p-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="heading-page text-slate-900 dark:text-white">
            {route.name}
          </h1>
          <p class="mt-2 text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <a
              href="/peaks/{peak.slug}"
              class="hover:text-mountain-blue dark:hover:text-accent transition-colors font-medium"
            >
              {peak.name}
            </a>
            <span class="text-slate-300 dark:text-slate-600">·</span>
            <span class="stat-display text-lg text-accent">{peak.elevation.toLocaleString()}'</span>
            <span class="text-slate-300 dark:text-slate-600">·</span>
            <span class="flex items-center gap-1">
              <svg class="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clip-rule="evenodd" />
              </svg>
              Rank #{peak.rank}
            </span>
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <Badge variant="class-{route.difficulty_class}" size="lg" glow>
            Class {route.difficulty_class}
          </Badge>
          {#if route.is_standard}
            <Badge variant="gold" size="lg">Standard Route</Badge>
          {/if}
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="mt-8">
        <StatsBar {route} />
      </div>
    </div>
  </div>

  <!-- Trail Map Section -->
  <div class="mt-10">
    <TrailMapSection
      {route}
      {peak}
      bestTrace={data.bestTrace}
      allTraces={data.allTraces}
      isLoggedIn={data.isLoggedIn}
      currentUserId={data.currentUserId}
      isPro={data.isPro}
      forecast={data.forecast}
      onUpload={handleUploadTrace}
      onVote={handleVoteTrace}
      onDelete={handleDeleteTrace}
      onDownload={handleDownload}
    />
  </div>

  <!-- Info Cards Grid -->
  <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <!-- Route Details Card -->
    <div
      class="
        animate-fade-in-up rounded-xl overflow-hidden
        border border-slate-200 dark:border-slate-700
        bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80
        shadow-card
      "
      style="animation-delay: 150ms"
    >
      <div class="p-5">
        <h3 class="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <svg class="h-5 w-5 text-mountain-blue dark:text-mountain-mist" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Route Details
        </h3>

        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
            <dt class="text-slate-500 dark:text-slate-400">Distance</dt>
            <dd class="stats-number font-semibold text-slate-900 dark:text-white">
              {route.distance_miles} miles RT
            </dd>
          </div>

          <div class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
            <dt class="text-slate-500 dark:text-slate-400">Elevation Gain</dt>
            <dd class="stats-number font-semibold text-slate-900 dark:text-white">
              {route.elevation_gain_ft.toLocaleString()}'
            </dd>
          </div>

          <div class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
            <dt class="text-slate-500 dark:text-slate-400">Difficulty</dt>
            <dd class="font-semibold text-class-{route.difficulty_class} flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full bg-current"></span>
              Class {route.difficulty_class}
            </dd>
          </div>

          {#if route.exposure}
            <div class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
              <dt class="text-slate-500 dark:text-slate-400">Exposure</dt>
              <dd class="font-semibold">
                <span class="px-2 py-0.5 rounded-full text-xs {exposureColors[route.exposure]} {exposureBgColors[route.exposure]}">
                  {route.exposure}
                </span>
              </dd>
            </div>
          {/if}

          {#if route.typical_time_hours}
            <div class="flex justify-between items-center py-2">
              <dt class="text-slate-500 dark:text-slate-400">Typical Time</dt>
              <dd class="font-semibold text-slate-900 dark:text-white">
                {route.typical_time_hours} hours
              </dd>
            </div>
          {/if}
        </dl>
      </div>

      <!-- GPX Download -->
      {#if route.gpx_file_url}
        <div class="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
          <a
            href={route.gpx_file_url}
            download
            class="
              flex items-center justify-center gap-2 w-full
              px-4 py-2.5 rounded-lg
              bg-mountain-blue text-white font-medium
              hover:bg-mountain-navy transition-colors
            "
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download GPX
          </a>
        </div>
      {/if}
    </div>

    <!-- Trailhead Card -->
    {#if route.trailhead_name}
      <div
        class="
          animate-fade-in-up rounded-xl overflow-hidden
          border border-slate-200 dark:border-slate-700
          bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80
          shadow-card
        "
        style="animation-delay: 200ms"
      >
        <div class="p-5">
          <h3 class="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Trailhead
          </h3>

          <dl class="mt-4 space-y-3 text-sm">
            <div class="py-2 border-b border-slate-100 dark:border-slate-700">
              <dt class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</dt>
              <dd class="mt-1 font-semibold text-slate-900 dark:text-white">
                {route.trailhead_name}
              </dd>
            </div>

            {#if route.trailhead_elevation}
              <div class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                <dt class="text-slate-500 dark:text-slate-400">Starting Elevation</dt>
                <dd class="stats-number font-semibold text-slate-900 dark:text-white">
                  {route.trailhead_elevation.toLocaleString()}'
                </dd>
              </div>
            {/if}

            {#if route.trailhead_latitude && route.trailhead_longitude}
              <div class="py-2">
                <dt class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Coordinates</dt>
                <dd class="flex items-center justify-between">
                  <span class="stats-number text-slate-700 dark:text-slate-300 text-xs">
                    {route.trailhead_latitude.toFixed(4)}°N, {Math.abs(route.trailhead_longitude).toFixed(4)}°W
                  </span>
                  <button
                    onclick={copyCoordinates}
                    class="
                      p-1.5 rounded-lg
                      text-slate-400 hover:text-accent hover:bg-accent/10
                      transition-all duration-200
                    "
                    title="Copy coordinates"
                  >
                    {#if copySuccess}
                      <svg class="h-4 w-4 text-class-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    {:else}
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    {/if}
                  </button>
                </dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Open in Maps -->
        {#if route.trailhead_latitude && route.trailhead_longitude}
          <div class="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
            <a
              href="https://www.google.com/maps/search/?api=1&query={route.trailhead_latitude},{route.trailhead_longitude}"
              target="_blank"
              rel="noopener noreferrer"
              class="
                flex items-center justify-center gap-2 w-full
                px-4 py-2.5 rounded-lg
                border border-slate-200 dark:border-slate-600
                text-slate-700 dark:text-slate-300 font-medium
                hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors
              "
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Maps
            </a>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Parking Card -->
    <div class="animate-fade-in-up" style="animation-delay: 250ms">
      <ParkingCard {route} recentReports={data.recentParkingReports || []} />
    </div>

    <!-- Route Weather Strip -->
    {#if data.forecast?.bands.base}
      <RouteWeatherStrip band={data.forecast.bands.base} peakSlug={peak.slug} />
    {/if}
  </div>

  <!-- Description & Notes Section -->
  {#if route.description || route.gear_notes || route.route_notes}
    <div class="mt-10 grid gap-6 lg:grid-cols-2">
      <!-- Description -->
      {#if route.description}
        <section
          class="
            animate-fade-in-up rounded-xl p-6
            border border-slate-200 dark:border-slate-700
            bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80
            shadow-card
          "
          style="animation-delay: 300ms"
        >
          <h2 class="heading-section text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <svg class="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Route Description
          </h2>
          <p class="leading-relaxed text-slate-700 dark:text-slate-300">
            {route.description}
          </p>
        </section>
      {/if}

      <!-- Gear Notes -->
      {#if route.gear_notes}
        <section
          class="
            animate-fade-in-up rounded-xl p-6
            border border-slate-200 dark:border-slate-700
            bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80
            shadow-card
          "
          style="animation-delay: 350ms"
        >
          <h2 class="heading-section text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <svg class="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Gear & Preparation
          </h2>
          <p class="text-slate-700 dark:text-slate-300 leading-relaxed">{route.gear_notes}</p>
        </section>
      {/if}

      <!-- Route Notes (full width if present) -->
      {#if route.route_notes}
        <section
          class="
            animate-fade-in-up rounded-xl p-6 lg:col-span-2
            border border-semantic-warning/20 dark:border-semantic-warning-dark/50
            bg-gradient-to-br from-semantic-warning/5 to-white dark:from-semantic-warning/15 dark:to-slate-800/50
          "
          style="animation-delay: 400ms"
        >
          <h2 class="heading-section text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <svg class="h-6 w-6 text-semantic-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Additional Notes
          </h2>
          <p class="text-slate-700 dark:text-slate-300 leading-relaxed">{route.route_notes}</p>
        </section>
      {/if}
    </div>
  {/if}

  <!-- Back to Peak -->
  <div class="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 animate-fade-in-up" style="animation-delay: 300ms">
    <a
      href="/peaks/{peak.slug}"
      class="
        inline-flex items-center gap-2
        px-4 py-2 rounded-lg
        text-sm font-medium text-mountain-blue dark:text-accent
        hover:bg-mountain-blue/10 dark:hover:bg-accent/10
        transition-colors
      "
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to {peak.name}
    </a>
  </div>
</Container>

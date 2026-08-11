<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PastTrip, PlannedTripWithPeaks } from '$lib/server/trips';
  import CreateTripModal from './CreateTripModal.svelte';

  interface Peak {
    id: string;
    name: string;
    slug: string;
    elevation: number;
    range: string;
  }

  interface Props {
    pastTrips: PastTrip[];
    plannedTrips: PlannedTripWithPeaks[];
    peaks: Peak[];
    isOwnProfile?: boolean;
  }

  let { pastTrips, plannedTrips, peaks, isOwnProfile = false }: Props = $props();

  let showCreateModal = $state(false);
  let expandedTrips = $state<Set<string>>(new Set());
  let copiedTripId = $state<string | null>(null);

  async function copyTripLink(tripId: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/trips/${tripId}`);
    copiedTripId = tripId;
    setTimeout(() => (copiedTripId = null), 2000);
  }

  function toggleTrip(tripId: string) {
    const newSet = new Set(expandedTrips);
    if (newSet.has(tripId)) {
      newSet.delete(tripId);
    } else {
      newSet.add(tripId);
    }
    expandedTrips = newSet;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');

    if (startDate === endDate) {
      return formatDate(startDate);
    }

    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`;
      }
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
    }

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
</script>

<div class="space-y-8">
  <!-- Planned Trips Section -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <svg class="h-5 w-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Upcoming Trips
      </h3>

      {#if isOwnProfile}
        <button
          type="button"
          onclick={() => (showCreateModal = true)}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-mountain-navy font-medium text-sm hover:bg-accent-light transition-all shadow-sm hover:shadow"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Plan Trip
        </button>
      {/if}
    </div>

    {#if plannedTrips.length > 0}
      <div class="space-y-3">
        {#each plannedTrips as trip}
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
            <div class="p-4">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-semibold text-slate-900 dark:text-white">{trip.title}</h4>
                  <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatDateRange(trip.start_date, trip.end_date || trip.start_date)}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                    {trip.peaks?.length || 0} peak{trip.peaks?.length !== 1 ? 's' : ''}
                  </span>
                  <span class="px-2 py-1 rounded-full text-xs font-medium {trip.is_public ? 'bg-semantic-success/10 text-semantic-success-dark dark:bg-semantic-success/20 dark:text-semantic-success-light' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}">
                    {trip.is_public ? 'Public' : 'Private'}
                  </span>
                  {#if trip.is_public}
                    <button
                      type="button"
                      onclick={() => copyTripLink(trip.id)}
                      class="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-accent/10 transition-colors"
                      title={copiedTripId === trip.id ? 'Copied!' : 'Copy share link'}
                    >
                      {#if copiedTripId === trip.id}
                        <svg class="h-4 w-4 text-semantic-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                      {:else}
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      {/if}
                    </button>
                  {/if}
                  {#if isOwnProfile}
                    <form method="POST" action="?/toggleTripVisibility" class="inline" use:enhance={() => {
                      return async () => {
                        await invalidateAll();
                      };
                    }}>
                      <input type="hidden" name="tripId" value={trip.id} />
                      <button
                        type="submit"
                        class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title={trip.is_public ? 'Make private' : 'Make public'}
                      >
                        {#if trip.is_public}
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        {:else}
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        {/if}
                      </button>
                    </form>
                    <form method="POST" action="?/deleteTrip" class="inline">
                      <input type="hidden" name="tripId" value={trip.id} />
                      <button
                        type="submit"
                        class="p-1.5 rounded-lg text-slate-400 hover:text-semantic-danger hover:bg-semantic-danger/5 dark:hover:bg-semantic-danger/15 transition-colors"
                        title="Delete trip"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </form>
                  {/if}
                </div>
              </div>

              {#if trip.peaks && trip.peaks.length > 0}
                <div class="mt-3 flex flex-wrap gap-2">
                  {#each trip.peaks as tripPeak}
                    <a
                      href="/peaks/{tripPeak.peak.slug}"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      {#if tripPeak.route}
                        <span class="w-2 h-2 rounded-full bg-class-{tripPeak.route.difficulty_class}"></span>
                      {/if}
                      {tripPeak.peak.name}
                    </a>
                  {/each}
                </div>
              {/if}

              {#if trip.notes}
                <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">{trip.notes}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 text-center shadow-card">
        <div class="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
          <svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h4 class="font-medium text-slate-900 dark:text-white mb-1">No upcoming trips</h4>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {isOwnProfile ? 'Plan your next adventure!' : 'No trips planned yet.'}
        </p>
      </div>
    {/if}
  </section>

  <!-- Past Trips Section -->
  <section>
    <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
      <svg class="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Past Trips
      {#if pastTrips.length > 0}
        <span class="text-sm font-normal text-slate-500 dark:text-slate-400">({pastTrips.length})</span>
      {/if}
    </h3>

    {#if pastTrips.length > 0}
      <div class="space-y-3">
        {#each pastTrips as trip}
          {@const isExpanded = expandedTrips.has(trip.id)}
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
            <!-- Header (always visible) -->
            <button
              type="button"
              onclick={() => toggleTrip(trip.id)}
              class="w-full p-4 text-left flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <!-- First peak thumbnail -->
              {#if trip.summits[0]?.peak.thumbnail_url}
                <img
                  src={trip.summits[0].peak.thumbnail_url}
                  alt=""
                  class="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
              {:else}
                <div class="w-14 h-14 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l7 9 7-9M5 21l7-9 7 9" />
                  </svg>
                </div>
              {/if}

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="font-semibold text-slate-900 dark:text-white truncate">
                    {trip.summits.map((s) => s.peak.name).join(', ')}
                  </h4>
                </div>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  {formatDateRange(trip.startDate, trip.endDate)}
                </p>
                <div class="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>{trip.totalPeaks} peak{trip.totalPeaks !== 1 ? 's' : ''}</span>
                  {#if trip.totalElevationGain > 0}
                    <span>{trip.totalElevationGain.toLocaleString()}ft gain</span>
                  {/if}
                  {#if trip.totalDistanceMiles > 0}
                    <span>{trip.totalDistanceMiles.toFixed(1)} mi</span>
                  {/if}
                </div>
              </div>

              <svg
                class="w-5 h-5 text-slate-400 transition-transform {isExpanded ? 'rotate-180' : ''}"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Expanded details -->
            {#if isExpanded}
              <div class="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                <div class="space-y-3">
                  {#each trip.summits as summit}
                    <div class="flex items-center gap-3">
                      {#if summit.peak.thumbnail_url}
                        <img
                          src={summit.peak.thumbnail_url}
                          alt={summit.peak.name}
                          class="w-10 h-10 rounded-lg object-cover"
                        />
                      {:else}
                        <div class="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l7 9 7-9M5 21l7-9 7 9" />
                          </svg>
                        </div>
                      {/if}

                      <div class="flex-1 min-w-0">
                        <a
                          href="/peaks/{summit.peak.slug}"
                          class="font-medium text-slate-900 dark:text-white hover:text-accent transition-colors"
                        >
                          {summit.peak.name}
                        </a>
                        <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{summit.peak.elevation.toLocaleString()}ft</span>
                          {#if summit.route}
                            <span class="flex items-center gap-1">
                              <span class="w-1.5 h-1.5 rounded-full bg-class-{summit.route.difficulty_class}"></span>
                              {summit.route.name}
                            </span>
                          {/if}
                        </div>
                      </div>

                      <span class="text-xs text-slate-400">
                        {formatDate(summit.date_summited)}
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 text-center shadow-card">
        <div class="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
          <svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h4 class="font-medium text-slate-900 dark:text-white mb-1">No past trips</h4>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {isOwnProfile ? 'Log your first summit to start tracking trips!' : 'No completed trips yet.'}
        </p>
      </div>
    {/if}
  </section>
</div>

<!-- Create Trip Modal -->
{#if showCreateModal}
  <CreateTripModal {peaks} onClose={() => (showCreateModal = false)} />
{/if}

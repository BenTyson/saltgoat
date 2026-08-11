<script lang="ts">
  import type { UserSummit } from '$lib/server/summits';
  import type { Tables } from '$lib/types/database';

  type Route = Tables<'routes'>;

  interface Props {
    open: boolean;
    peakName: string;
    peakId: string;
    routes: Route[];
    existingSummits: UserSummit[];
    onClose: () => void;
    onSubmit: (data: SummitFormData) => Promise<void>;
    onDelete?: (summitId: string) => Promise<void>;
  }

  export interface SummitFormData {
    date_summited: string;
    route_id: string | null;
    conditions: string | null;
    notes: string | null;
    start_time: string | null;
    summit_time: string | null;
    party_size: number | null;
  }

  let {
    open,
    peakName,
    peakId,
    routes,
    existingSummits,
    onClose,
    onSubmit,
    onDelete
  }: Props = $props();

  // Form state
  let dateSummited = $state(new Date().toISOString().split('T')[0]);
  let selectedRouteId = $state<string | null>(null);
  let conditions = $state('');
  let notes = $state('');
  let startTime = $state('');
  let summitTime = $state('');
  let partySize = $state<number | null>(null);
  let isSubmitting = $state(false);
  let showAdvanced = $state(false);
  let activeTab = $state<'new' | 'history'>('new');

  const conditionOptions = [
    'Bluebird',
    'Partly cloudy',
    'Overcast',
    'Afternoon storms',
    'Rain/hail',
    'Snow',
    'Winter conditions',
    'Windy',
    'Smoke/haze'
  ];

  function resetForm() {
    dateSummited = new Date().toISOString().split('T')[0];
    selectedRouteId = null;
    conditions = '';
    notes = '';
    startTime = '';
    summitTime = '';
    partySize = null;
    showAdvanced = false;
    isSubmitting = false;
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    isSubmitting = true;

    try {
      await onSubmit({
        date_summited: dateSummited,
        route_id: selectedRouteId || null,
        conditions: conditions || null,
        notes: notes || null,
        start_time: startTime || null,
        summit_time: summitTime || null,
        party_size: partySize
      });
      resetForm();
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete(summitId: string) {
    if (!onDelete) return;
    if (!confirm('Remove this summit from your log?')) return;
    await onDelete(summitId);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getRouteName(routeId: string | null): string {
    if (!routeId) return 'Unknown route';
    return routes.find(r => r.id === routeId)?.name ?? 'Unknown route';
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
    onclick={handleClose}
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
    role="button"
    tabindex="-1"
  ></div>

  <!-- Modal -->
  <div
    class="
      fixed inset-x-4 top-[5vh] z-50
      mx-auto max-w-lg
      max-h-[90vh] overflow-y-auto
      rounded-2xl bg-white dark:bg-slate-800
      shadow-2xl
      animate-fade-in-up
    "
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <!-- Header -->
    <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4">
      <div>
        <h2 id="modal-title" class="text-lg font-bold text-slate-900 dark:text-white">
          {peakName}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">Summit Log</p>
      </div>
      <button
        onclick={handleClose}
        class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        aria-label="Close modal"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Tabs (if has history) -->
    {#if existingSummits.length > 0}
      <div class="flex border-b border-slate-200 dark:border-slate-700 px-6">
        <button
          onclick={() => activeTab = 'new'}
          class="
            px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors
            {activeTab === 'new'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}
          "
        >
          Log Another
        </button>
        <button
          onclick={() => activeTab = 'history'}
          class="
            px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors
            {activeTab === 'history'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}
          "
        >
          History ({existingSummits.length})
        </button>
      </div>
    {/if}

    <!-- Content -->
    <div class="p-6">
      {#if activeTab === 'new' || existingSummits.length === 0}
        <!-- New Summit Form -->
        <form onsubmit={handleSubmit} class="space-y-5">
          <!-- Date (Required) -->
          <div>
            <label for="date" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Date Summited *
            </label>
            <input
              type="date"
              id="date"
              bind:value={dateSummited}
              required
              max={new Date().toISOString().split('T')[0]}
              class="
                w-full rounded-lg border border-slate-300 dark:border-slate-600
                bg-white dark:bg-slate-700
                px-4 py-2.5
                text-slate-900 dark:text-white
                focus:border-accent focus:ring-2 focus:ring-accent/20
                transition-colors
              "
            />
          </div>

          <!-- Route -->
          {#if routes.length > 0}
            <div>
              <label for="route" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Route Taken
              </label>
              <select
                id="route"
                bind:value={selectedRouteId}
                class="
                  w-full rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700
                  px-4 py-2.5
                  text-slate-900 dark:text-white
                  focus:border-accent focus:ring-2 focus:ring-accent/20
                  transition-colors
                "
              >
                <option value={null}>Select a route...</option>
                {#each routes as route}
                  <option value={route.id}>{route.name} (Class {route.difficulty_class})</option>
                {/each}
              </select>
            </div>
          {/if}

          <!-- Conditions -->
          <div>
            <label for="conditions" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Conditions
            </label>
            <div class="flex flex-wrap gap-2 mb-2">
              {#each conditionOptions as option}
                <button
                  type="button"
                  onclick={() => conditions = conditions === option ? '' : option}
                  class="
                    px-3 py-1.5 rounded-full text-sm border transition-all
                    {conditions === option
                      ? 'border-accent bg-accent/10 text-accent font-medium'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'}
                  "
                >
                  {option}
                </button>
              {/each}
            </div>
            <input
              type="text"
              id="conditions"
              bind:value={conditions}
              placeholder="Or type custom conditions..."
              class="
                w-full rounded-lg border border-slate-300 dark:border-slate-600
                bg-white dark:bg-slate-700
                px-4 py-2.5
                text-slate-900 dark:text-white text-sm
                focus:border-accent focus:ring-2 focus:ring-accent/20
                transition-colors
              "
            />
          </div>

          <!-- Notes -->
          <div>
            <label for="notes" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Notes / Story
            </label>
            <textarea
              id="notes"
              bind:value={notes}
              rows="3"
              placeholder="How was your climb? Any memorable moments?"
              class="
                w-full rounded-lg border border-slate-300 dark:border-slate-600
                bg-white dark:bg-slate-700
                px-4 py-2.5
                text-slate-900 dark:text-white text-sm
                focus:border-accent focus:ring-2 focus:ring-accent/20
                transition-colors resize-none
              "
            ></textarea>
          </div>

          <!-- Advanced (collapsible) -->
          <button
            type="button"
            onclick={() => showAdvanced = !showAdvanced}
            class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <svg
              class="h-4 w-4 transition-transform {showAdvanced ? 'rotate-90' : ''}"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            More details
          </button>

          {#if showAdvanced}
            <div class="grid grid-cols-2 gap-4 pl-6 animate-fade-in">
              <div>
                <label for="start-time" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  id="start-time"
                  bind:value={startTime}
                  class="
                    w-full rounded-lg border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-700
                    px-4 py-2.5
                    text-slate-900 dark:text-white
                    focus:border-accent focus:ring-2 focus:ring-accent/20
                    transition-colors
                  "
                />
              </div>
              <div>
                <label for="summit-time" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Summit Time
                </label>
                <input
                  type="time"
                  id="summit-time"
                  bind:value={summitTime}
                  class="
                    w-full rounded-lg border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-700
                    px-4 py-2.5
                    text-slate-900 dark:text-white
                    focus:border-accent focus:ring-2 focus:ring-accent/20
                    transition-colors
                  "
                />
              </div>
              <div>
                <label for="party-size" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                  Party Size
                </label>
                <input
                  type="number"
                  id="party-size"
                  bind:value={partySize}
                  min="1"
                  placeholder="# of people"
                  class="
                    w-full rounded-lg border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-700
                    px-4 py-2.5
                    text-slate-900 dark:text-white
                    focus:border-accent focus:ring-2 focus:ring-accent/20
                    transition-colors
                  "
                />
              </div>
            </div>
          {/if}

          <!-- Submit -->
          <button
            type="submit"
            disabled={isSubmitting}
            class="
              w-full rounded-lg py-3
              bg-accent
              text-white font-semibold
              hover:bg-accent-light
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300
              shadow-md hover:shadow-lg
            "
          >
            {#if isSubmitting}
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Logging...
              </span>
            {:else}
              Log Summit
            {/if}
          </button>
        </form>
      {:else}
        <!-- Summit History -->
        <div class="space-y-4">
          {#each existingSummits as summit}
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-semantic-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    <span class="font-medium text-slate-900 dark:text-white">
                      {formatDate(summit.date_summited)}
                    </span>
                  </div>
                  {#if summit.route_id}
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      via {getRouteName(summit.route_id)}
                    </p>
                  {/if}
                  {#if summit.conditions}
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {summit.conditions}
                    </p>
                  {/if}
                  {#if summit.notes}
                    <p class="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">
                      "{summit.notes}"
                    </p>
                  {/if}
                </div>
                {#if onDelete}
                  <button
                    onclick={() => handleDelete(summit.id)}
                    class="rounded-lg p-2 text-slate-400 hover:bg-semantic-danger/5 dark:hover:bg-semantic-danger/15 hover:text-semantic-danger transition-colors"
                    aria-label="Delete summit"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

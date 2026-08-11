<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  interface Peak {
    id: string;
    name: string;
    slug: string;
    elevation: number;
    range: string;
  }

  interface Props {
    peaks: Peak[];
    onClose: () => void;
  }

  let { peaks, onClose }: Props = $props();

  let title = $state('');
  let startDate = $state('');
  let endDate = $state('');
  let notes = $state('');
  let isPublic = $state(false);
  let selectedPeakIds = $state<string[]>([]);
  let searchQuery = $state('');
  let showPeakDropdown = $state(false);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Filter peaks based on search
  const filteredPeaks = $derived(
    peaks.filter(
      (p) =>
        !selectedPeakIds.includes(p.id) &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.range.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 10)
  );

  // Get selected peak objects
  const selectedPeaks = $derived(
    selectedPeakIds.map((id) => peaks.find((p) => p.id === id)).filter((p): p is Peak => !!p)
  );

  function addPeak(peakId: string) {
    selectedPeakIds = [...selectedPeakIds, peakId];
    searchQuery = '';
    showPeakDropdown = false;
  }

  function removePeak(peakId: string) {
    selectedPeakIds = selectedPeakIds.filter((id) => id !== peakId);
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  // Today's date for min attribute
  const today = new Date().toISOString().split('T')[0];
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Modal Backdrop -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
  onclick={handleBackdropClick}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <!-- Modal Content -->
  <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
      <h2 id="modal-title" class="text-xl font-semibold text-slate-900 dark:text-white">
        Plan a Trip
      </h2>
      <button
        type="button"
        onclick={onClose}
        class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Form -->
    <form
      method="POST"
      action="?/createTrip"
      class="flex-1 overflow-y-auto p-6 space-y-5"
      use:enhance={() => {
        loading = true;
        error = null;
        return async ({ result, update }) => {
          loading = false;
          if (result.type === 'success') {
            await invalidateAll();
            onClose();
          } else if (result.type === 'failure') {
            error = (result.data as { error?: string })?.error || 'Failed to create trip';
          } else {
            await update();
          }
        };
      }}
    >
      <!-- Error Message -->
      {#if error}
        <div class="p-3 rounded-lg bg-semantic-danger/5 dark:bg-semantic-danger/20 border border-semantic-danger/20 dark:border-semantic-danger-dark">
          <p class="text-sm text-semantic-danger-dark dark:text-semantic-danger-light">{error}</p>
        </div>
      {/if}

      <!-- Title -->
      <div>
        <label for="title" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Trip Name
        </label>
        <input
          type="text"
          id="title"
          name="title"
          bind:value={title}
          required
          placeholder="e.g., Summer Sawatch Adventure"
          class="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
        />
      </div>

      <!-- Dates -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="startDate" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            bind:value={startDate}
            required
            min={today}
            class="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
          />
        </div>
        <div>
          <label for="endDate" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            End Date <span class="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            bind:value={endDate}
            min={startDate || today}
            class="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
          />
        </div>
      </div>

      <!-- Peak Selection -->
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Peaks to Summit
        </label>

        <!-- Selected Peaks -->
        {#if selectedPeaks.length > 0}
          <div class="flex flex-wrap gap-2 mb-2">
            {#each selectedPeaks as peak}
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm font-medium">
                {peak.name}
                <button
                  type="button"
                  onclick={() => removePeak(peak.id)}
                  class="hover:text-accent-warm transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            {/each}
          </div>
        {/if}

        <!-- Peak Search -->
        <div class="relative">
          <input
            type="text"
            bind:value={searchQuery}
            onfocus={() => (showPeakDropdown = true)}
            placeholder="Search peaks to add..."
            class="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
          />

          <!-- Dropdown -->
          {#if showPeakDropdown && (searchQuery || filteredPeaks.length > 0)}
            <div class="absolute z-10 mt-1 w-full bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-lg max-h-48 overflow-y-auto">
              {#if filteredPeaks.length > 0}
                {#each filteredPeaks as peak}
                  <button
                    type="button"
                    onclick={() => addPeak(peak.id)}
                    class="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-between"
                  >
                    <span class="font-medium text-slate-900 dark:text-white">{peak.name}</span>
                    <span class="text-sm text-slate-500 dark:text-slate-400">{peak.range}</span>
                  </button>
                {/each}
              {:else}
                <div class="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No peaks found
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Hidden inputs for form submission -->
        {#each selectedPeakIds as peakId}
          <input type="hidden" name="peakIds" value={peakId} />
        {/each}
      </div>

      <!-- Notes -->
      <div>
        <label for="notes" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Notes <span class="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          bind:value={notes}
          rows="3"
          placeholder="Any notes about the trip..."
          class="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow resize-none"
        ></textarea>
      </div>

      <!-- Visibility -->
      <div class="flex items-center gap-3">
        <input type="hidden" name="is_public" value={isPublic ? 'true' : 'false'} />
        <button
          type="button"
          onclick={() => (isPublic = !isPublic)}
          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 {isPublic ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'}"
          role="switch"
          aria-checked={isPublic}
        >
          <span
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 {isPublic ? 'translate-x-5' : 'translate-x-0'}"
          ></span>
        </button>
        <label class="text-sm text-slate-700 dark:text-slate-300">
          Make this trip public
        </label>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title || !startDate || selectedPeakIds.length === 0}
          class="px-6 py-2.5 rounded-lg bg-accent text-mountain-navy font-medium hover:bg-accent-light transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if loading}
            <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          {:else}
            Create Trip
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>

<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import PeakCard from '$lib/components/peak/PeakCard.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  // Filter state
  let searchQuery = $state('');
  let selectedClass = $state<number | null>(null);
  let selectedRange = $state<string | null>(null);
  let hideSummited = $state(false);
  let sortBy = $state<'elevation-desc' | 'elevation-asc' | 'name' | 'difficulty'>('elevation-desc');

  // Get unique ranges
  const ranges = $derived([...new Set(data.peaks.map((p) => p.range))].sort());

  // Summited peak set for quick lookup
  const summitedSet = $derived(new Set(data.summitedPeakIds));

  // Filtered and sorted peaks
  let filteredPeaks = $derived(() => {
    let result = data.peaks.filter((peak) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = peak.name.toLowerCase().includes(query);
        const matchesRange = peak.range.toLowerCase().includes(query);
        if (!matchesName && !matchesRange) return false;
      }

      // Class filter
      if (selectedClass && peak.standard_route?.difficulty_class !== selectedClass) {
        return false;
      }

      // Range filter
      if (selectedRange && peak.range !== selectedRange) {
        return false;
      }

      // Hide summited
      if (hideSummited && summitedSet.has(peak.id)) {
        return false;
      }

      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'elevation-desc':
          return b.elevation - a.elevation;
        case 'elevation-asc':
          return a.elevation - b.elevation;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'difficulty':
          return (a.standard_route?.difficulty_class ?? 0) - (b.standard_route?.difficulty_class ?? 0);
        default:
          return 0;
      }
    });

    return result;
  });

  function clearFilters() {
    searchQuery = '';
    selectedClass = null;
    selectedRange = null;
    hideSummited = false;
    sortBy = 'elevation-desc';
  }

  const hasActiveFilters = $derived(
    searchQuery || selectedClass || selectedRange || hideSummited || sortBy !== 'elevation-desc'
  );

  const classOptions = [
    { value: null, label: 'All' },
    { value: 1, label: 'Class 1' },
    { value: 2, label: 'Class 2' },
    { value: 3, label: 'Class 3' },
    { value: 4, label: 'Class 4' }
  ];

  const sortOptions = [
    { value: 'elevation-desc', label: 'Elevation (High to Low)' },
    { value: 'elevation-asc', label: 'Elevation (Low to High)' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'difficulty', label: 'Difficulty (Easy to Hard)' }
  ];
</script>

<svelte:head>
  <title>All 58 Colorado 14ers | SaltGoat</title>
  <meta
    name="description"
    content="Browse all 58 Colorado fourteeners sorted by elevation. Filter by difficulty class and mountain range. Find your next summit."
  />
</svelte:head>

<Container class="py-8 sm:py-12">
  <!-- Header -->
  <div class="mb-10">
    <p class="eyebrow-accent mb-3">The complete list</p>
    <h1 class="heading-page text-slate-900 dark:text-white">
      Colorado's 14ers
    </h1>
    <p class="mt-4 text-lg text-slate-600 dark:text-slate-400">
      All {data.peaks.length} fourteeners, sorted by elevation
    </p>
  </div>

  <!-- Search Bar -->
  <div class="mb-6">
    <div class="relative">
      <svg class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search peaks by name or range..."
        class="
          w-full pl-12 pr-4 py-3 rounded-xl
          border border-slate-200 dark:border-slate-600
          bg-white dark:bg-slate-800
          text-slate-900 dark:text-white
          placeholder-slate-400 dark:placeholder-slate-500
          focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
          transition-all duration-200
        "
      />
      {#if searchQuery}
        <button
          onclick={() => searchQuery = ''}
          class="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Filters -->
  <div
    class="
      mb-8 p-4 sm:p-5 rounded-xl
      bg-slate-50 dark:bg-slate-800/50
      border border-slate-200 dark:border-slate-700
    "
  >
    <!-- Row 1: Class chips -->
    <div class="mb-5">
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        Difficulty
      </label>
      <div class="flex flex-wrap gap-2">
        {#each classOptions as option}
          <button
            onclick={() => (selectedClass = option.value)}
            class="
              px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200
              border
              {selectedClass === option.value
                ? option.value
                  ? `bg-class-${option.value} text-white border-class-${option.value}`
                  : 'bg-mountain-blue text-white border-mountain-blue dark:bg-white dark:text-mountain-navy dark:border-white'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}
            "
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Row 2: Dropdowns and toggles -->
    <div class="flex flex-wrap items-end gap-4">
      <!-- Range Filter -->
      <div class="flex-1 min-w-[180px]">
        <label
          for="range-filter"
          class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Mountain Range
        </label>
        <select
          id="range-filter"
          bind:value={selectedRange}
          class="
            w-full tap-target rounded-lg
            border border-slate-200 dark:border-slate-600
            bg-white dark:bg-slate-700
            px-4 py-2.5 text-sm
            text-slate-900 dark:text-white
            focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
            transition-all duration-200
          "
        >
          <option value={null}>All Ranges</option>
          {#each ranges as range}
            <option value={range}>{range}</option>
          {/each}
        </select>
      </div>

      <!-- Sort By -->
      <div class="flex-1 min-w-[180px]">
        <label
          for="sort-filter"
          class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Sort By
        </label>
        <select
          id="sort-filter"
          bind:value={sortBy}
          class="
            w-full tap-target rounded-lg
            border border-slate-200 dark:border-slate-600
            bg-white dark:bg-slate-700
            px-4 py-2.5 text-sm
            text-slate-900 dark:text-white
            focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
            transition-all duration-200
          "
        >
          {#each sortOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Hide Summited Toggle (only for logged-in users) -->
      {#if data.isLoggedIn}
        <div class="flex items-center gap-3 py-2">
          <button
            onclick={() => hideSummited = !hideSummited}
            class="
              relative w-11 h-6 rounded-full transition-colors duration-200
              {hideSummited ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'}
            "
            role="switch"
            aria-checked={hideSummited}
          >
            <span
              class="
                absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
                transition-transform duration-200
                {hideSummited ? 'translate-x-5' : 'translate-x-0'}
              "
            ></span>
          </button>
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
            Hide summited
            {#if hideSummited}
              <span class="text-slate-500 dark:text-slate-400">({summitedSet.size})</span>
            {/if}
          </span>
        </div>
      {/if}

      <!-- Clear Filters -->
      {#if hasActiveFilters}
        <button
          onclick={clearFilters}
          class="
            tap-target px-4 py-2.5 rounded-lg
            text-sm font-medium text-slate-600 dark:text-slate-400
            border border-slate-200 dark:border-slate-600
            hover:bg-slate-100 dark:hover:bg-slate-700
            transition-all duration-200
            flex items-center gap-2
          "
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Clear
        </button>
      {/if}
    </div>
  </div>

  <!-- Results count -->
  <p class="mb-6 text-sm text-slate-600 dark:text-slate-400">
    Showing <span class="font-semibold text-slate-900 dark:text-white">{filteredPeaks().length}</span>
    of {data.peaks.length} peaks
  </p>

  <!-- Peak List -->
  {#if filteredPeaks().length > 0}
    <div class="space-y-3">
      {#each filteredPeaks() as peak (peak.id)}
        <PeakCard {peak} />
      {/each}
    </div>
  {:else}
    <div
      class="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800"
    >
      <div
        class="mx-auto h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4"
      >
        <svg
          class="h-8 w-8 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <p class="text-lg font-medium text-slate-900 dark:text-white">No peaks match your filters</p>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Try adjusting your search criteria
      </p>
      <button
        onclick={clearFilters}
        class="mt-6 btn-primary"
      >
        Clear all filters
      </button>
    </div>
  {/if}
</Container>

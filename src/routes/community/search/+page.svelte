<script lang="ts">
  import { goto } from '$app/navigation';
  import Container from '$lib/components/ui/Container.svelte';
  import ForumBreadcrumb from '$lib/components/forum/ForumBreadcrumb.svelte';
  import { formatRelativeTime } from '$lib/utils/time';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let searchInput = $state(data.query);
  let selectedCategory = $state(data.category);

  // Debounced search
  let debounceTimer: ReturnType<typeof setTimeout>;

  function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      executeSearch();
    }, 400);
  }

  function handleCategoryChange() {
    executeSearch();
  }

  function executeSearch() {
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set('q', searchInput.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    const qs = params.toString();
    goto(`/community/search${qs ? `?${qs}` : ''}`, { replaceState: true, keepFocus: true });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      executeSearch();
    }
  }

  function formatSnippet(body: string): string {
    return body.replace(/[#*`>\[\]!_~]/g, '').slice(0, 160) + (body.length > 160 ? '...' : '');
  }

</script>

<svelte:head>
  <title>{data.query ? `"${data.query}" — Search` : 'Search'} | Community | SaltGoat</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
  <Container class="py-8 sm:py-10">
    <ForumBreadcrumb crumbs={[{ label: 'Search' }]} />

    <!-- Search controls -->
    <div class="mt-6 mb-8">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            bind:value={searchInput}
            oninput={handleInput}
            onkeydown={handleKeydown}
            placeholder="Search discussions..."
            class="
              w-full rounded-lg border border-slate-200 dark:border-slate-600
              bg-white dark:bg-slate-900/50
              text-slate-900 dark:text-white
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              pl-10 pr-3 py-2.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
              transition-colors
            "
          />
        </div>

        <select
          bind:value={selectedCategory}
          onchange={handleCategoryChange}
          class="
            rounded-lg border border-slate-200 dark:border-slate-600
            bg-white dark:bg-slate-900/50
            text-slate-700 dark:text-slate-300
            px-3 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
            transition-colors
          "
        >
          <option value="">All categories</option>
          {#each data.categories as cat}
            <option value={cat.slug}>{cat.name}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Results -->
    {#if data.query && data.results.length > 0}
      <div class="space-y-3">
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {data.results.length} result{data.results.length !== 1 ? 's' : ''} for "{data.query}"
        </p>

        {#each data.results as result}
          <a
            href="/community/{result.category_slug}/{result.topic_slug}"
            class="
              group block rounded-xl border border-slate-200 dark:border-slate-700
              bg-white dark:bg-slate-800/90 shadow-card
              transition-all duration-300
              hover:-translate-y-0.5 hover:shadow-card-hover
              p-4 sm:p-5
            "
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    {result.result_type === 'topic' ? 'Topic' : 'Reply'}
                  </span>
                  <span class="text-xs text-slate-400 dark:text-slate-500">
                    {formatRelativeTime(result.created_at)}
                  </span>
                </div>

                <h3 class="font-bold text-slate-900 dark:text-white group-hover:text-mountain-blue dark:group-hover:text-accent transition-colors">
                  {result.topic_title}
                </h3>

                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                  {formatSnippet(result.body)}
                </p>

                {#if result.author_display_name}
                  <div class="mt-2 flex items-center gap-1.5">
                    {#if result.author_avatar_url}
                      <img src={result.author_avatar_url} alt="" class="h-5 w-5 rounded-full" />
                    {/if}
                    <span class="text-xs text-slate-400 dark:text-slate-500">
                      {result.author_display_name}
                    </span>
                  </div>
                {/if}
              </div>

              <div class="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all duration-300 group-hover:bg-accent group-hover:text-white dark:bg-slate-700">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {:else if data.query && data.query.length >= 2}
      <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
        <svg class="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">No results found</h3>
        <p class="text-slate-500 dark:text-slate-400 text-sm">
          Try different keywords or browse the categories instead.
        </p>
      </div>
    {:else}
      <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
        <svg class="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p class="text-slate-500 dark:text-slate-400 text-sm">
          Enter at least 2 characters to search discussions.
        </p>
      </div>
    {/if}
  </Container>
</div>

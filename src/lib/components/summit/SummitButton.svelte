<script lang="ts">
  import type { UserSummit } from '$lib/server/summits';
  import { page } from '$app/stores';

  interface Props {
    summits: UserSummit[];
    isLoggedIn: boolean;
    onLogSummit: () => void;
  }

  let { summits, isLoggedIn, onLogSummit }: Props = $props();

  const hasSummited = $derived(summits.length > 0);
  const summitCount = $derived(summits.length);
  const latestSummit = $derived(summits[0]);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

{#if !isLoggedIn}
  <a
    href="/auth?redirectTo={encodeURIComponent($page.url.pathname)}"
    class="
      inline-flex items-center gap-2 rounded-lg
      border border-slate-200 dark:border-slate-600
      bg-white dark:bg-slate-800
      px-4 py-2
      text-sm font-medium text-slate-600 dark:text-slate-300
      hover:border-accent hover:text-accent
      transition-colors
    "
  >
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
    Log in to track
  </a>
{:else if hasSummited}
  <button
    onclick={onLogSummit}
    class="
      group inline-flex items-center gap-2 rounded-lg
      border border-semantic-success/20 dark:border-semantic-success-dark
      bg-semantic-success/5 dark:bg-semantic-success/20
      px-4 py-2
      text-sm font-medium text-semantic-success-dark dark:text-semantic-success-light
      hover:bg-semantic-success/10 dark:hover:bg-semantic-success/25
      hover:border-semantic-success-light dark:hover:border-semantic-success-dark
      transition-all
    "
  >
    <svg class="h-4 w-4 text-semantic-success" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
    </svg>
    <span class="flex flex-col items-start leading-tight">
      <span>
        Summited{#if summitCount > 1} {summitCount}x{/if}
      </span>
      <span class="text-xs text-semantic-success-dark dark:text-semantic-success-light">
        {formatDate(latestSummit.date_summited)}
      </span>
    </span>
    <svg
      class="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  </button>
{:else}
  <button
    onclick={onLogSummit}
    class="
      inline-flex items-center gap-2 rounded-lg
      bg-accent
      px-4 py-2
      text-sm font-medium text-white
      hover:bg-accent-light
      shadow-md hover:shadow-lg
      transition-all duration-300
      hover:scale-105
    "
  >
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
    Log Summit
  </button>
{/if}

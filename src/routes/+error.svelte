<script lang="ts">
  import { page } from '$app/stores';
  import Container from '$lib/components/ui/Container.svelte';
</script>

<svelte:head>
  <title>Error {$page.status} | SaltGoat</title>
</svelte:head>

<div class="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
  <Container class="py-16 text-center">
    <div class="animate-fade-in-up">
      <!-- Mountain icon -->
      <div class="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-mountain-blue/20 to-mountain-mist/20 flex items-center justify-center mb-8">
        <svg class="h-12 w-12 text-mountain-blue dark:text-mountain-mist" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
        </svg>
      </div>

      <!-- Error code -->
      <h1 class="text-6xl font-display font-normal text-slate-900 dark:text-white mb-4">
        {$page.status}
      </h1>

      <!-- Error message -->
      <p class="text-xl text-slate-600 dark:text-slate-400 mb-2">
        {#if $page.status === 404}
          Trail not found
        {:else if $page.status === 500}
          Something went wrong
        {:else}
          An error occurred
        {/if}
      </p>

      <p class="text-slate-500 dark:text-slate-500 mb-8 max-w-md mx-auto">
        {#if $page.status === 404}
          The peak you're looking for doesn't exist, or may have moved to a different location.
        {:else}
          {$page.error?.message || "We encountered an unexpected error. Please try again."}
        {/if}
      </p>

      <!-- Action buttons -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="/"
          class="
            inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
            bg-accent text-mountain-navy font-semibold
            hover:bg-accent-light transition-all shadow-md hover:shadow-lg
          "
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Home
        </a>
        <a
          href="/peaks"
          class="
            inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
            border border-slate-200 dark:border-slate-700
            text-slate-700 dark:text-slate-300 font-medium
            hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors
          "
        >
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
          </svg>
          Browse Peaks
        </a>
      </div>
    </div>
  </Container>
</div>

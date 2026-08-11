<script lang="ts">
  import StarRating from './StarRating.svelte';
  import type { ReviewWithProfile } from '$lib/server/reviews';

  interface Props {
    review: ReviewWithProfile;
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
  }

  let { review, isOwner = false, onEdit, onDelete }: Props = $props();

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatClimbDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }

  function getInitials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
</script>

<article class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-card">
  <!-- Header -->
  <div class="flex items-start justify-between gap-4">
    <div class="flex items-center gap-3">
      <!-- Avatar -->
      {#if review.profile?.avatar_url}
        <img
          src={review.profile.avatar_url}
          alt=""
          class="h-10 w-10 rounded-full object-cover"
        />
      {:else}
        <div class="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
          <span class="text-sm font-semibold text-white">
            {getInitials(review.profile?.display_name)}
          </span>
        </div>
      {/if}

      <div>
        <div class="font-semibold text-slate-900 dark:text-white">
          {review.profile?.display_name || 'Anonymous Hiker'}
        </div>
        <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <StarRating rating={review.rating} size="sm" />
          <span>·</span>
          <span>{formatDate(review.created_at || '')}</span>
        </div>
      </div>
    </div>

    <!-- Owner actions -->
    {#if isOwner}
      <div class="flex items-center gap-1">
        {#if onEdit}
          <button
            onclick={onEdit}
            class="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Edit review"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        {/if}
        {#if onDelete}
          <button
            onclick={onDelete}
            class="p-2 rounded-lg text-slate-400 hover:text-semantic-danger hover:bg-semantic-danger/5 dark:hover:bg-semantic-danger/15 transition-colors"
            aria-label="Delete review"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Climb context -->
  {#if review.date_climbed || review.conditions}
    <div class="mt-3 flex flex-wrap gap-2">
      {#if review.date_climbed}
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Climbed {formatClimbDate(review.date_climbed)}
        </span>
      {/if}
      {#if review.conditions}
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          {review.conditions}
        </span>
      {/if}
    </div>
  {/if}

  <!-- Review content -->
  {#if review.title}
    <h3 class="mt-4 font-semibold text-slate-900 dark:text-white">
      {review.title}
    </h3>
  {/if}

  {#if review.body}
    <p class="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed">
      {review.body}
    </p>
  {/if}
</article>

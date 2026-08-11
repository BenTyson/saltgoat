<script lang="ts">
  import StarRating from './StarRating.svelte';
  import type { UserReview } from '$lib/server/reviews';

  interface Props {
    existingReview?: UserReview | null;
    onSubmit: (data: ReviewFormData) => Promise<void>;
    onCancel?: () => void;
  }

  export interface ReviewFormData {
    rating: number;
    title: string | null;
    body: string | null;
    date_climbed: string | null;
    conditions: string | null;
  }

  let { existingReview = null, onSubmit, onCancel }: Props = $props();

  // Form state
  let rating = $state(existingReview?.rating || 0);
  let title = $state(existingReview?.title || '');
  let body = $state(existingReview?.body || '');
  let dateClimbed = $state(existingReview?.date_climbed || '');
  let conditions = $state(existingReview?.conditions || '');
  let isSubmitting = $state(false);
  let showOptional = $state(!!(existingReview?.date_climbed || existingReview?.conditions));

  const conditionOptions = [
    'Bluebird',
    'Partly cloudy',
    'Overcast',
    'Windy',
    'Rain/storms',
    'Snow',
    'Winter conditions'
  ];

  const isEditing = $derived(!!existingReview);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    if (rating === 0) {
      return; // Rating is required
    }

    isSubmitting = true;

    try {
      await onSubmit({
        rating,
        title: title.trim() || null,
        body: body.trim() || null,
        date_climbed: dateClimbed || null,
        conditions: conditions || null
      });

      // Reset form if not editing
      if (!isEditing) {
        rating = 0;
        title = '';
        body = '';
        dateClimbed = '';
        conditions = '';
        showOptional = false;
      }
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form
  onsubmit={handleSubmit}
  class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-card"
>
  <h3 class="font-semibold text-slate-900 dark:text-white mb-4">
    {isEditing ? 'Edit your review' : 'Write a review'}
  </h3>

  <!-- Rating (required) -->
  <div class="mb-4">
    <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
      Your rating *
    </label>
    <StarRating
      {rating}
      size="lg"
      interactive
      onRate={(r) => rating = r}
    />
    {#if rating === 0}
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Click to rate</p>
    {/if}
  </div>

  <!-- Title (optional) -->
  <div class="mb-4">
    <label for="review-title" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
      Title
    </label>
    <input
      type="text"
      id="review-title"
      bind:value={title}
      maxlength="100"
      placeholder="Sum up your experience..."
      class="
        w-full rounded-lg border border-slate-300 dark:border-slate-600
        bg-white dark:bg-slate-700
        px-4 py-2.5
        text-slate-900 dark:text-white
        placeholder:text-slate-400 dark:placeholder:text-slate-500
        focus:border-accent focus:ring-2 focus:ring-accent/20
        transition-colors
      "
    />
  </div>

  <!-- Body (optional) -->
  <div class="mb-4">
    <label for="review-body" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
      Your review
    </label>
    <textarea
      id="review-body"
      bind:value={body}
      rows="4"
      placeholder="Share details about your experience, the trail conditions, views, or tips for other hikers..."
      class="
        w-full rounded-lg border border-slate-300 dark:border-slate-600
        bg-white dark:bg-slate-700
        px-4 py-2.5
        text-slate-900 dark:text-white text-sm
        placeholder:text-slate-400 dark:placeholder:text-slate-500
        focus:border-accent focus:ring-2 focus:ring-accent/20
        transition-colors resize-none
      "
    ></textarea>
  </div>

  <!-- Optional fields toggle -->
  <button
    type="button"
    onclick={() => showOptional = !showOptional}
    class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-4"
  >
    <svg
      class="h-4 w-4 transition-transform {showOptional ? 'rotate-90' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
    Add climb details
  </button>

  {#if showOptional}
    <div class="space-y-4 pl-6 mb-4 animate-fade-in">
      <!-- Date climbed -->
      <div>
        <label for="date-climbed" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          When did you climb?
        </label>
        <input
          type="date"
          id="date-climbed"
          bind:value={dateClimbed}
          max={new Date().toISOString().split('T')[0]}
          class="
            w-full sm:w-auto rounded-lg border border-slate-300 dark:border-slate-600
            bg-white dark:bg-slate-700
            px-4 py-2.5
            text-slate-900 dark:text-white
            focus:border-accent focus:ring-2 focus:ring-accent/20
            transition-colors
          "
        />
      </div>

      <!-- Conditions -->
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          Conditions
        </label>
        <div class="flex flex-wrap gap-2">
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
      </div>
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex items-center gap-3 pt-2">
    <button
      type="submit"
      disabled={isSubmitting || rating === 0}
      class="
        px-5 py-2.5 rounded-lg
        bg-accent
        text-white font-medium
        hover:bg-accent-light
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-300
        shadow-md hover:shadow-lg
      "
    >
      {#if isSubmitting}
        <span class="flex items-center gap-2">
          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {isEditing ? 'Updating...' : 'Submitting...'}
        </span>
      {:else}
        {isEditing ? 'Update Review' : 'Submit Review'}
      {/if}
    </button>

    {#if onCancel}
      <button
        type="button"
        onclick={onCancel}
        class="px-5 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        Cancel
      </button>
    {/if}
  </div>
</form>

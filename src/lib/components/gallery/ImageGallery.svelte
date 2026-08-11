<script lang="ts">
  import Lightbox from './Lightbox.svelte';
  import { PHOTO_CATEGORIES } from '$lib/data/categories';
  import type { PeakImageWithUploader } from '$lib/server/images';

  interface Props {
    images: PeakImageWithUploader[];
    getImageUrl: (path: string) => string;
    currentUserId?: string;
    onFlag?: (imageId: string, reason: string) => Promise<void>;
  }

  let { images, getImageUrl, currentUserId, onFlag }: Props = $props();

  let selectedCategory = $state<string | null>(null);

  const categoryCounts = $derived(
    PHOTO_CATEGORIES.reduce((acc, cat) => {
      const count = images.filter(img => img.category === cat).length;
      if (count > 0) acc.set(cat, count);
      return acc;
    }, new Map<string, number>())
  );

  const availableCategories = $derived(
    PHOTO_CATEGORIES.filter(cat => categoryCounts.has(cat))
  );

  const filteredImages = $derived(
    selectedCategory ? images.filter(img => img.category === selectedCategory) : images
  );

  let lightboxOpen = $state(false);
  let currentIndex = $state(0);
  let flaggingImageId = $state<string | null>(null);
  let flagReason = $state('inappropriate');
  let flagSubmitting = $state(false);

  function openLightbox(index: number) {
    currentIndex = index;
    lightboxOpen = true;
  }

  function closeLightbox() {
    lightboxOpen = false;
  }

  function navigateLightbox(index: number) {
    currentIndex = index;
  }

  async function submitFlag() {
    if (!flaggingImageId || !onFlag) return;
    flagSubmitting = true;
    try {
      await onFlag(flaggingImageId, flagReason);
      flaggingImageId = null;
      flagReason = 'inappropriate';
    } finally {
      flagSubmitting = false;
    }
  }
</script>

<section class="mt-10 animate-fade-in-up" style="animation-delay: 250ms">
  <!-- Section Header -->
  <div class="flex items-center gap-3 mb-6">
    <h2 class="heading-section text-slate-900 dark:text-white">Photos</h2>
    {#if images.length > 0}
      <span class="text-sm text-slate-500 dark:text-slate-400">
        {filteredImages.length} {filteredImages.length === 1 ? 'photo' : 'photos'}
      </span>
    {/if}
  </div>

  {#if images.length > 0}
    <!-- Category Filter Chips -->
    {#if availableCategories.length > 1}
      <div class="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onclick={() => selectedCategory = null}
          class="
            flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            {selectedCategory === null
              ? 'bg-accent text-white'
              : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}
          "
        >
          All
          <span class="text-xs {selectedCategory === null ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}">{images.length}</span>
        </button>
        {#each availableCategories as cat}
          <button
            onclick={() => selectedCategory = selectedCategory === cat ? null : cat}
            class="
              flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              {selectedCategory === cat
                ? 'bg-accent text-white'
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}
            "
          >
            {cat}
            <span class="text-xs {selectedCategory === cat ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}">{categoryCounts.get(cat)}</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Image Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {#each filteredImages as image, i}
        <div class="group relative">
          <button
            onclick={() => openLightbox(i)}
            class="
              relative w-full aspect-square rounded-xl overflow-hidden
              bg-slate-100 dark:bg-slate-800
              hover:ring-2 hover:ring-accent hover:ring-offset-2 dark:hover:ring-offset-slate-900
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
            "
          >
            <img
              src={getImageUrl(image.storage_path)}
              alt={image.caption || 'Peak photo'}
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            <!-- Hover overlay with caption + uploader -->
            <div class="
              absolute inset-x-0 bottom-0 p-3
              bg-gradient-to-t from-black/70 to-transparent
              opacity-0 group-hover:opacity-100
              transition-opacity duration-200
            ">
              {#if image.caption}
                <p class="text-white text-sm line-clamp-1">{image.caption}</p>
              {/if}
              {#if image.uploader?.display_name}
                <p class="text-white/70 text-xs mt-0.5">{image.uploader.display_name}</p>
              {/if}
            </div>

            <!-- Expand icon -->
            <div class="
              absolute top-2 right-2
              p-1.5 rounded-full bg-black/30
              opacity-0 group-hover:opacity-100
              transition-opacity duration-200
            ">
              <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </button>

          <!-- Flag button (not on own photos) -->
          {#if onFlag && currentUserId && image.uploaded_by !== currentUserId}
            <button
              onclick={() => { flaggingImageId = image.id; }}
              class="
                absolute top-2 left-2
                p-1.5 rounded-full bg-black/30
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                text-white hover:bg-semantic-danger/80
              "
              title="Report photo"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </button>
          {/if}

          <!-- Category + uploader below image -->
          {#if image.category || image.uploader?.display_name}
            <div class="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              {#if image.category}
                <button
                  onclick={() => selectedCategory = selectedCategory === image.category ? null : image.category}
                  class="flex-shrink-0 font-medium text-slate-600 dark:text-slate-300 hover:text-accent transition-colors"
                >
                  {image.category}
                </button>
              {/if}
              {#if image.category && image.uploader?.display_name}
                <span class="text-slate-300 dark:text-slate-600">&middot;</span>
              {/if}
              {#if image.uploader?.display_name}
                <a
                  href="/users/{image.uploaded_by}"
                  class="truncate hover:text-accent transition-colors"
                >
                  {image.uploader.display_name}
                </a>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
      <div class="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
        <svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p class="text-slate-600 dark:text-slate-400">No photos yet. Be the first to share one!</p>
    </div>
  {/if}
</section>

<!-- Lightbox -->
{#if lightboxOpen}
  <Lightbox
    images={filteredImages}
    {currentIndex}
    {getImageUrl}
    onClose={closeLightbox}
    onNavigate={navigateLightbox}
    {currentUserId}
    {onFlag}
  />
{/if}

<!-- Flag Modal -->
{#if flaggingImageId}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
      <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Report Photo</h3>

      <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Reason</label>
      <select
        bind:value={flagReason}
        class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white mb-4"
      >
        <option value="inappropriate">Inappropriate content</option>
        <option value="spam">Spam</option>
        <option value="inaccurate">Wrong peak / inaccurate</option>
        <option value="other">Other</option>
      </select>

      <div class="flex gap-3">
        <button
          onclick={() => { flaggingImageId = null; }}
          class="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50"
        >
          Cancel
        </button>
        <button
          onclick={submitFlag}
          disabled={flagSubmitting}
          class="flex-1 px-4 py-2 rounded-lg bg-semantic-danger-dark text-white text-sm font-medium hover:bg-semantic-danger-dark disabled:opacity-50"
        >
          {flagSubmitting ? 'Reporting...' : 'Report'}
        </button>
      </div>
    </div>
  </div>
{/if}

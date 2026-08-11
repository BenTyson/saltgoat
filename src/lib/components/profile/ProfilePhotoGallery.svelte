<script lang="ts">
  import type { UserPhotoWithPeak } from '$lib/server/images';
  import Lightbox from '$lib/components/gallery/Lightbox.svelte';

  interface Props {
    photos: UserPhotoWithPeak[];
  }

  let { photos }: Props = $props();

  let lightboxOpen = $state(false);
  let lightboxIndex = $state(0);

  function openLightbox(index: number) {
    lightboxIndex = index;
    lightboxOpen = true;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Transform photos for lightbox
  const lightboxImages = $derived(
    photos.map((p) => ({
      url: p.url,
      caption: p.caption || p.peak.name
    }))
  );
</script>

{#if photos.length > 0}
  <!-- Photo Grid -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
    {#each photos as photo, i}
      <button
        type="button"
        onclick={() => openLightbox(i)}
        class="group relative aspect-square rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      >
        <img
          src={photo.url}
          alt={photo.caption || photo.peak.name}
          class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        <!-- Overlay on hover -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="absolute bottom-0 left-0 right-0 p-3">
            <p class="text-white font-medium text-sm truncate">{photo.peak.name}</p>
            {#if photo.caption}
              <p class="text-white/80 text-xs truncate mt-0.5">{photo.caption}</p>
            {/if}
          </div>
        </div>

        <!-- Peak badge (always visible) -->
        <div class="absolute top-2 left-2 flex items-center gap-1.5">
          <div class="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
            <a
              href="/peaks/{photo.peak.slug}"
              class="text-white text-xs font-medium hover:underline"
              onclick={(e) => e.stopPropagation()}
            >
              {photo.peak.name}
            </a>
          </div>
          {#if photo.is_private}
            <div class="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm flex items-center gap-1">
              <svg class="h-3 w-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span class="text-white/70 text-xs">Private</span>
            </div>
          {/if}
        </div>
      </button>
    {/each}
  </div>

  <!-- Lightbox -->
  {#if lightboxOpen}
    <Lightbox
      images={lightboxImages}
      currentIndex={lightboxIndex}
      onClose={() => (lightboxOpen = false)}
      onNavigate={(index) => (lightboxIndex = index)}
    />
  {/if}
{:else}
  <!-- Empty State -->
  <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center shadow-card">
    <div class="mx-auto h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
      <svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
    <h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">No photos yet</h3>
    <p class="text-slate-600 dark:text-slate-400 mb-6">
      Photos you upload to peak pages will appear here.
    </p>
    <a
      href="/peaks"
      class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-mountain-navy font-medium hover:bg-accent-light transition-all shadow-md hover:shadow-lg"
    >
      Browse Peaks
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </a>
  </div>
{/if}

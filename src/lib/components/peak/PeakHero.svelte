<script lang="ts">
  import type { Peak } from '$lib/types/database';

  interface Props {
    peak: Peak;
    showOverlay?: boolean;
    class?: string;
  }

  let { peak, showOverlay = true, class: className = '' }: Props = $props();

  let scrollY = $state(0);

  // Parallax calculation - image moves slower than scroll
  const parallaxOffset = $derived(scrollY * 0.4);
</script>

<svelte:window bind:scrollY />

<div class="relative h-72 sm:h-80 lg:h-96 overflow-hidden {className}">
  {#if peak.hero_image_url}
    <!-- Parallax image container -->
    <div
      class="absolute inset-0 -top-20 -bottom-20"
      style="transform: translateY({parallaxOffset}px)"
    >
      <img
        src={peak.hero_image_url}
        alt="{peak.name}, a Colorado 14er at {peak.elevation.toLocaleString()} feet"
        class="h-[140%] w-full object-cover object-top"
      />
    </div>
  {:else}
    <!-- Enhanced gradient placeholder -->
    <div
      class="absolute inset-0 bg-gradient-to-br from-mountain-navy via-mountain-blue to-mountain-mist"
    >
      <!-- Animated mountain shapes -->
      <svg
        class="absolute inset-0 h-full w-full opacity-20"
        preserveAspectRatio="none"
        viewBox="0 0 1200 400"
      >
        <path
          class="fill-white/10"
          d="M0,400 L0,250 L200,320 L400,200 L600,280 L800,150 L1000,220 L1200,180 L1200,400 Z"
        />
        <path
          class="fill-white/5"
          d="M0,400 L0,300 L150,350 L350,250 L550,320 L750,200 L950,270 L1200,230 L1200,400 Z"
        />
      </svg>

      <!-- Floating mountain icon -->
      <div class="absolute inset-0 flex items-center justify-center">
        <svg
          class="h-32 w-32 text-white/10 animate-float"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="0.5"
            d="M12 2L2 22h20L12 2z"
          />
        </svg>
      </div>
    </div>
  {/if}

  <!-- Multi-layer gradient overlays -->
  <div
    class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
  ></div>
  <div
    class="absolute inset-0 bg-gradient-to-r from-mountain-navy/40 via-transparent to-transparent"
  ></div>

  {#if showOverlay}
    <!-- Peak info overlay -->
    <div class="absolute inset-x-0 bottom-0 p-6 pb-24 sm:p-8 sm:pb-28">
      <div class="animate-fade-in-up">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60 mb-3">
          Colorado Fourteener
        </p>
        <h1 class="heading-page text-white drop-shadow-lg">{peak.name}</h1>
        <p
          class="mt-2 font-display text-3xl text-accent-light drop-shadow-md stats-number"
        >
          {peak.elevation.toLocaleString()}'
        </p>
      </div>
    </div>

    <!-- Rank badge -->
    <div class="absolute top-4 right-4 sm:top-6 sm:right-6">
      <div
        class="
          rounded-full bg-black/40 backdrop-blur-sm px-4 py-2
          text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90
        "
      >
        No. {peak.rank} of 58
      </div>
    </div>
  {/if}
</div>

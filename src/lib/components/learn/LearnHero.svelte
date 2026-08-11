<script lang="ts">
  interface Props {
    title: string;
    subtitle?: string;
    variant?: 'hub' | 'page';
  }

  let { title, subtitle, variant = 'page' }: Props = $props();

  const stats = [
    { value: '58', label: 'Peaks' },
    { value: "14,439'", label: 'Highest' },
    { value: '4', label: 'Classes' },
    { value: '7', label: 'Ranges' }
  ];
</script>

<div class="relative overflow-hidden bg-mountain-navy border-b border-white/10">
  <!-- Content -->
  <div class="relative px-4 {variant === 'hub' ? 'py-16 sm:py-24 md:py-28' : 'py-14 sm:py-18 md:py-20'}">
    <div class="max-w-4xl mx-auto text-center">
      <!-- Badge -->
      {#if variant === 'hub'}
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-light mb-5 animate-fade-in-up">
          The Complete Guide
        </p>
      {/if}

      <h1 class="text-4xl sm:text-5xl {variant === 'hub' ? 'md:text-6xl' : ''} font-display font-normal text-white tracking-tight animate-fade-in-up">
        {title}
      </h1>

      {#if subtitle}
        <p class="mt-4 sm:mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto animate-fade-in-up" style="animation-delay: 100ms">
          {subtitle}
        </p>
      {/if}

      <!-- Stats row for hub -->
      {#if variant === 'hub'}
        <div class="flex flex-wrap justify-center divide-x divide-white/15 mt-12 animate-fade-in-up" style="animation-delay: 200ms">
          {#each stats as stat}
            <div class="px-6 sm:px-10 py-1 text-center">
              <span class="stats-number font-display block text-2xl sm:text-3xl text-white">{stat.value}</span>
              <span class="block mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">{stat.label}</span>
            </div>
          {/each}
        </div>

        <!-- CTA Button -->
        <div class="mt-10 animate-fade-in-up" style="animation-delay: 300ms">
          <a
            href="#start"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-mountain-navy font-semibold hover:bg-accent-light transition-colors"
          >
            Start Learning
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      {/if}
    </div>
  </div>
</div>

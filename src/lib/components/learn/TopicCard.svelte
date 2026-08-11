<script lang="ts">
  interface Props {
    href: string;
    title: string;
    description: string;
    icon?: string;
    color?: 'accent' | 'blue' | 'green' | 'amber' | 'violet';
    comingSoon?: boolean;
    number?: number;
  }

  // icon/color are accepted for backwards compatibility but the editorial
  // card renders a numbered index instead of colored icon headers.
  let { href, title, description, comingSoon = false, number }: Props = $props();

  const numberLabel = $derived(number ? String(number).padStart(2, '0') : null);
</script>

{#if comingSoon}
  <div
    class="
      relative rounded-lg overflow-hidden
      bg-white dark:bg-slate-800/60
      border border-dashed border-slate-300 dark:border-slate-600
      p-5
    "
  >
    <div class="flex items-center justify-between mb-4">
      {#if numberLabel}
        <span class="stats-number font-display text-2xl text-slate-300 dark:text-slate-600">{numberLabel}</span>
      {:else}
        <span class="stats-number font-display text-2xl text-slate-300 dark:text-slate-600">—</span>
      {/if}
      <span class="eyebrow !text-[10px]">Coming soon</span>
    </div>
    <h3 class="font-display text-xl text-slate-500 dark:text-slate-400 mb-2">
      {title}
    </h3>
    <p class="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
      {description}
    </p>
  </div>
{:else}
  <a
    {href}
    class="
      group relative rounded-lg overflow-hidden
      bg-white dark:bg-slate-800/60
      border border-slate-200 dark:border-slate-700
      hover:border-accent/50 hover:shadow-card-hover
      transition-all duration-300
      p-5 flex flex-col
    "
  >
    <div class="flex items-center justify-between mb-4">
      {#if numberLabel}
        <span class="stats-number font-display text-2xl text-slate-300 dark:text-slate-600 group-hover:text-accent transition-colors">
          {numberLabel}
        </span>
      {:else}
        <span></span>
      {/if}
      <svg
        class="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-accent group-hover:translate-x-0.5 transition-all"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </div>
    <h3 class="font-display text-xl text-slate-900 dark:text-white group-hover:text-accent-dark dark:group-hover:text-accent transition-colors mb-2">
      {title}
    </h3>
    <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
      {description}
    </p>
  </a>
{/if}

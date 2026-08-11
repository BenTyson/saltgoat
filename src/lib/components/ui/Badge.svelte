<script lang="ts">
  interface Props {
    variant?: 'class-1' | 'class-2' | 'class-3' | 'class-4' | 'default' | 'gold';
    size?: 'sm' | 'md' | 'lg';
    glow?: boolean;
    class?: string;
    children: import('svelte').Snippet;
  }

  let {
    variant = 'default',
    size = 'md',
    glow = false,
    class: className = '',
    children
  }: Props = $props();

  const variants: Record<string, string> = {
    'class-1':
      'bg-class-1/15 text-class-1 border-class-1/30 dark:bg-class-1/25 dark:border-class-1/40',
    'class-2':
      'bg-class-2/15 text-class-2 border-class-2/30 dark:bg-class-2/25 dark:border-class-2/40',
    'class-3':
      'bg-class-3/15 text-class-3 border-class-3/30 dark:bg-class-3/25 dark:border-class-3/40',
    'class-4':
      'bg-class-4/15 text-class-4 border-class-4/30 dark:bg-class-4/25 dark:border-class-4/40',
    default:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
    gold: 'bg-gradient-to-r from-semantic-warning-light/20 to-accent/20 text-semantic-warning-dark border-semantic-warning-light/40 dark:text-semantic-warning-light dark:border-semantic-warning/40'
  };

  const sizes: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const glowVariants: Record<string, string> = {
    'class-1': 'shadow-glow-class-1',
    'class-2': 'shadow-glow-class-2',
    'class-3': 'shadow-glow-class-3',
    'class-4': 'shadow-glow-class-4',
    default: '',
    gold: 'shadow-glow-accent'
  };

  const isClassVariant = variant.startsWith('class-');
</script>

<span
  class="
    inline-flex items-center gap-1.5 rounded-full border font-medium
    transition-colors duration-200
    {variants[variant]}
    {sizes[size]}
    {glow ? glowVariants[variant] : ''}
    {className}
  "
>
  {#if isClassVariant}
    <span
      class="h-1.5 w-1.5 rounded-full bg-current"
    ></span>
  {/if}
  {@render children()}
</span>

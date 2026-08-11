<script lang="ts">
  import type { ForumAuthorProfile } from '$lib/server/forum';

  interface Props {
    author: ForumAuthorProfile;
    size?: 'sm' | 'md';
    class?: string;
  }

  let { author, size = 'md', class: className = '' }: Props = $props();

  const avatarSize = $derived(size === 'sm' ? 'h-8 w-8' : 'h-10 w-10');
  const nameSize = $derived(size === 'sm' ? 'text-sm' : 'text-sm');
</script>

<a
  href="/users/{author.id}"
  class="group flex items-center gap-2.5 min-w-0 {className}"
>
  {#if author.avatar_url}
    <img
      src={author.avatar_url}
      alt=""
      class="{avatarSize} rounded-full object-cover flex-shrink-0 ring-2 ring-transparent group-hover:ring-accent/30 transition-all"
    />
  {:else}
    <div class="{avatarSize} rounded-full bg-accent flex items-center justify-center flex-shrink-0 ring-2 ring-transparent group-hover:ring-accent/30 transition-all">
      <span class="text-white font-bold {size === 'sm' ? 'text-xs' : 'text-sm'}">
        {(author.display_name || 'H').charAt(0).toUpperCase()}
      </span>
    </div>
  {/if}

  <div class="min-w-0">
    <span class="{nameSize} font-medium text-slate-900 dark:text-white group-hover:text-accent dark:group-hover:text-accent-light transition-colors truncate block">
      {author.display_name || 'Anonymous Hiker'}
    </span>
    {#if author.summit_count > 0}
      <span class="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <svg class="h-3 w-3 text-accent" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
        </svg>
        {author.summit_count} summit{author.summit_count !== 1 ? 's' : ''}
      </span>
    {/if}
  </div>
</a>

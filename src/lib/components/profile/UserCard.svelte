<script lang="ts">
  import type { UserWithFollowStatus } from '$lib/server/follows';
  import { enhance } from '$app/forms';

  interface Props {
    user: UserWithFollowStatus;
    showFollowButton?: boolean;
    showOverlap?: boolean;
    isOwnProfile?: boolean;
  }

  let { user, showFollowButton = true, showOverlap = false, isOwnProfile = false }: Props = $props();

  let isFollowing = $state(user.is_following);
  let loading = $state(false);

  // Get initials for avatar fallback
  function getInitials(name: string | null): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
</script>

<div class="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card hover:shadow-card-hover transition-shadow">
  <!-- Avatar -->
  <a href="/users/{user.id}" class="flex-shrink-0">
    {#if user.avatar_url}
      <img
        src={user.avatar_url}
        alt={user.display_name || 'User'}
        class="w-12 h-12 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-600"
      />
    {:else}
      <div class="w-12 h-12 rounded-full bg-accent flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-600">
        <span class="text-white font-semibold text-sm">
          {getInitials(user.display_name)}
        </span>
      </div>
    {/if}
  </a>

  <!-- Info -->
  <div class="flex-1 min-w-0">
    <a href="/users/{user.id}" class="block">
      <h4 class="font-semibold text-slate-900 dark:text-white truncate hover:text-accent transition-colors">
        {user.display_name || 'Anonymous'}
      </h4>
    </a>

    {#if user.username}
      <p class="text-sm text-slate-500 dark:text-slate-400 truncate">
        @{user.username}
      </p>
    {/if}

    <div class="flex items-center gap-3 mt-1">
      <span class="text-xs text-slate-500 dark:text-slate-400">
        {user.summitCount} peaks
      </span>

      {#if showOverlap && user.peakOverlap}
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {user.peakOverlap} in common
        </span>
      {/if}
    </div>
  </div>

  <!-- Follow Button -->
  {#if showFollowButton && !isOwnProfile}
    <form
      method="POST"
      action="?/{isFollowing ? 'unfollow' : 'follow'}"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          await update();
          isFollowing = !isFollowing;
          loading = false;
        };
      }}
    >
      <input type="hidden" name="userId" value={user.id} />
      <button
        type="submit"
        disabled={loading}
        class="
          px-4 py-2 rounded-lg text-sm font-medium transition-all
          {isFollowing
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            : 'bg-accent text-mountain-navy hover:bg-accent-light shadow-sm hover:shadow'}
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {#if loading}
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        {:else}
          {isFollowing ? 'Following' : 'Follow'}
        {/if}
      </button>
    </form>
  {/if}
</div>

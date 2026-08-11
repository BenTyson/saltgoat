<script lang="ts">
  import type {
    ActivityItem,
    SummitActivity,
    ReviewActivity,
    TrailReportActivity,
    AchievementActivity
  } from '$lib/server/activity';
  import type { ReactionData } from '$lib/server/reactions';
  import type { CommentData } from '$lib/server/comments';
  import AchievementIcon from '$lib/components/ui/AchievementIcon.svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';

  interface Props {
    activities: ActivityItem[];
    showUser?: boolean;
    reactions?: Record<string, ReactionData>;
    comments?: Record<string, CommentData>;
    currentUserId?: string | null;
  }

  let {
    activities,
    showUser = false,
    reactions = {},
    comments = {},
    currentUserId = null
  }: Props = $props();

  // Track which summit comment sections are expanded
  let expandedComments = $state(new Set<string>());

  function toggleComments(summitId: string) {
    const next = new Set(expandedComments);
    if (next.has(summitId)) {
      next.delete(summitId);
    } else {
      next.add(summitId);
    }
    expandedComments = next;
  }

  // Extract the raw user_summits.id from the activity item id (format: "summit-{uuid}")
  function getSummitId(item: ActivityItem): string {
    return item.id.replace('summit-', '');
  }

  // Group activities by date
  function groupByDate(items: ActivityItem[]): Map<string, ActivityItem[]> {
    const groups = new Map<string, ActivityItem[]>();

    items.forEach((item) => {
      const date = new Date(item.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(item);
    });

    return groups;
  }

  const groupedActivities = $derived(groupByDate(activities));

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }

  function formatCommentTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Type guards
  function isSummit(data: ActivityItem['data']): data is SummitActivity {
    return 'date_summited' in data;
  }

  function isReview(data: ActivityItem['data']): data is ReviewActivity {
    return 'rating' in data;
  }

  function isTrailReport(data: ActivityItem['data']): data is TrailReportActivity {
    return 'trail_status' in data;
  }

  function isAchievement(data: ActivityItem['data']): data is AchievementActivity {
    return 'definition' in data;
  }

  // Trail status colors
  const trailStatusColors: Record<string, string> = {
    clear: 'bg-semantic-success/10 text-semantic-success-dark dark:bg-semantic-success/20 dark:text-semantic-success-light',
    muddy: 'bg-semantic-warning/10 text-semantic-warning-dark dark:bg-semantic-warning/20 dark:text-semantic-warning-light',
    snowy: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icy: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    mixed: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  };
</script>

<div class="space-y-6">
  {#each [...groupedActivities] as [date, items]}
    <div>
      <!-- Date Header -->
      <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        {getRelativeDate(items[0].date)}
      </h3>

      <!-- Activity Cards -->
      <div class="space-y-3">
        {#each items as item}
          {@const summitId = item.type === 'summit' ? getSummitId(item) : null}
          {@const reaction = summitId ? reactions[summitId] : null}
          {@const commentData = summitId ? comments[summitId] : null}
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card hover:shadow-card-hover transition-shadow">
            <div class="p-4">
            {#if showUser && item.user}
              <div class="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                {#if item.user.avatar_url}
                  <img src={item.user.avatar_url} alt="" class="w-6 h-6 rounded-full object-cover" />
                {:else}
                  <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                    <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                {/if}
                <a href="/users/{item.user.id}" class="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-accent transition-colors">
                  {item.user.display_name || 'Climber'}
                </a>
              </div>
            {/if}
            {#if item.type === 'summit' && isSummit(item.data)}
              <!-- Summit Activity -->
              <div class="flex items-start gap-4">
                <!-- Icon -->
                <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l7 9 7-9M5 21l7-9 7 9" />
                  </svg>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-slate-900 dark:text-white">Summited</span>
                    <a
                      href="/peaks/{item.data.peak.slug}"
                      class="font-semibold text-accent hover:text-accent-warm transition-colors"
                    >
                      {item.data.peak.name}
                    </a>
                  </div>

                  <div class="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span>{item.data.peak.elevation.toLocaleString()}ft</span>
                    {#if item.data.route}
                      <span class="flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-class-{item.data.route.difficulty_class}"></span>
                        {item.data.route.name}
                      </span>
                    {/if}
                  </div>

                  {#if item.data.conditions}
                    <p class="mt-2 text-sm text-slate-600 dark:text-slate-300 italic">
                      "{item.data.conditions}"
                    </p>
                  {/if}
                </div>

                <!-- Thumbnail -->
                {#if item.data.peak.thumbnail_url}
                  <img
                    src={item.data.peak.thumbnail_url}
                    alt={item.data.peak.name}
                    class="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                {/if}
              </div>

            {:else if item.type === 'review' && isReview(item.data)}
              <!-- Review Activity -->
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-semantic-warning/10 dark:bg-semantic-warning/20 flex items-center justify-center">
                  <svg class="w-5 h-5 text-semantic-warning-dark dark:text-semantic-warning-light" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-slate-900 dark:text-white">Reviewed</span>
                    <a
                      href="/peaks/{item.data.peak.slug}#reviews"
                      class="font-semibold text-accent hover:text-accent-warm transition-colors"
                    >
                      {item.data.peak.name}
                    </a>
                  </div>

                  <div class="flex items-center gap-1 mb-2">
                    {#each Array(5) as _, i}
                      <svg
                        class="w-4 h-4 {i < item.data.rating ? 'text-semantic-warning-light' : 'text-slate-300 dark:text-slate-600'}"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    {/each}
                  </div>

                  {#if item.data.title}
                    <p class="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {item.data.title}
                    </p>
                  {/if}

                  {#if item.data.body}
                    <p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
                      {item.data.body}
                    </p>
                  {/if}
                </div>
              </div>

            {:else if item.type === 'trail_report' && isTrailReport(item.data)}
              <!-- Trail Report Activity -->
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-semantic-success/10 dark:bg-semantic-success/20 flex items-center justify-center">
                  <svg class="w-5 h-5 text-semantic-success-dark dark:text-semantic-success-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-slate-900 dark:text-white">Trail report for</span>
                    <a
                      href="/peaks/{item.data.peak.slug}#conditions"
                      class="font-semibold text-accent hover:text-accent-warm transition-colors"
                    >
                      {item.data.peak.name}
                    </a>
                  </div>

                  <div class="flex items-center gap-2 flex-wrap">
                    {#if item.data.trail_status}
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium {trailStatusColors[item.data.trail_status] || trailStatusColors.mixed}">
                        {item.data.trail_status.charAt(0).toUpperCase() + item.data.trail_status.slice(1)}
                      </span>
                    {/if}

                    {#if item.data.hazards?.length}
                      {#each item.data.hazards.slice(0, 2) as hazard}
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-semantic-danger/10 text-semantic-danger-dark dark:bg-semantic-danger/20 dark:text-semantic-danger-light">
                          {hazard.replace('_', ' ')}
                        </span>
                      {/each}
                    {/if}
                  </div>

                  {#if item.data.notes}
                    <p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-2">
                      {item.data.notes}
                    </p>
                  {/if}
                </div>
              </div>

            {:else if item.type === 'achievement' && isAchievement(item.data)}
              <!-- Achievement Activity -->
              <div class="flex items-center gap-4 bg-gradient-to-r from-accent/5 to-accent-warm/5 -m-4 p-4 rounded-xl">
                <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-md">
                  <AchievementIcon icon={item.data.definition.icon} earned={true} class="w-6 h-6 text-white" />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-medium text-slate-900 dark:text-white">Earned achievement</span>
                  </div>
                  <p class="font-semibold text-accent">
                    {item.data.definition.title}
                  </p>
                  <p class="text-sm text-slate-500 dark:text-slate-400">
                    {item.data.definition.description}
                  </p>
                </div>

                <svg class="w-8 h-8 text-accent/30 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            {/if}
            </div>

            <!-- Social bar for summit items -->
            {#if item.type === 'summit' && summitId}
              <div class="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                <div class="flex items-center justify-between">
                  <!-- Congrats button + reactors -->
                  <div class="flex items-center gap-2">
                    {#if currentUserId}
                      <form
                        method="POST"
                        action="?/toggleReaction"
                        use:enhance={() => {
                          return async ({ update }) => {
                            await update();
                          };
                        }}
                      >
                        <input type="hidden" name="summitId" value={summitId} />
                        <button
                          type="submit"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors
                            {reaction?.hasReacted
                              ? 'bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light font-medium'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'}"
                          title={reaction?.hasReacted ? 'Remove congrats' : 'Send congrats'}
                        >
                          <!-- Hand-raised / congrats icon -->
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                          </svg>
                          Congrats
                          {#if reaction && reaction.count > 0}
                            <span class="text-xs font-medium">{reaction.count}</span>
                          {/if}
                        </button>
                      </form>
                    {:else if reaction && reaction.count > 0}
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                        </svg>
                        {reaction.count}
                      </span>
                    {/if}

                    <!-- Avatar stack of recent reactors -->
                    {#if reaction && reaction.recentReactors.length > 0}
                      <div class="flex -space-x-1.5">
                        {#each reaction.recentReactors as reactor}
                          {#if reactor.avatar_url}
                            <img
                              src={reactor.avatar_url}
                              alt={reactor.display_name || ''}
                              title={reactor.display_name || 'Climber'}
                              class="w-5 h-5 rounded-full border border-white dark:border-slate-800 object-cover"
                            />
                          {:else}
                            <div
                              class="w-5 h-5 rounded-full border border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-600 flex items-center justify-center"
                              title={reactor.display_name || 'Climber'}
                            >
                              <svg class="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          {/if}
                        {/each}
                        {#if reaction.count > reaction.recentReactors.length}
                          <div class="w-5 h-5 rounded-full border border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <span class="text-[9px] font-medium text-slate-500 dark:text-slate-400">+{reaction.count - reaction.recentReactors.length}</span>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <!-- Comment toggle -->
                  <button
                    type="button"
                    onclick={() => toggleComments(summitId)}
                    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors
                      {expandedComments.has(summitId)
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'}"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {#if commentData && commentData.count > 0}
                      <span class="text-xs font-medium">{commentData.count}</span>
                    {/if}
                  </button>
                </div>
              </div>

              <!-- Expanded comments section -->
              {#if expandedComments.has(summitId)}
                <div class="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/50">
                  <!-- Existing comments -->
                  {#if commentData && commentData.comments.length > 0}
                    <div class="space-y-3 pt-3">
                      {#each commentData.comments as comment}
                        <div class="flex gap-2.5">
                          {#if comment.user.avatar_url}
                            <img src={comment.user.avatar_url} alt="" class="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                          {:else}
                            <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          {/if}
                          <div class="flex-1 min-w-0">
                            <div class="flex items-baseline gap-2">
                              <a href="/users/{comment.user.id}" class="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-accent transition-colors">
                                {comment.user.display_name || 'Climber'}
                              </a>
                              <span class="text-xs text-slate-400 dark:text-slate-500">{formatCommentTime(comment.created_at)}</span>
                              {#if currentUserId === comment.user_id}
                                <form
                                  method="POST"
                                  action="?/deleteComment"
                                  class="ml-auto"
                                  use:enhance={() => {
                                    return async ({ update }) => {
                                      await update();
                                    };
                                  }}
                                >
                                  <input type="hidden" name="commentId" value={comment.id} />
                                  <button
                                    type="submit"
                                    class="text-slate-400 hover:text-semantic-danger transition-colors"
                                    title="Delete comment"
                                  >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </form>
                              {/if}
                            </div>
                            <p class="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{comment.body}</p>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="text-sm text-slate-400 dark:text-slate-500 pt-3">No comments yet</p>
                  {/if}

                  <!-- Add comment form -->
                  {#if currentUserId}
                    <form
                      method="POST"
                      action="?/addComment"
                      class="mt-3 flex gap-2"
                      use:enhance={() => {
                        return async ({ update }) => {
                          await update();
                        };
                      }}
                    >
                      <input type="hidden" name="summitId" value={summitId} />
                      <input
                        type="text"
                        name="body"
                        placeholder="Write a comment..."
                        maxlength="500"
                        required
                        class="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      />
                      <button
                        type="submit"
                        class="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-warm transition-colors flex-shrink-0"
                      >
                        Post
                      </button>
                    </form>
                  {/if}
                </div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}

  <!-- Empty State -->
  {#if activities.length === 0}
    <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center shadow-card">
      <div class="mx-auto h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
        <svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">No activity yet</h3>
      <p class="text-slate-600 dark:text-slate-400 mb-6">
        Your summit logs, reviews, trail reports, and achievements will appear here.
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
</div>

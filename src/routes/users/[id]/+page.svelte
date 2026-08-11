<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
  import ProfileStats from '$lib/components/profile/ProfileStats.svelte';
  import AchievementIcon from '$lib/components/ui/AchievementIcon.svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const profile = $derived(data.profile);
  const favoritePeak = $derived(data.favoritePeak);
  const stats = $derived(data.stats);
  const recentSummits = $derived(data.recentSummits);
  const achievements = $derived(data.achievements);
  const rangeStats = $derived(data.rangeStats);
  const isOwnProfile = $derived(data.isOwnProfile);
  const userIsPro = $derived(data.isPro);
  const summitReactions = $derived(data.summitReactions);
  const summitComments = $derived(data.summitComments);
  const currentUserId = $derived(data.currentUserId);
  const userForumTopics = $derived(data.userForumTopics);

  let expandedComments = $state(new Set<string>());

  function toggleCommentSection(summitId: string) {
    const next = new Set(expandedComments);
    if (next.has(summitId)) next.delete(summitId);
    else next.add(summitId);
    expandedComments = next;
  }

  // Quick stats for the stats bar
  const quickStats = $derived([
    { value: stats.uniquePeaks, label: 'Peaks' },
    { value: `${stats.progress.toFixed(0)}%`, label: 'Progress' },
    { value: stats.totalSummits, label: 'Summits' },
    { value: achievements.length, label: 'Badges' }
  ]);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  // Sort ranges by count
  const sortedRanges = $derived(
    Object.entries(rangeStats).sort((a, b) => b[1] - a[1])
  );
</script>

<svelte:head>
  <title>{profile.display_name || 'Climber'} | SaltGoat</title>
  <meta name="description" content="View {profile.display_name || 'this climber'}'s 14er progress on SaltGoat." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
  <!-- Profile Header -->
  <ProfileHeader
    {profile}
    {favoritePeak}
    isOwnProfile={isOwnProfile}
    isPro={userIsPro}
    onEditClick={isOwnProfile ? () => window.location.href = '/profile' : undefined}
  />

  <!-- Quick Stats Bar -->
  <ProfileStats stats={quickStats} />

  <!-- Content -->
  <Container class="py-8">
    <!-- Peak Bagger badge if completed all 58 -->
    {#if stats.uniquePeaks === 58}
      <div class="flex justify-center mb-8">
        <div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-accent-light to-accent text-mountain-navy font-bold shadow-lg">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
          </svg>
          Colorado 14er Peak Bagger
        </div>
      </div>
    {/if}

    <div class="grid lg:grid-cols-3 gap-8">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Achievements -->
        {#if achievements.length > 0}
          <section>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Achievements
              <span class="text-sm font-normal text-slate-500 dark:text-slate-400">
                ({achievements.length})
              </span>
            </h2>
            <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-card">
              <div class="flex flex-wrap gap-3">
                {#each achievements as achievement}
                  <div
                    class="
                      group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl
                      bg-gradient-to-br from-accent/10 via-accent-warm/5 to-accent/10
                      border border-accent/20
                    "
                    title={achievement.definition.description}
                  >
                    <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-accent shadow-sm">
                      <AchievementIcon icon={achievement.definition.icon} earned={true} class="text-white" />
                    </div>
                    <span class="font-medium text-slate-900 dark:text-white text-sm">{achievement.definition.title}</span>
                  </div>
                {/each}
              </div>
            </div>
          </section>
        {/if}

        <!-- Recent Summits -->
        {#if recentSummits.length > 0}
          <section>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Summits
            </h2>
            <div class="space-y-3">
              {#each recentSummits as summit}
                {@const peak = summit.peak as { name: string; slug: string; elevation: number; thumbnail_url: string | null }}
                {@const route = summit.route as { name: string; difficulty_class: number } | null}
                {@const reaction = summitReactions[summit.id]}
                {@const commentData = summitComments[summit.id]}
                <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
                  <a
                    href="/peaks/{peak.slug}"
                    class="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    {#if peak.thumbnail_url}
                      <img
                        src={peak.thumbnail_url}
                        alt={peak.name}
                        class="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    {:else}
                      <div class="w-14 h-14 rounded-lg bg-gradient-to-br from-mountain-blue to-mountain-mist flex items-center justify-center flex-shrink-0">
                        <svg class="h-7 w-7 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
                        </svg>
                      </div>
                    {/if}
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-slate-900 dark:text-white">{peak.name}</div>
                      <div class="text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(summit.date_summited)}
                        {#if route}
                          <span class="mx-1.5">·</span>
                          {route.name}
                        {/if}
                      </div>
                    </div>
                    <svg class="h-5 w-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>

                  <!-- Social bar -->
                  <div class="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        {#if currentUserId}
                          <form
                            method="POST"
                            action="?/toggleReaction"
                            use:enhance={() => {
                              return async ({ update }) => { await update(); };
                            }}
                          >
                            <input type="hidden" name="summitId" value={summit.id} />
                            <button
                              type="submit"
                              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors
                                {reaction?.hasReacted
                                  ? 'bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-light font-medium'
                                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'}"
                            >
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

                        {#if reaction && reaction.recentReactors.length > 0}
                          <div class="flex -space-x-1.5">
                            {#each reaction.recentReactors as reactor}
                              {#if reactor.avatar_url}
                                <img src={reactor.avatar_url} alt={reactor.display_name || ''} title={reactor.display_name || 'Climber'} class="w-5 h-5 rounded-full border border-white dark:border-slate-800 object-cover" />
                              {:else}
                                <div class="w-5 h-5 rounded-full border border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-600 flex items-center justify-center" title={reactor.display_name || 'Climber'}>
                                  <svg class="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                              {/if}
                            {/each}
                          </div>
                        {/if}
                      </div>

                      <button
                        type="button"
                        onclick={() => toggleCommentSection(summit.id)}
                        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors
                          {expandedComments.has(summit.id)
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

                  <!-- Expanded comments -->
                  {#if expandedComments.has(summit.id)}
                    <div class="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/50">
                      {#if commentData && commentData.comments.length > 0}
                        <div class="space-y-3 pt-3">
                          {#each commentData.comments as comment}
                            <div class="flex gap-2.5">
                              {#if comment.user.avatar_url}
                                <img src={comment.user.avatar_url} alt="" class="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                              {:else}
                                <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                              {/if}
                              <div class="flex-1 min-w-0">
                                <div class="flex items-baseline gap-2">
                                  <a href="/users/{comment.user.id}" class="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-accent transition-colors">{comment.user.display_name || 'Climber'}</a>
                                  <span class="text-xs text-slate-400 dark:text-slate-500">{formatCommentTime(comment.created_at)}</span>
                                  {#if currentUserId === comment.user_id}
                                    <form method="POST" action="?/deleteComment" class="ml-auto" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
                                      <input type="hidden" name="commentId" value={comment.id} />
                                      <button type="submit" class="text-slate-400 hover:text-semantic-danger transition-colors" title="Delete comment">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
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

                      {#if currentUserId}
                        <form method="POST" action="?/addComment" class="mt-3 flex gap-2" use:enhance={() => { return async ({ update }) => { await update(); }; }}>
                          <input type="hidden" name="summitId" value={summit.id} />
                          <input type="text" name="body" placeholder="Write a comment..." maxlength="500" required class="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent" />
                          <button type="submit" class="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-warm transition-colors flex-shrink-0">Post</button>
                        </form>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {:else}
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 text-center shadow-card">
            <div class="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
              <svg class="h-6 w-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
              </svg>
            </div>
            <p class="text-slate-600 dark:text-slate-400">No summits logged yet</p>
          </div>
        {/if}

        <!-- Discussions -->
        {#if userForumTopics.length > 0}
          <section>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Discussions
              <span class="text-sm font-normal text-slate-500 dark:text-slate-400">
                ({userForumTopics.length})
              </span>
            </h2>
            <div class="space-y-3">
              {#each userForumTopics as topic}
                <a
                  href="/community/general/{topic.slug}"
                  class="
                    group flex items-center justify-between gap-4 p-4
                    rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                    shadow-card hover:-translate-y-0.5 hover:shadow-card-hover
                    transition-all duration-300
                  "
                >
                  <div class="min-w-0 flex-1">
                    <h3 class="font-medium text-slate-900 dark:text-white group-hover:text-mountain-blue dark:group-hover:text-accent transition-colors truncate">
                      {topic.title}
                    </h3>
                    <div class="mt-1 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <span class="flex items-center gap-1">
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {topic.reply_count} replies
                      </span>
                      {#if topic.peak}
                        <span class="flex items-center gap-1 text-class-1">
                          <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
                          </svg>
                          {topic.peak.name}
                        </span>
                      {/if}
                    </div>
                  </div>
                  <div class="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all duration-300 group-hover:bg-accent group-hover:text-white dark:bg-slate-700">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              {/each}
            </div>
          </section>
        {/if}
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Progress by Range -->
        {#if sortedRanges.length > 0}
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-card">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              Peaks by Range
            </h3>
            <div class="space-y-3">
              {#each sortedRanges as [range, count]}
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-600 dark:text-slate-300 truncate">{range}</span>
                  <span class="text-sm font-semibold text-slate-900 dark:text-white ml-2">{count}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Quick Stats -->
        <div class="rounded-xl bg-gradient-to-br from-accent/10 to-accent-warm/10 border border-accent/20 p-6">
          <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Quick Stats</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-600 dark:text-slate-400">Peaks Remaining</span>
              <span class="font-semibold text-slate-900 dark:text-white">{58 - stats.uniquePeaks}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600 dark:text-slate-400">Repeat Summits</span>
              <span class="font-semibold text-slate-900 dark:text-white">{stats.totalSummits - stats.uniquePeaks}</span>
            </div>
            {#if stats.uniquePeaks > 0}
              <div class="flex justify-between">
                <span class="text-slate-600 dark:text-slate-400">Avg Elevation</span>
                <span class="font-semibold text-slate-900 dark:text-white">{Math.round(stats.totalElevation / stats.uniquePeaks).toLocaleString()}'</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Edit Profile Link (own profile) -->
        {#if isOwnProfile}
          <a
            href="/profile"
            class="block w-full text-center px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            Go to Full Profile
          </a>
        {/if}
      </div>
    </div>
  </Container>
</div>

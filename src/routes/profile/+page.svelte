<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import ProfileHeader from '$lib/components/profile/ProfileHeader.svelte';
  import ProfileTabs from '$lib/components/profile/ProfileTabs.svelte';
  import ProfileStats from '$lib/components/profile/ProfileStats.svelte';
  import EditProfileModal from '$lib/components/profile/EditProfileModal.svelte';
  import Achievements from '$lib/components/profile/Achievements.svelte';
  import ActivityFeed from '$lib/components/profile/ActivityFeed.svelte';
  import ProfilePhotoGallery from '$lib/components/profile/ProfilePhotoGallery.svelte';
  import BuddiesTab from '$lib/components/profile/BuddiesTab.svelte';
  import TripsTab from '$lib/components/profile/TripsTab.svelte';
  import AdvancedStats from '$lib/components/profile/AdvancedStats.svelte';
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import { createBrowserClient } from '@supabase/ssr';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const profile = $derived(data.profile);
  const favoritePeak = $derived(data.favoritePeak);
  const subscription = $derived($page.data.subscription);
  const peaksForSelector = $derived(data.peaksForSelector);
  const activeTab = $derived(data.activeTab);
  let isPublic = $state(data.profile?.is_public ?? true);
  let saving = $state(false);
  let editModalOpen = $state(false);

  const stats = $derived(data.summitStats);
  const allPeaks = $derived(data.allPeaks);
  const summitedPeaks = $derived(data.summitedPeaksMap);
  const rangeStats = $derived(data.rangeStats);
  const classStats = $derived(data.classStats);
  const peakClassMap = $derived(data.peakClassMap);
  const userAchievements = $derived(data.userAchievements);

  // Tab-specific data
  const activityFeed = $derived(data.activityFeed);
  const userPhotos = $derived(data.userPhotos);
  const followStats = $derived(data.followStats);
  const following = $derived(data.following);
  const followers = $derived(data.followers);
  const suggestions = $derived(data.suggestions);
  const pastTrips = $derived(data.pastTrips);
  const plannedTrips = $derived(data.plannedTrips);
  const watchlist = $derived(data.watchlist);
  const advancedStats = $derived(data.advancedStats);
  const summitReactions = $derived(data.summitReactions);
  const summitComments = $derived(data.summitComments);
  const currentUserId = $derived(data.currentUserId);

  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

  // Tabs configuration
  const tabs = $derived([
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'photos', label: 'Photos' },
    { id: 'trips', label: 'Trips' },
    { id: 'buddies', label: 'Buddies' }
  ]);

  // Quick stats for the stats bar
  const quickStats = $derived([
    { value: stats.uniquePeaks, label: 'Peaks' },
    { value: `${stats.progress.toFixed(0)}%`, label: 'Progress' },
    { value: stats.totalSummits, label: 'Summits' },
    { value: userAchievements.length, label: 'Badges' }
  ]);

  // Color map for difficulty classes
  const classColors: Record<number, string> = {
    1: 'bg-class-1',
    2: 'bg-class-2',
    3: 'bg-class-3',
    4: 'bg-class-4'
  };

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Get ranges sorted by summited count (descending)
  const sortedRanges = $derived(
    Object.entries(rangeStats)
      .sort((a, b) => b[1].summited - a[1].summited || b[1].total - a[1].total)
  );

  async function handleSaveProfile(updates: Record<string, unknown>) {
    if (!supabase || !profile) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) throw new Error(error.message);

    await invalidateAll();
  }
</script>

<svelte:head>
  <title>My Profile | SaltGoat</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-slate-900">
  <!-- Profile Header -->
  {#if profile}
    <ProfileHeader
      {profile}
      {favoritePeak}
      isOwnProfile={true}
      isPro={subscription?.plan === 'pro' && subscription?.status === 'active'}
      onEditClick={() => editModalOpen = true}
    />
  {/if}

  <!-- Quick Stats Bar -->
  <ProfileStats stats={quickStats} />

  <!-- Tabs -->
  <ProfileTabs {tabs} {activeTab} baseUrl="/profile" />

  <!-- Tab Content -->
  <Container class="py-8">
    {#if activeTab === 'overview'}
      <!-- Settings Row -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Summit Progress</h2>

        <div class="flex items-center gap-4">
          <!-- Privacy Toggle -->
          <form
            method="POST"
            action="?/updatePrivacy"
            use:enhance={() => {
              saving = true;
              return async ({ update }) => {
                await update();
                saving = false;
              };
            }}
          >
            <input type="hidden" name="is_public" value={isPublic ? 'false' : 'true'} />
            <button
              type="submit"
              disabled={saving}
              class="flex items-center gap-3 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
              onclick={() => { isPublic = !isPublic; }}
            >
              <span class="text-slate-600 dark:text-slate-300">Public Profile</span>
              <div class="relative w-10 h-6 rounded-full transition-colors {isPublic ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'}">
                <div class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform {isPublic ? 'translate-x-4' : 'translate-x-0'}"></div>
              </div>
            </button>
          </form>

          {#if isPublic && profile?.id}
            <a
              href="/users/{profile.id}"
              class="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-warm transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Public Profile
            </a>
          {/if}
        </div>
      </div>

      <!-- Journey Stats -->
      {#if stats.totalSummits > 0}
        <div class="border-y border-slate-200 dark:border-slate-700/70 py-6 mb-8">
          <h3 class="eyebrow-accent mb-5">Journey Stats</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div class="stats-number font-display text-3xl text-slate-900 dark:text-white">
                {stats.totalElevationGain.toLocaleString()}'
              </div>
              <div class="text-sm text-slate-600 dark:text-slate-400">Total Elevation Gained</div>
            </div>
            <div>
              <div class="stats-number font-display text-3xl text-slate-900 dark:text-white">
                {stats.totalDistanceMiles.toFixed(1)} mi
              </div>
              <div class="text-sm text-slate-600 dark:text-slate-400">Total Distance Hiked</div>
            </div>
            {#if stats.highestPeak}
              <div>
                <div class="stats-number font-display text-3xl text-slate-900 dark:text-white">
                  {stats.highestPeak.elevation.toLocaleString()}'
                </div>
                <div class="text-sm text-slate-600 dark:text-slate-400">
                  Highest: {stats.highestPeak.name}
                </div>
              </div>
            {/if}
            <div>
              <div class="stats-number font-display text-3xl text-slate-900 dark:text-white">
                {stats.avgElevation.toLocaleString()}'
              </div>
              <div class="text-sm text-slate-600 dark:text-slate-400">Avg Peak Elevation</div>
            </div>
          </div>
        </div>
      {/if}

      <!-- The Grid -->
      <section class="mb-8">
        <div class="flex items-center gap-5 mb-4">
          <h2 class="heading-section text-slate-900 dark:text-white">The 58</h2>
          <div class="rule-line"></div>
        </div>
        <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-card">
          <div class="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 gap-1.5 sm:gap-2">
            {#each allPeaks as peak}
              {@const isSummited = peak.id in summitedPeaks}
              {@const diffClass = peakClassMap[peak.id] || 1}
              <a
                href="/peaks/{peak.slug}"
                class="
                  group relative aspect-square rounded-md transition-all duration-200
                  {isSummited
                    ? `${classColors[diffClass]} hover:scale-110 shadow-sm`
                    : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}
                "
              >
                {#if isSummited}
                  <span class="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {peak.rank}
                  </span>
                {:else}
                  <span class="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[10px] font-medium">
                    {peak.rank}
                  </span>
                {/if}
                <!-- Tooltip -->
                <span class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md">
                  {peak.name}
                  <span class="text-slate-400 ml-0.5">{peak.elevation.toLocaleString()}'</span>
                </span>
              </a>
            {/each}
          </div>
          <!-- Legend -->
          <div class="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm">
            <span class="text-slate-500 dark:text-slate-400">Legend:</span>
            <div class="flex items-center gap-1.5">
              <div class="w-4 h-4 rounded bg-class-1"></div>
              <span class="text-slate-600 dark:text-slate-300">Class 1</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-4 h-4 rounded bg-class-2"></div>
              <span class="text-slate-600 dark:text-slate-300">Class 2</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-4 h-4 rounded bg-class-3"></div>
              <span class="text-slate-600 dark:text-slate-300">Class 3</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-4 h-4 rounded bg-class-4"></div>
              <span class="text-slate-600 dark:text-slate-300">Class 4</span>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700"></div>
              <span class="text-slate-600 dark:text-slate-300">Not summited</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Achievements -->
      <Achievements
        uniquePeaks={stats.uniquePeaks}
        {rangeStats}
        {classStats}
        earnedAchievements={userAchievements}
      />

      <div class="grid md:grid-cols-2 gap-6 mt-8">
        <!-- Class Progress -->
        <section>
          <h2 class="heading-section text-slate-900 dark:text-white mb-4">By difficulty</h2>
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-card space-y-4">
            {#each [1, 2, 3, 4] as classNum}
              {@const classData = classStats[classNum]}
              {@const pct = classData.total > 0 ? (classData.summited / classData.total) * 100 : 0}
              <div>
                <div class="flex justify-between text-sm mb-1.5">
                  <span class="font-medium text-slate-700 dark:text-slate-200">Class {classNum}</span>
                  <span class="text-slate-500 dark:text-slate-400">{classData.summited}/{classData.total}</span>
                </div>
                <div class="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    class="{classColors[classNum]} h-full rounded-full transition-all duration-500"
                    style="width: {pct}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </section>

        <!-- Range Progress -->
        <section>
          <h2 class="heading-section text-slate-900 dark:text-white mb-4">By range</h2>
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-card space-y-4 max-h-[320px] overflow-y-auto">
            {#each sortedRanges as [range, rangeData]}
              {@const pct = rangeData.total > 0 ? (rangeData.summited / rangeData.total) * 100 : 0}
              <div>
                <div class="flex justify-between text-sm mb-1.5">
                  <span class="font-medium text-slate-700 dark:text-slate-200 truncate">{range}</span>
                  <span class="text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">{rangeData.summited}/{rangeData.total}</span>
                </div>
                <div class="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    class="bg-accent h-full rounded-full transition-all duration-500"
                    style="width: {pct}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </section>
      </div>

      <!-- Watched Peaks -->
      {#if watchlist.length > 0}
        <section class="mt-8">
          <div class="flex items-center gap-5 mb-4">
            <h2 class="heading-section text-slate-900 dark:text-white">Watched peaks</h2>
            <div class="rule-line"></div>
          </div>
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
            <div class="divide-y divide-slate-200 dark:divide-slate-700">
              {#each watchlist as item}
                <div class="flex items-center gap-4 p-4">
                  <a
                    href="/peaks/{item.peak.slug}"
                    class="flex-1 flex items-center gap-3 hover:text-accent transition-colors min-w-0"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-slate-900 dark:text-white">{item.peak.name}</div>
                      <div class="text-sm text-slate-500 dark:text-slate-400">
                        {item.peak.elevation.toLocaleString()}' -- {item.peak.range}
                      </div>
                    </div>
                    {#if item.conditions}
                      <div class="text-right text-sm flex-shrink-0">
                        {#if item.conditions.high_f !== null}
                          <span class="font-medium text-slate-700 dark:text-slate-300">{item.conditions.high_f}°</span>
                          <span class="text-slate-400 dark:text-slate-500">/</span>
                          <span class="text-slate-500 dark:text-slate-400">{item.conditions.low_f}°</span>
                        {/if}
                      </div>
                    {/if}
                  </a>
                  <form
                    method="POST"
                    action="?/removeFromWatchlist"
                    use:enhance={() => {
                      return async ({ update }) => {
                        await update();
                      };
                    }}
                  >
                    <input type="hidden" name="peakId" value={item.peak_id} />
                    <button
                      type="submit"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-semantic-danger hover:bg-semantic-danger/5 dark:hover:bg-semantic-danger/15 transition-colors"
                      title="Remove from watchlist"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          </div>
        </section>
      {/if}

      <!-- Advanced Stats -->
      {#if advancedStats}
        <section class="mt-8">
          <div class="flex items-center gap-5 mb-4">
            <h2 class="heading-section text-slate-900 dark:text-white">Advanced stats</h2>
            <span class="px-2 py-0.5 rounded-full bg-accent text-mountain-navy text-[10px] font-semibold uppercase tracking-[0.14em]">Pro</span>
            <div class="rule-line"></div>
          </div>
          <AdvancedStats stats={advancedStats} />
          <div class="mt-4 flex justify-end">
            <a
              href="/api/export/summits"
              download
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Summit History
            </a>
          </div>
        </section>
      {:else if subscription?.plan !== 'pro'}
        <section class="mt-8">
          <div class="rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div class="mx-auto h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <svg class="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-1">Advanced Stats</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Upgrade to Pro for pace trends, seasonal analysis, personal records, and more.
            </p>
            <a
              href="/pricing"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-mountain-navy text-sm font-semibold hover:bg-accent-light transition-colors"
            >
              Upgrade to Pro
            </a>
          </div>
        </section>
      {/if}

      <!-- Recent Summits -->
      {#if stats.recentSummits.length > 0}
        <section class="mt-8">
          <div class="flex items-center gap-5 mb-4">
            <h2 class="heading-section text-slate-900 dark:text-white">Recent summits</h2>
            <div class="rule-line"></div>
          </div>
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
            <div class="divide-y divide-slate-200 dark:divide-slate-700">
              {#each stats.recentSummits as summit}
                <a
                  href="/peaks/{summit.peak.slug}"
                  class="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {#if summit.peak.thumbnail_url}
                    <img
                      src={summit.peak.thumbnail_url}
                      alt={summit.peak.name}
                      class="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  {:else}
                    <div class="w-16 h-16 rounded-lg bg-mountain-slate flex items-center justify-center flex-shrink-0">
                      <svg class="h-8 w-8 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
                      </svg>
                    </div>
                  {/if}
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-slate-900 dark:text-white">{summit.peak.name}</div>
                    <div class="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(summit.date_summited)}
                      {#if summit.route}
                        <span class="mx-1.5">·</span>
                        {summit.route.name}
                      {/if}
                    </div>
                    {#if summit.conditions}
                      <div class="text-sm text-slate-500 dark:text-slate-400">{summit.conditions}</div>
                    {/if}
                  </div>
                  <svg class="h-5 w-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              {/each}
            </div>
          </div>
        </section>
      {:else}
        <section class="mt-8">
          <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 sm:p-12 shadow-card">
            <div class="max-w-lg mx-auto text-center mb-8">
              <div class="mx-auto h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <svg class="h-8 w-8 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">Welcome to SaltGoat!</h3>
              <p class="text-slate-600 dark:text-slate-400">
                Here's how to get started on your 14er journey:
              </p>
            </div>

            <div class="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <a href="/peaks" class="group p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-accent/40 transition-colors text-center">
                <div class="mx-auto h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                  <span class="text-accent font-bold">1</span>
                </div>
                <div class="font-medium text-slate-900 dark:text-white text-sm group-hover:text-accent transition-colors">Find a peak</div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Browse all 58 fourteeners</div>
              </a>
              <a href="/learn/first-fourteener" class="group p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-accent/40 transition-colors text-center">
                <div class="mx-auto h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                  <span class="text-accent font-bold">2</span>
                </div>
                <div class="font-medium text-slate-900 dark:text-white text-sm group-hover:text-accent transition-colors">Prepare</div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Read our first-timer guide</div>
              </a>
              <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-center">
                <div class="mx-auto h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                  <span class="text-accent font-bold">3</span>
                </div>
                <div class="font-medium text-slate-900 dark:text-white text-sm">Log your summit</div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">Track progress + earn badges</div>
              </div>
            </div>

            <div class="text-center">
              <a
                href="/peaks"
                class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-mountain-navy font-semibold hover:bg-accent-light transition-colors"
              >
                Browse Peaks
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      {/if}

    {:else if activeTab === 'activity'}
      <!-- Activity Tab -->
      <ActivityFeed activities={activityFeed} reactions={summitReactions} comments={summitComments} {currentUserId} />

    {:else if activeTab === 'photos'}
      <!-- Photos Tab -->
      <ProfilePhotoGallery photos={userPhotos} />

    {:else if activeTab === 'trips'}
      <!-- Trips Tab -->
      <TripsTab
        {pastTrips}
        {plannedTrips}
        peaks={allPeaks}
        isOwnProfile={true}
      />

    {:else if activeTab === 'buddies'}
      <!-- Buddies Tab -->
      <BuddiesTab
        {followStats}
        {following}
        {followers}
        {suggestions}
        isOwnProfile={true}
        currentUserId={profile?.id}
      />
    {/if}
  </Container>
</div>

<!-- Edit Profile Modal -->
{#if profile && supabase}
  <EditProfileModal
    open={editModalOpen}
    {profile}
    peaks={peaksForSelector}
    {supabase}
    onClose={() => editModalOpen = false}
    onSave={handleSaveProfile}
  />
{/if}

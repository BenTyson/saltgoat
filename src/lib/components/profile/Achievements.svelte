<script lang="ts">
  import { ACHIEVEMENTS, ACHIEVEMENT_MAP, type AchievementDef } from '$lib/data/achievements';
  import AchievementIcon from '$lib/components/ui/AchievementIcon.svelte';

  // Type for earned achievements from the database
  interface EarnedAchievement {
    id: string;
    user_id: string;
    achievement_id: string;
    earned_at: string;
    notified: boolean;
    definition: AchievementDef;
  }

  interface Props {
    uniquePeaks: number;
    rangeStats: Record<string, { total: number; summited: number }>;
    classStats: Record<number, { total: number; summited: number }>;
    earnedAchievements: EarnedAchievement[];
  }

  let { uniquePeaks, rangeStats, classStats, earnedAchievements }: Props = $props();

  // Format earned date
  function formatEarnedDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Calculate in-progress achievements (not yet earned)
  const inProgressAchievements = $derived(() => {
    const earnedIds = new Set(earnedAchievements.map(a => a.achievement_id));
    const inProgress: Array<{ def: AchievementDef; current: number; total: number }> = [];

    // Milestone progress
    const milestones = [
      { id: 'first_summit', count: 1 },
      { id: 'summit_10', count: 10 },
      { id: 'summit_25', count: 25 },
      { id: 'summit_29', count: 29 },
      { id: 'summit_50', count: 50 },
      { id: 'summit_58', count: 58 }
    ];

    for (const m of milestones) {
      if (!earnedIds.has(m.id) && uniquePeaks > 0 && uniquePeaks < m.count) {
        const def = ACHIEVEMENT_MAP.get(m.id);
        if (def) {
          inProgress.push({ def, current: uniquePeaks, total: m.count });
        }
      }
    }

    // Range progress
    const ranges = [
      { range: 'Sawatch Range', id: 'range_sawatch' },
      { range: 'Elk Mountains', id: 'range_elk' },
      { range: 'San Juan Mountains', id: 'range_san_juan' },
      { range: 'Sangre de Cristo Range', id: 'range_sangre' },
      { range: 'Front Range', id: 'range_front' },
      { range: 'Mosquito Range', id: 'range_mosquito' },
      { range: 'Tenmile Range', id: 'range_tenmile' }
    ];

    for (const r of ranges) {
      const stats = rangeStats[r.range];
      if (stats && !earnedIds.has(r.id) && stats.summited > 0 && stats.summited < stats.total) {
        const def = ACHIEVEMENT_MAP.get(r.id);
        if (def) {
          inProgress.push({ def, current: stats.summited, total: stats.total });
        }
      }
    }

    // Class progress
    for (let c = 1; c <= 4; c++) {
      const stats = classStats[c];
      const id = `class_${c}_master`;
      if (stats && !earnedIds.has(id) && stats.summited > 0 && stats.summited < stats.total) {
        const def = ACHIEVEMENT_MAP.get(id);
        if (def) {
          inProgress.push({ def, current: stats.summited, total: stats.total });
        }
      }
    }

    // Sort by progress percentage and take top 4
    return inProgress
      .sort((a, b) => (b.current / b.total) - (a.current / a.total))
      .slice(0, 4);
  });
</script>

{#if earnedAchievements.length > 0 || inProgressAchievements().length > 0}
  <section class="mb-10">
    <h2 class="heading-section text-slate-900 dark:text-white mb-4 flex items-center gap-2">
      <svg class="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
      Achievements
      {#if earnedAchievements.length > 0}
        <span class="text-sm font-normal text-slate-500 dark:text-slate-400">
          ({earnedAchievements.length} earned)
        </span>
      {/if}
    </h2>

    <div class="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-card">
      <!-- Earned Badges -->
      {#if earnedAchievements.length > 0}
        <div class="mb-6">
          <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Earned
          </h3>
          <div class="flex flex-wrap gap-3">
            {#each earnedAchievements as achievement}
              <div
                class="
                  group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl
                  bg-gradient-to-br from-accent/10 via-accent-warm/5 to-accent/10
                  border border-accent/20
                  hover:border-accent/40 hover:shadow-md hover:shadow-accent/10
                  transition-all duration-200 cursor-default
                "
                title={achievement.definition.description}
              >
                <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-accent shadow-sm">
                  <AchievementIcon icon={achievement.definition.icon} earned={true} class="text-white" />
                </div>
                <span class="font-medium text-slate-900 dark:text-white text-sm">{achievement.definition.title}</span>

                <!-- Tooltip with earned date -->
                <div class="
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  px-3 py-2 rounded-lg
                  bg-slate-900 dark:bg-slate-700 text-white text-xs
                  opacity-0 group-hover:opacity-100
                  pointer-events-none transition-opacity
                  whitespace-nowrap z-10 shadow-lg
                ">
                  <div>{achievement.definition.description}</div>
                  <div class="text-slate-400 mt-1">Earned {formatEarnedDate(achievement.earned_at)}</div>
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- In Progress -->
      {#if inProgressAchievements().length > 0}
        <div>
          <h3 class="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            In Progress
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each inProgressAchievements() as { def, current, total }}
              {@const pct = (current / total) * 100}
              <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50">
                <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-600">
                  <AchievementIcon icon={def.icon} earned={false} class="text-slate-400 dark:text-slate-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {def.title}
                    </span>
                    <span class="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2 tabular-nums">
                      {current}/{total}
                    </span>
                  </div>
                  <div class="h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-accent transition-all duration-300"
                      style="width: {pct}%"
                    ></div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Empty state -->
      {#if earnedAchievements.length === 0 && inProgressAchievements().length === 0}
        <div class="text-center py-8">
          <div class="mx-auto h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <AchievementIcon icon="mountain" earned={false} class="w-7 h-7 text-slate-400" />
          </div>
          <p class="text-slate-500 dark:text-slate-400">
            Start summiting peaks to earn achievements!
          </p>
        </div>
      {/if}
    </div>
  </section>
{/if}

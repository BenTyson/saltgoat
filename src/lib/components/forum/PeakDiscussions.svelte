<script lang="ts">
  import type { ForumTopicWithAuthor } from '$lib/server/forum';
  import { formatRelativeTime } from '$lib/utils/time';

  interface Props {
    topics: ForumTopicWithAuthor[];
    peakSlug: string;
    peakName: string;
  }

  let { topics, peakSlug, peakName }: Props = $props();
</script>

<section class="mt-10 animate-fade-in-up" style="animation-delay: 325ms">
  <div class="flex items-center gap-5">
    <h2 class="heading-section text-slate-900 dark:text-white">Discussions</h2>
    <div class="rule-line"></div>
  </div>

  {#if topics.length > 0}
    <div class="mt-4 space-y-3">
      {#each topics as topic}
        <a
          href="/community/general/{topic.slug}"
          class="
            group flex items-center justify-between gap-4 p-4
            rounded-xl border border-slate-200 dark:border-slate-700
            bg-white dark:bg-slate-800/90 shadow-card
            hover:-translate-y-0.5 hover:shadow-card-hover
            transition-all duration-300
          "
        >
          <div class="min-w-0 flex-1">
            <h3 class="font-medium text-slate-900 dark:text-white group-hover:text-mountain-blue dark:group-hover:text-accent transition-colors truncate">
              {topic.title}
            </h3>
            <div class="mt-1 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
              <span>{topic.author.display_name || 'Anonymous'}</span>
              <span class="flex items-center gap-1">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {topic.reply_count}
              </span>
              <span>{formatRelativeTime(topic.last_reply_at || topic.created_at)}</span>
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
  {/if}

  <!-- CTA -->
  <div class="mt-4">
    <a
      href="/community/general/new?peak={peakSlug}"
      class="
        inline-flex items-center gap-1.5 px-4 py-2 rounded-lg
        text-sm font-medium
        border border-accent/30 text-accent hover:bg-accent/10
        dark:border-accent/40 dark:text-accent-light dark:hover:bg-accent/20
        transition-colors
      "
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Start a discussion about {peakName}
    </a>
  </div>
</section>

<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import PeakCard from '$lib/components/peak/PeakCard.svelte';
  import ActivityFeed from '$lib/components/profile/ActivityFeed.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const stats = [
    { value: '58', label: 'Fourteeners' },
    { value: "14,439'", label: 'Highest point' },
    { value: '7', label: 'Ranges' },
    { value: '66', label: 'Routes' }
  ];

  const guides = [
    { n: '01', title: 'Your first fourteener', desc: 'How to pick a peak worth starting on', href: '/learn/first-fourteener' },
    { n: '02', title: 'Safety & weather', desc: 'Storms, altitude, and turnaround times', href: '/learn/safety' },
    { n: '03', title: 'The essential gear', desc: 'What belongs in your pack — and what doesn’t', href: '/learn/gear' },
    { n: '04', title: 'Parking & trailheads', desc: 'Beat the 4am crowds at popular trailheads', href: '/learn/parking' }
  ];

  const logEntries = [
    { peak: 'Mt. Elbert', elev: "14,439'", date: 'Jul 12' },
    { peak: 'Quandary Peak', elev: "14,271'", date: 'Jun 28' },
    { peak: 'Grays Peak', elev: "14,278'", date: 'Jun 14' },
    { peak: 'Mt. Bierstadt', elev: "14,066'", date: 'May 31' }
  ];
</script>

<svelte:head>
  <title>SaltGoat - The Modern Guide to Colorado's 14ers</title>
  <meta
    name="description"
    content="Beautiful, mobile-first guide to all 58 Colorado fourteeners. Stats at a glance, conditions reports, and everything you need to summit."
  />
  <link rel="canonical" href="https://saltgoat.co" />
  {@html `<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "SaltGoat",
      "url": "https://saltgoat.co",
      "description": "The modern guide to Colorado's 58 fourteeners",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://saltgoat.co/peaks?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  </script>`}
</svelte:head>

<!-- Hero Section -->
<section class="relative min-h-[85vh] flex items-center overflow-hidden">
  <!-- Background -->
  <div class="absolute inset-0 bg-mountain-navy dark:bg-slate-900">
    <img
      src="/images/SaltGoat_Mast3.jpg"
      alt=""
      class="absolute inset-0 h-full w-full object-cover"
      aria-hidden="true"
    />
    <!-- Overlay: lighter on left (goat), darker on right (text) -->
    <div
      class="absolute inset-0"
      style="background: linear-gradient(to right, rgba(8,12,24,0.15) 0%, rgba(8,12,24,0.3) 30%, rgba(8,12,24,0.7) 55%, rgba(8,12,24,0.85) 100%);"
    ></div>
    <div
      class="absolute inset-0"
      style="background: linear-gradient(to bottom, transparent 0%, rgba(8,12,24,0.3) 100%);"
    ></div>
  </div>

  <!-- Content: right-aligned on desktop, centered on mobile -->
  <Container class="relative z-10 py-24">
    <div class="grid lg:grid-cols-2 items-center min-h-[55vh]">
      <!-- Left: empty space for goat illustration to show -->
      <div class="hidden lg:block"></div>

      <!-- Right: text content -->
      <div class="text-center lg:text-left animate-fade-in-up">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-light">
          A field guide to Colorado's fourteeners
        </p>
        <h1 class="mt-5 font-display font-normal text-5xl sm:text-6xl lg:text-[4.25rem] leading-[1.05] tracking-tight text-white" style="text-shadow: 0 2px 16px rgba(0,0,0,0.6);">
          Fifty-eight summits.<br />
          <span class="italic text-accent-light">One long story.</span>
        </h1>
        <p class="mt-6 max-w-md text-lg text-white/70 leading-relaxed mx-auto lg:mx-0" style="text-shadow: 0 1px 6px rgba(0,0,0,0.4);">
          Track your climbs, read the conditions, plan the next route — and keep the
          record of your journey to all 58.
        </p>

        <!-- Social proof (hidden until meaningful) -->
        {#if data.climberCount >= 10 || data.summitCount >= 10}
          <div class="mt-6 flex items-center gap-6 text-sm text-white/70 justify-center lg:justify-start">
            {#if data.climberCount >= 10}
              <span>
                <strong class="text-white stats-number">{data.climberCount.toLocaleString()}</strong> climbers
              </span>
            {/if}
            {#if data.summitCount >= 10}
              <span>
                <strong class="text-white stats-number">{data.summitCount.toLocaleString()}</strong> summits logged
              </span>
            {/if}
          </div>
        {/if}

        <div class="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center justify-center lg:justify-start">
          <a href="/peaks" class="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-accent text-mountain-navy font-semibold hover:bg-accent-light transition-colors">
            Explore the peaks
          </a>
          <a href="/map" class="inline-flex items-center justify-center gap-2 px-2 py-3.5 text-white/80 font-medium hover:text-white transition-colors border-b border-transparent">
            View the map
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </Container>

  <!-- Subtle bottom edge -->
  <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
</section>

<!-- Stats Strip -->
<section class="bg-white dark:bg-slate-900">
  <Container class="py-14">
    <div class="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
      {#each stats as stat}
        <div class="py-8 px-4 text-center">
          <div class="stats-number font-display font-normal text-4xl sm:text-5xl text-slate-900 dark:text-white">
            {stat.value}
          </div>
          <div class="eyebrow mt-3">{stat.label}</div>
        </div>
      {/each}
    </div>
  </Container>
</section>

<!-- Friends Activity -->
{#if data.friendsActivity && data.friendsActivity.length > 0}
  <section class="py-16 bg-white dark:bg-slate-900">
    <Container>
      <div class="flex items-end justify-between gap-4 mb-8">
        <div>
          <p class="eyebrow-accent mb-3">Your network</p>
          <h2 class="heading-section text-slate-900 dark:text-white">Friends activity</h2>
        </div>
        <a
          href="/profile?tab=buddies"
          class="text-sm font-medium text-slate-600 hover:text-accent-dark dark:text-slate-400 dark:hover:text-accent transition-colors whitespace-nowrap"
        >
          See all →
        </a>
      </div>
      <ActivityFeed activities={data.friendsActivity} showUser={true} reactions={data.summitReactions} comments={data.summitComments} currentUserId={data.currentUserId} />
    </Container>
  </section>
{/if}

<!-- Featured Peaks -->
<section class="py-20 bg-white dark:bg-slate-900">
  <Container>
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
      <div>
        <p class="eyebrow-accent mb-3">The classics</p>
        <h2 class="heading-section text-slate-900 dark:text-white">Where to start</h2>
        <p class="mt-3 text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
          Accessible trails, honest mileage, and that unforgettable first-summit feeling.
        </p>
      </div>
      <a
        href="/peaks"
        class="text-sm font-medium text-slate-600 hover:text-accent-dark dark:text-slate-400 dark:hover:text-accent transition-colors whitespace-nowrap"
      >
        View all {data.totalPeaks || 58} →
      </a>
    </div>

    {#if data.peaks && data.peaks.length > 0}
      <div class="space-y-3">
        {#each data.peaks as peak, i}
          <PeakCard {peak} featured={i === 0} />
        {/each}
      </div>
    {:else}
      <div class="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">No peaks loaded</h3>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Check your connection and refresh the page.
        </p>
      </div>
    {/if}
  </Container>
</section>

<!-- Seven Ranges -->
<section class="py-24 bg-slate-50 dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-800">
  <Container>
    <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <!-- Text Content -->
      <div class="order-2 lg:order-1">
        <p class="eyebrow-accent mb-3">Explore by range</p>
        <h2 class="heading-section text-slate-900 dark:text-white mb-6">
          Seven ranges, seven personalities
        </h2>
        <div class="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>
            Colorado's fourteeners cluster into seven distinct ranges, each with its own
            character. The Sawatch offers gentle giants perfect for first-timers. The Elks
            demand respect with infamous loose rock. The San Juans reward those willing to
            venture into true wilderness.
          </p>
        </div>

        <!-- Range index -->
        <div class="mt-8 border-t border-slate-200 dark:border-slate-700">
          {#each [
            { name: 'Sawatch Range', count: 15, href: '/ranges/sawatch-range' },
            { name: 'San Juan Mountains', count: 13, href: '/ranges/san-juan-mountains' },
            { name: 'Sangre de Cristo Range', count: 10, href: '/ranges/sangre-de-cristo-range' },
            { name: 'Elk Mountains', count: 6, href: '/ranges/elk-mountains' }
          ] as range}
            <a
              href={range.href}
              class="group flex items-baseline justify-between gap-4 py-3.5 border-b border-slate-200 dark:border-slate-700 transition-colors hover:border-accent/60"
            >
              <span class="font-medium text-slate-800 dark:text-slate-200 group-hover:text-accent-dark dark:group-hover:text-accent transition-colors">
                {range.name}
              </span>
              <span class="stats-number text-sm text-slate-400 dark:text-slate-500">{range.count} peaks</span>
            </a>
          {/each}
        </div>

        <a
          href="/ranges"
          class="inline-flex items-center gap-2 mt-6 text-sm font-medium text-slate-600 hover:text-accent-dark dark:text-slate-400 dark:hover:text-accent transition-colors"
        >
          Explore all seven ranges →
        </a>
      </div>

      <!-- Visual: Range Photo Grid -->
      <div class="order-1 lg:order-2">
        <div class="grid grid-cols-2 gap-3">
          <a href="/ranges/elk-mountains" class="group relative aspect-square rounded-lg overflow-hidden">
            <img src="/images/peaks/Maroon_Peak.jpg" alt="Maroon Peak — Elk Mountains" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
            <div class="absolute bottom-3 left-3 right-3">
              <p class="text-white font-medium text-sm">Elk Mountains</p>
              <p class="text-white/60 text-xs stats-number">6 peaks</p>
            </div>
          </a>
          <a href="/ranges/san-juan-mountains" class="group relative aspect-square rounded-lg overflow-hidden">
            <img src="/images/peaks/Handies_Peak.jpg" alt="Handies Peak — San Juan Mountains" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
            <div class="absolute bottom-3 left-3 right-3">
              <p class="text-white font-medium text-sm">San Juans</p>
              <p class="text-white/60 text-xs stats-number">13 peaks</p>
            </div>
          </a>
          <a href="/ranges/sawatch-range" class="group relative aspect-square rounded-lg overflow-hidden">
            <img src="/images/peaks/Huron_Peak.jpg" alt="Huron Peak — Sawatch Range" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
            <div class="absolute bottom-3 left-3 right-3">
              <p class="text-white font-medium text-sm">Sawatch</p>
              <p class="text-white/60 text-xs stats-number">15 peaks</p>
            </div>
          </a>
          <a href="/ranges/sangre-de-cristo-range" class="group relative aspect-square rounded-lg overflow-hidden">
            <img src="/images/peaks/Crestone_Peak.jpg" alt="Crestone Peak — Sangre de Cristo Range" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
            <div class="absolute bottom-3 left-3 right-3">
              <p class="text-white font-medium text-sm">Sangre de Cristo</p>
              <p class="text-white/60 text-xs stats-number">10 peaks</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  </Container>
</section>

<!-- Track Your Journey -->
<section class="py-24 bg-white dark:bg-slate-900">
  <Container>
    <div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <!-- Visual: Summit Log -->
      <div>
        <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-card overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <span class="eyebrow">Summit log</span>
            <span class="stats-number text-sm text-slate-400 dark:text-slate-500">2025 season</span>
          </div>
          <div class="px-6">
            {#each logEntries as entry, i}
              <div class="flex items-baseline justify-between gap-4 py-4 {i < logEntries.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/60' : ''}">
                <div class="flex items-baseline gap-3 min-w-0">
                  <span class="font-display text-xl text-slate-900 dark:text-white truncate">{entry.peak}</span>
                  <span class="stats-number text-sm text-slate-400 dark:text-slate-500">{entry.elev}</span>
                </div>
                <span class="stats-number text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">{entry.date}</span>
              </div>
            {/each}
          </div>
          <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Progress</span>
              <span class="stats-number text-sm text-slate-500 dark:text-slate-400">38 of 58</span>
            </div>
            <div class="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div class="w-[65%] h-full rounded-full bg-accent"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Text Content -->
      <div>
        <p class="eyebrow-accent mb-3">Your journey</p>
        <h2 class="heading-section text-slate-900 dark:text-white mb-6">
          Track every summit. Keep the record.
        </h2>
        <div class="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>
            Every summit tells a story — the 3am alarm, the final push through talus, the
            moment the world opens up beneath you. Don't let those memories fade.
          </p>
          <p>
            Log your climbs, watch your progress toward all 58, and earn your place on the
            leaderboard. First peak, full range, the complete list — the record is yours to build.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 sm:items-center mt-8">
          <a href="/auth" class="btn-primary">
            Create free account
          </a>
          <a
            href="/leaderboard"
            class="inline-flex items-center gap-2 px-2 py-3 text-sm font-medium text-slate-600 hover:text-accent-dark dark:text-slate-400 dark:hover:text-accent transition-colors"
          >
            See the leaderboard →
          </a>
        </div>
      </div>
    </div>
  </Container>
</section>

<!-- New to 14ers -->
<section class="py-24 bg-slate-50 dark:bg-slate-800/40 border-y border-slate-200 dark:border-slate-800">
  <Container>
    <div class="grid lg:grid-cols-2 gap-12 lg:gap-16">
      <!-- Text Content -->
      <div>
        <p class="eyebrow-accent mb-3">New to 14ers?</p>
        <h2 class="heading-section text-slate-900 dark:text-white mb-6">
          Read before you climb
        </h2>
        <div class="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
          <p>
            Standing on a summit at 14,000 feet is unforgettable. Getting there safely takes
            preparation — afternoon storms roll in like clockwork, and altitude spares no one.
          </p>
          <p>
            Our guides cover everything from picking a first peak to reading the weather.
          </p>
        </div>
        <a
          href="/learn"
          class="inline-flex items-center gap-2 mt-8 text-sm font-medium text-slate-600 hover:text-accent-dark dark:text-slate-400 dark:hover:text-accent transition-colors"
        >
          Browse all guides →
        </a>
      </div>

      <!-- Guide index -->
      <div class="border-t border-slate-300 dark:border-slate-700">
        {#each guides as guide}
          <a
            href={guide.href}
            class="group flex items-start gap-6 py-6 border-b border-slate-300/70 dark:border-slate-700 transition-colors hover:border-accent/60"
          >
            <span class="stats-number font-display text-2xl text-slate-300 dark:text-slate-600 group-hover:text-accent transition-colors leading-none pt-0.5">
              {guide.n}
            </span>
            <span class="flex-1 min-w-0">
              <span class="block font-display text-xl text-slate-900 dark:text-white group-hover:text-accent-dark dark:group-hover:text-accent transition-colors">
                {guide.title}
              </span>
              <span class="block mt-1 text-sm text-slate-500 dark:text-slate-400">{guide.desc}</span>
            </span>
            <svg class="h-4 w-4 mt-2 text-slate-300 dark:text-slate-600 group-hover:text-accent transition-all group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        {/each}
      </div>
    </div>
  </Container>
</section>

<!-- Final CTA -->
<section class="py-24 bg-mountain-navy relative overflow-hidden">
  <Container class="relative">
    <div class="max-w-2xl mx-auto text-center">
      <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-light mb-5">
        Join the journey
      </p>
      <h2 class="font-display font-normal text-4xl sm:text-5xl tracking-tight text-white mb-6">
        The mountains are waiting.
      </h2>
      <p class="text-lg text-white/60 mb-10 leading-relaxed">
        Track your progress toward all 58 Colorado fourteeners — free to start,
        built by people who climb.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/auth" class="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-accent text-mountain-navy font-semibold hover:bg-accent-light transition-colors">
          Create free account
        </a>
        <a href="/peaks" class="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg border border-white/25 text-white font-semibold hover:border-white/50 hover:bg-white/5 transition-colors">
          Browse the peaks
        </a>
      </div>
    </div>
  </Container>
</section>

<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import LearnHero from '$lib/components/learn/LearnHero.svelte';
  import TopicCard from '$lib/components/learn/TopicCard.svelte';
</script>

<svelte:head>
  <title>Learn | SaltGoat</title>
  <meta
    name="description"
    content="Everything you need to summit your first Colorado 14er. Guides on safety, gear, planning, and finding the right peak for you."
  />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a 14er?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A \"fourteener\" or \"14er\" is a mountain peak with an elevation of at least 14,000 feet (4,267 meters). Colorado has 58 named 14ers—more than any other state—ranging from relatively straightforward hikes to serious technical climbs."
        }
      },
      {
        "@type": "Question",
        "name": "When is the best time to climb?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The prime season is mid-June through early September when most trails are snow-free. July and August offer the most stable conditions, but also the highest crowds. Start early—aim to be off the summit by noon to avoid afternoon thunderstorms."
        }
      },
      {
        "@type": "Question",
        "name": "How fit do I need to be?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You should be comfortable hiking 6-10 miles with 3,000-4,000 feet of elevation gain. If you can do that at lower altitude, you're ready for an easier 14er—just expect it to feel harder up high. Start training at least 6-8 weeks before your first attempt."
        }
      },
      {
        "@type": "Question",
        "name": "What does \"Class 1-4\" mean?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Yosemite Decimal System rates terrain difficulty. Class 1: Trail hiking. Class 2: Off-trail, hands for balance. Class 3: Scrambling, exposure. Class 4: Climbing, ropes recommended. Start with Class 1 or easy Class 2 routes for your first 14er."
        }
      }
    ]
  })}</script>`}
</svelte:head>

<LearnHero
  title="Learn to Summit"
  subtitle="Everything you need to conquer Colorado's highest peaks"
  variant="hub"
/>

<Container class="py-12 sm:py-16">
  <!-- Start Here Section -->
  <section id="start" class="scroll-mt-20 animate-fade-in-up">
    <div class="flex items-center gap-5 mb-8">
      <div class="rule-line"></div>
      <h2 class="heading-section text-slate-900 dark:text-white">Start here</h2>
      <div class="rule-line"></div>
    </div>

    <p class="text-center text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
      New to 14ers? These guides cover the essentials—what to expect, how to stay safe, what to bring, and where to park.
    </p>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <TopicCard
        href="/learn/first-fourteener"
        title="Your First 14er"
        description="What to expect, when to go, and how to pick the right peak for your first summit."
        icon="mountain"
        color="accent"
        number={1}
      />
      <TopicCard
        href="/learn/safety"
        title="Mountain Safety"
        description="Weather, altitude sickness, and knowing when to turn back. The stuff that keeps you alive."
        icon="shield"
        color="blue"
        number={2}
      />
      <TopicCard
        href="/learn/gear"
        title="Gear & Preparation"
        description="What to wear, what to pack, and how to prepare your body for high altitude."
        icon="backpack"
        color="green"
        number={3}
      />
      <TopicCard
        href="/learn/parking"
        title="Trailhead Parking"
        description="Timing strategies, permit requirements, and what to do when the lot is full."
        icon="car"
        color="amber"
        number={4}
      />
      <TopicCard
        href="/learn/difficulty-ratings"
        title="Difficulty Ratings"
        description="Deep dive into Class 1-4 terrain with examples from actual peaks."
        icon="chart"
        color="violet"
        number={5}
      />
      <TopicCard
        href="/learn/faq"
        title="FAQ"
        description="Answers to common questions about Colorado 14ers, from getting started to tracking your summits."
        icon="question"
        color="blue"
        number={6}
      />
    </div>
  </section>

  <!-- Quick FAQ Section -->
  <section class="mt-20 animate-fade-in-up" style="animation-delay: 150ms">
    <div class="flex items-center gap-5 mb-8">
      <div class="rule-line"></div>
      <h2 class="heading-section text-slate-900 dark:text-white">Quick answers</h2>
      <div class="rule-line"></div>
    </div>

    <div class="max-w-3xl mx-auto space-y-3">
      <details class="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-card transition-shadow">
        <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
          <span class="font-semibold text-slate-900 dark:text-white">What is a 14er?</span>
          <div class="flex-shrink-0 ml-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-open:bg-accent/10 transition-colors">
            <svg class="h-5 w-5 text-slate-400 group-open:text-accent transition-all group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div class="px-5 pb-5 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4">
          <p>A "fourteener" or "14er" is a mountain peak with an elevation of at least 14,000 feet (4,267 meters). Colorado has 58 named 14ers—more than any other state—ranging from relatively straightforward hikes to serious technical climbs.</p>
        </div>
      </details>

      <details class="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-card transition-shadow">
        <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
          <span class="font-semibold text-slate-900 dark:text-white">When is the best time to climb?</span>
          <div class="flex-shrink-0 ml-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-open:bg-accent/10 transition-colors">
            <svg class="h-5 w-5 text-slate-400 group-open:text-accent transition-all group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div class="px-5 pb-5 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4">
          <p>The prime season is mid-June through early September when most trails are snow-free. July and August offer the most stable conditions, but also the highest crowds. Start early—aim to be off the summit by noon to avoid afternoon thunderstorms.</p>
        </div>
      </details>

      <details class="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-card transition-shadow">
        <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
          <span class="font-semibold text-slate-900 dark:text-white">How fit do I need to be?</span>
          <div class="flex-shrink-0 ml-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-open:bg-accent/10 transition-colors">
            <svg class="h-5 w-5 text-slate-400 group-open:text-accent transition-all group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div class="px-5 pb-5 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4">
          <p>You should be comfortable hiking 6-10 miles with 3,000-4,000 feet of elevation gain. If you can do that at lower altitude, you're ready for an easier 14er—just expect it to feel harder up high. Start training at least 6-8 weeks before your first attempt.</p>
        </div>
      </details>

      <details class="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-card transition-shadow">
        <summary class="flex items-center justify-between p-5 cursor-pointer list-none">
          <span class="font-semibold text-slate-900 dark:text-white">What does "Class 1-4" mean?</span>
          <div class="flex-shrink-0 ml-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-open:bg-accent/10 transition-colors">
            <svg class="h-5 w-5 text-slate-400 group-open:text-accent transition-all group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div class="px-5 pb-5 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4">
          <p class="mb-3">The Yosemite Decimal System rates terrain difficulty:</p>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="flex items-center gap-2 p-2 rounded-lg bg-class-1/10">
              <span class="w-2 h-2 rounded-full bg-class-1"></span>
              <span><strong class="text-class-1">Class 1:</strong> Trail hiking</span>
            </div>
            <div class="flex items-center gap-2 p-2 rounded-lg bg-class-2/10">
              <span class="w-2 h-2 rounded-full bg-class-2"></span>
              <span><strong class="text-class-2">Class 2:</strong> Off-trail, hands for balance</span>
            </div>
            <div class="flex items-center gap-2 p-2 rounded-lg bg-class-3/10">
              <span class="w-2 h-2 rounded-full bg-class-3"></span>
              <span><strong class="text-class-3">Class 3:</strong> Scrambling, exposure</span>
            </div>
            <div class="flex items-center gap-2 p-2 rounded-lg bg-class-4/10">
              <span class="w-2 h-2 rounded-full bg-class-4"></span>
              <span><strong class="text-class-4">Class 4:</strong> Climbing, ropes recommended</span>
            </div>
          </div>
          <p class="mt-3 text-sm">Start with Class 1 or easy Class 2 routes for your first 14er.</p>
        </div>
      </details>
    </div>
  </section>

  <!-- Coming Soon Section -->
  <section class="mt-20 animate-fade-in-up" style="animation-delay: 300ms">
    <div class="flex items-center gap-5 mb-8">
      <div class="rule-line"></div>
      <h2 class="heading-section text-slate-900 dark:text-white">Coming soon</h2>
      <div class="rule-line"></div>
    </div>

    <p class="text-center text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
      More guides are on the way to help you level up your mountain skills.
    </p>

    <div class="grid gap-6 max-w-sm mx-auto">
      <TopicCard
        href="#"
        title="Trip Planning"
        description="Route selection, conditions checking, and making go/no-go decisions."
        icon="map"
        color="violet"
        comingSoon={true}
      />
    </div>
  </section>

  <!-- CTA Section -->
  <section class="mt-20 animate-fade-in-up" style="animation-delay: 400ms">
    <div class="relative rounded-lg overflow-hidden bg-mountain-navy p-8 sm:p-12">

      <div class="relative text-center max-w-2xl mx-auto">
        <h2 class="text-2xl sm:text-3xl font-display font-normal text-white mb-4">
          Ready to Start Your Journey?
        </h2>
        <p class="text-white/80 mb-8">
          Browse all 58 Colorado 14ers, filter by difficulty, and find the perfect peak for your first summit.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/peaks"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-white/25 text-white font-semibold hover:border-white/50 hover:bg-white/5 transition-colors"
          >
            Explore Peaks
          </a>
          <a
            href="/learn/first-fourteener"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-accent text-mountain-navy font-semibold hover:bg-accent-light transition-colors"
          >
            Take the Quiz
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>
</Container>

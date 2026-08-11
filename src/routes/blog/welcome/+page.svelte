<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import LearnHero from '$lib/components/learn/LearnHero.svelte';
</script>

<svelte:head>
  <title>Welcome to SaltGoat | Blog | SaltGoat</title>
  <meta
    name="description"
    content="Introducing SaltGoat: a free app for tracking your Colorado 14er summits, reading reviews, checking conditions, and connecting with fellow hikers."
  />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Welcome to SaltGoat",
    "datePublished": "2026-03-08",
    "author": { "@type": "Organization", "name": "SaltGoat" },
    "publisher": { "@type": "Organization", "name": "SaltGoat", "url": "https://saltgoat.co" }
  })}</script>`}
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://saltgoat.co/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://saltgoat.co/blog" },
      { "@type": "ListItem", "position": 3, "name": "Welcome to SaltGoat", "item": "https://saltgoat.co/blog/welcome" }
    ]
  })}</script>`}
</svelte:head>

<LearnHero
  title="Welcome to SaltGoat"
  subtitle="A new way to track your Colorado 14er journey"
/>

<Container size="wide" class="py-12 sm:py-16">
  <!-- Breadcrumb -->
  <nav class="mb-8 animate-fade-in-up">
    <ol class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <li><a href="/blog" class="hover:text-accent transition-colors">Blog</a></li>
      <li class="text-slate-400">/</li>
      <li class="text-slate-900 dark:text-white font-medium">Welcome to SaltGoat</li>
    </ol>
  </nav>

  <div class="max-w-3xl">
    <article class="prose-content space-y-12 animate-fade-in-up" style="animation-delay: 100ms">
      <!-- What is SaltGoat -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">What is SaltGoat?</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          SaltGoat is a free app for tracking your progress across all 58 of Colorado's fourteeners. Whether you just bagged your first summit or you're closing in on the full list, SaltGoat gives you a single place to log your climbs, remember the details, and see how far you've come.
        </p>
        <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          We built it because the existing options felt scattered. Spreadsheets, forum posts, apps that haven't been updated in years. Colorado's 14ers deserve better tools, and the people who climb them do too.
        </p>
      </section>

      <!-- Core features -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">What You Can Do</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="p-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Log Summits</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">Record the date, route, conditions, and your personal notes for every summit. Build your complete 14er history.</p>
          </div>
          <div class="p-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Read and Write Reviews</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">Get honest accounts from other hikers. Share your own experience to help the next person on the trail.</p>
          </div>
          <div class="p-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Check Conditions</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">See current weather, recent trail reports, and conditions data for every peak before you head out.</p>
          </div>
          <div class="p-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-2">Explore All 58</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">Browse peaks by range, difficulty, elevation, and more. Detailed route information for every standard approach.</p>
          </div>
        </div>
      </section>

      <!-- Community -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">Built for the Community</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          Climbing 14ers is more fun with other people. SaltGoat includes leaderboards to see where you stand, the ability to follow friends and track their progress, and trip sharing so you can plan and celebrate together.
        </p>
        <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          Everyone's journey is different. Some people summit all 58 in a single season. Others take decades, savoring each one. SaltGoat works for both approaches and everything in between.
        </p>
      </section>

      <!-- Learning resources -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">New to 14ers?</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          We have a growing collection of <a href="/learn" class="text-accent hover:text-accent-warm transition-colors font-medium">guides</a> covering safety, gear, trip planning, and choosing your first peak. The mountains are incredible, but they demand respect. Start informed.
        </p>
      </section>

      <!-- What's coming -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">What's Coming</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          SaltGoat is actively evolving. We're working on better trail data, improved route maps, and more ways to connect with the hiking community. If there's something you'd like to see, we're listening.
        </p>
      </section>

      <!-- CTA -->
      <section class="relative rounded-lg overflow-hidden bg-mountain-navy p-8 sm:p-10">
        <div class="relative text-center">
          <h2 class="text-2xl font-display font-normal text-white mb-3">Start Tracking Your Summits</h2>
          <p class="text-white/80 mb-6">Create a free account and log your first 14er.</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth"
              class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-warm transition-colors"
            >
              Create Account
            </a>
            <a
              href="/peaks"
              class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
            >
              Browse Peaks
            </a>
          </div>
        </div>
      </section>
    </article>

    <!-- Navigation -->
    <div class="mt-16 pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-between">
      <a
        href="/blog"
        class="group flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-accent transition-colors"
      >
        <svg class="h-5 w-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        All Posts
      </a>
      <a
        href="/blog/why-we-built-saltgoat"
        class="group flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-accent transition-colors"
      >
        Why We Built SaltGoat
        <svg class="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  </div>
</Container>

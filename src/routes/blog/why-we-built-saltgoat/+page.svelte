<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import LearnHero from '$lib/components/learn/LearnHero.svelte';
</script>

<svelte:head>
  <title>Why We Built SaltGoat | Blog | SaltGoat</title>
  <meta
    name="description"
    content="The story behind SaltGoat. Why we built a modern 14er tracking app, what makes it different, and where we're headed."
  />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Why We Built SaltGoat",
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
      { "@type": "ListItem", "position": 3, "name": "Why We Built SaltGoat", "item": "https://saltgoat.co/blog/why-we-built-saltgoat" }
    ]
  })}</script>`}
</svelte:head>

<LearnHero
  title="Why We Built SaltGoat"
  subtitle="The story behind a better 14er tracking app"
/>

<Container size="wide" class="py-12 sm:py-16">
  <!-- Breadcrumb -->
  <nav class="mb-8 animate-fade-in-up">
    <ol class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <li><a href="/blog" class="hover:text-accent transition-colors">Blog</a></li>
      <li class="text-slate-400">/</li>
      <li class="text-slate-900 dark:text-white font-medium">Why We Built SaltGoat</li>
    </ol>
  </nav>

  <div class="max-w-3xl">
    <article class="prose-content space-y-12 animate-fade-in-up" style="animation-delay: 100ms">
      <!-- The problem -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">The Problem</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          If you've tried tracking your 14er progress before, you know the landscape. There are spreadsheets passed around Facebook groups. Forum threads on sites that haven't been redesigned since 2008. A handful of apps that work on desktop but are painful on a phone. Scattered beta across a dozen different sources.
        </p>
        <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          The information exists, but it's fragmented. You check one site for route descriptions, another for recent conditions, a third for weather, and then try to piece it all together. That's a lot of friction for something that should be straightforward.
        </p>
      </section>

      <!-- Modern experience -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">A Modern Experience</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          We wanted something that felt like a modern app. Fast, clean, mobile-friendly. Something you could check at the trailhead on your phone just as easily as you could browse at home on a laptop.
        </p>
        <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          SaltGoat is built with current web technology. It loads fast, works on any device, and supports dark mode for those pre-dawn alpine starts when you're reviewing your route one last time.
        </p>
      </section>

      <!-- Community-driven -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">Built for the Community</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          The best information about 14ers comes from the people who climb them. That's why SaltGoat puts community data front and center: reviews from real hikers, trail reports with current conditions, and a photo gallery that shows you what the mountain actually looks like right now.
        </p>
        <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          Leaderboards and follow features aren't about competition for its own sake. They're about motivation, accountability, and celebrating each other's progress. Climbing all 58 is a serious commitment. Having a community behind you makes it better.
        </p>
      </section>

      <!-- Free tier -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">Free Where It Matters</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          We believe basic summit tracking should be free. Logging your climbs, reading reviews, checking weather and conditions, browsing peaks and routes -- none of that should be locked behind a paywall.
        </p>
        <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          Premium features exist for people who want more detailed analytics, unlimited summit logs, and advanced planning tools. But the core experience is free, and it always will be.
        </p>
      </section>

      <!-- The name -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">Why "SaltGoat"</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          If you've spent time above treeline in Colorado, you've probably had a mountain goat walk right up to you. They're not being friendly -- they're after your salt. Sweat, pee spots near the trail, a dropped snack -- mountain goats seek out sodium wherever they can find it. It's a quirk that every experienced 14er hiker knows.
        </p>
        <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          We liked the name because it signals insider knowledge. If you know why a goat is following you at 14,000 feet, you've been up there. That's the community we're building for -- people who know these mountains and want a better tool for tracking their time on them.
        </p>
      </section>

      <!-- Future vision -->
      <section>
        <h2 class="text-2xl font-display font-normal text-slate-900 dark:text-white mb-4">Where We're Headed</h2>
        <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
          SaltGoat is just getting started. We're working on accurate trail data with proper GPS tracks, so you can see the actual route on a map. We want to build guided experiences for first-time 14er hikers. Better trip planning tools. More ways to share your adventures.
        </p>
        <p class="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
          The 14er community in Colorado is incredible -- passionate, welcoming, and deeply connected to these mountains. We're building SaltGoat to serve that community, and we're excited to see where it goes.
        </p>
      </section>

      <!-- CTA -->
      <section class="relative rounded-lg overflow-hidden bg-mountain-navy p-8 sm:p-10">
        <div class="relative text-center">
          <h2 class="text-2xl font-display font-normal text-white mb-3">Join the Journey</h2>
          <p class="text-white/80 mb-6">Create a free account and start building your 14er story.</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/auth"
              class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-warm transition-colors"
            >
              Get Started
            </a>
            <a
              href="/peaks"
              class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
            >
              Explore Peaks
            </a>
          </div>
        </div>
      </section>
    </article>

    <!-- Navigation -->
    <div class="mt-16 pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-between">
      <a
        href="/blog/welcome"
        class="group flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-accent transition-colors"
      >
        <svg class="h-5 w-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Welcome to SaltGoat
      </a>
      <a
        href="/blog"
        class="group flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-accent transition-colors"
      >
        All Posts
        <svg class="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  </div>
</Container>

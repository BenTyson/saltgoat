<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import LearnHero from '$lib/components/learn/LearnHero.svelte';

  const posts = [
    {
      href: '/blog/welcome',
      title: 'Welcome to SaltGoat',
      date: 'March 2026',
      excerpt: 'Introducing a new way to track your Colorado 14er journey. Log summits, read reviews, check conditions, and connect with the hiking community.'
    },
    {
      href: '/blog/why-we-built-saltgoat',
      title: 'Why We Built SaltGoat',
      date: 'March 2026',
      excerpt: 'The story behind building a better 14er tracking app. From fragmented tools to a modern, community-driven experience.'
    }
  ];
</script>

<svelte:head>
  <title>Blog | SaltGoat</title>
  <meta
    name="description"
    content="Updates, stories, and insights from the trail. Read about SaltGoat development, Colorado 14er tips, and community highlights."
  />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://saltgoat.co/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://saltgoat.co/blog" }
    ]
  })}</script>`}
</svelte:head>

<LearnHero
  title="Blog"
  subtitle="Updates, stories, and insights from the trail"
/>

<Container class="py-12 sm:py-16">
  <div class="max-w-3xl mx-auto">
    <div class="space-y-6 animate-fade-in-up">
      {#each posts as post}
        <a
          href={post.href}
          class="
            block p-6 sm:p-8 rounded-lg
            border border-slate-200 dark:border-slate-700
            bg-white dark:bg-slate-800/60
            hover:shadow-card-hover hover:border-slate-300 dark:hover:border-slate-600
            transition-all duration-200
            group
          "
        >
          <div class="eyebrow mb-3">{post.date}</div>
          <h2 class="text-xl sm:text-2xl font-display font-normal text-slate-900 dark:text-white group-hover:text-accent transition-colors mb-3">
            {post.title}
          </h2>
          <p class="text-slate-600 dark:text-slate-400 leading-relaxed">{post.excerpt}</p>
          <span class="inline-flex items-center gap-1 mt-4 text-sm font-medium text-accent group-hover:gap-2 transition-all">
            Read more
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </a>
      {/each}
    </div>
  </div>
</Container>

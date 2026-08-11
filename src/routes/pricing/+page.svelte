<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const isLoggedIn = $derived(data.isLoggedIn);
  const userIsPro = $derived(data.userIsPro);
  const hasStripeCustomer = $derived(data.hasStripeCustomer);

  const freeTierFeatures = [
    'Browse all 58 peaks',
    'Log up to 5 summits',
    'Upload photos to any peak',
    'View leaderboard & profiles',
    'Trail reports & conditions',
    'Community reviews'
  ];

  const proTierFeatures = [
    'Everything in Free',
    'Unlimited summit logging',
    'Advanced stats dashboard',
    'Export summit history',
    'Pro badge on profile & leaderboard'
  ];
</script>

<svelte:head>
  <title>Pricing | SaltGoat</title>
  <meta name="description" content="SaltGoat pricing. Free tier to get started, Pro for unlimited summit tracking." />
</svelte:head>

<div class="min-h-screen bg-white dark:bg-slate-900">
  <Container class="py-16">
    <!-- Header -->
    <div class="text-center mb-12">
      <p class="eyebrow-accent mb-3">Pricing</p>
      <h1 class="heading-page text-slate-900 dark:text-white">
        Choose your plan
      </h1>
      <p class="mt-3 text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
        Start tracking your 14er progress for free. Upgrade to Pro for unlimited summit logging and more.
      </p>
    </div>

    <!-- Pricing Cards -->
    <div class="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
      <!-- Free Tier -->
      <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-8 scroll-mt-24">
        <div class="mb-6">
          <h2 class="font-display text-2xl text-slate-900 dark:text-white">Free</h2>
          <div class="mt-3 flex items-baseline gap-1">
            <span class="stats-number font-display text-5xl text-slate-900 dark:text-white">$0</span>
            <span class="text-slate-500 dark:text-slate-400">/forever</span>
          </div>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Perfect for getting started
          </p>
        </div>

        <ul class="space-y-3 mb-8">
          {#each freeTierFeatures as feature}
            <li class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
              <svg class="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          {/each}
        </ul>

        {#if !isLoggedIn}
          <a
            href="/auth"
            class="block w-full text-center px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            Get Started
          </a>
        {:else}
          <div class="block w-full text-center px-6 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
            {userIsPro ? 'Included' : 'Current Plan'}
          </div>
        {/if}
      </div>

      <!-- Pro Tier -->
      <div class="rounded-lg border border-accent bg-white dark:bg-slate-800/60 shadow-card p-8 pt-10 relative scroll-mt-28">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2">
          <span class="px-3 py-1 rounded-full bg-accent text-mountain-navy text-[11px] font-semibold uppercase tracking-[0.14em]">
            Most Popular
          </span>
        </div>

        <div class="mb-6">
          <h2 class="font-display text-2xl text-slate-900 dark:text-white">SaltGoat Pro</h2>
          <div class="mt-3 flex items-baseline gap-1">
            <span class="stats-number font-display text-5xl text-slate-900 dark:text-white">$29.99</span>
            <span class="text-slate-500 dark:text-slate-400">/year</span>
          </div>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            For dedicated peak baggers
          </p>
        </div>

        <ul class="space-y-3 mb-8">
          {#each proTierFeatures as feature}
            <li class="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
              <svg class="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          {/each}
        </ul>

        {#if !isLoggedIn}
          <a
            href="/auth"
            class="block w-full text-center px-6 py-3 rounded-lg bg-accent text-mountain-navy font-semibold hover:bg-accent-light transition-colors"
          >
            Get Started
          </a>
        {:else if userIsPro && hasStripeCustomer}
          <form method="POST" action="/api/portal">
            <button
              type="submit"
              class="block w-full text-center px-6 py-3 rounded-lg border border-accent text-accent font-medium hover:bg-accent/5 transition-colors"
            >
              Manage Subscription
            </button>
          </form>
        {:else if userIsPro}
          <div class="block w-full text-center px-6 py-3 rounded-lg bg-accent/10 text-accent font-medium">
            Current Plan
          </div>
        {:else}
          <form method="POST" action="/api/checkout">
            <button
              type="submit"
              class="block w-full text-center px-6 py-3 rounded-lg bg-accent text-mountain-navy font-semibold hover:bg-accent-light transition-colors"
            >
              Upgrade to Pro
            </button>
          </form>
        {/if}
      </div>
    </div>

    <!-- FAQ -->
    <div class="mt-16 max-w-2xl mx-auto">
      <h2 class="heading-section text-slate-900 dark:text-white text-center mb-8">
        Frequently asked questions
      </h2>
      <div class="space-y-6">
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white">What happens when I hit the 5-summit limit?</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            You can still browse all peaks, read reviews, and check conditions. To log more summits, upgrade to Pro.
          </p>
        </div>
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white">Can I cancel anytime?</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Yes. Cancel anytime from your subscription management page. Your Pro features remain active until the end of your billing period.
          </p>
        </div>
        <div>
          <h3 class="font-semibold text-slate-900 dark:text-white">What if I already logged summits?</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            All your existing summit data is preserved. If you're on the free tier with more than 5 summits, you'll keep them but won't be able to log new ones until you upgrade.
          </p>
        </div>
      </div>
    </div>
  </Container>
</div>

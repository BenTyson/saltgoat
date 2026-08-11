<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import { createBrowserClient } from '@supabase/ssr';
  import { goto } from '$app/navigation';

  let password = $state('');
  let confirmPassword = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let success = $state(false);

  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = null;

    if (password !== confirmPassword) {
      error = 'Passwords do not match.';
      loading = false;
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters.';
      loading = false;
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      error = authError.message;
    } else {
      success = true;
      setTimeout(() => goto('/'), 2000);
    }

    loading = false;
  }
</script>

<svelte:head>
  <title>Reset Password | SaltGoat</title>
  <meta name="description" content="Set a new password for your SaltGoat account." />
</svelte:head>

<Container class="py-12 sm:py-20">
  <div class="mx-auto max-w-md">
    <div class="text-center mb-8 animate-fade-in-up">
      <h1 class="heading-page text-slate-900 dark:text-white">Reset Password</h1>
      <p class="mt-3 text-slate-600 dark:text-slate-400">
        Enter your new password below.
      </p>
    </div>

    <div
      class="
        animate-fade-in-up rounded-2xl overflow-hidden
        bg-white/90 dark:bg-slate-800/90 backdrop-blur-md
        shadow-card-elevated border border-slate-200/50 dark:border-slate-700/50
      "
      style="animation-delay: 100ms"
    >
      <div class="h-1.5 bg-accent"></div>

      <div class="p-6 sm:p-8">
        {#if success}
          <div class="text-center">
            <div class="mx-auto h-12 w-12 rounded-full bg-semantic-success/10 dark:bg-semantic-success/20 flex items-center justify-center mb-4">
              <svg class="h-6 w-6 text-semantic-success-dark dark:text-semantic-success-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Password Updated</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">Redirecting you to the homepage...</p>
          </div>
        {:else}
          <form onsubmit={handleSubmit} class="space-y-4">
            <div>
              <label for="password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <input
                id="password"
                type="password"
                bind:value={password}
                required
                minlength="6"
                class="
                  w-full px-4 py-2.5 rounded-xl
                  border border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700
                  text-slate-900 dark:text-white
                  focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
                  transition-all duration-200
                "
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label for="confirm-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                bind:value={confirmPassword}
                required
                minlength="6"
                class="
                  w-full px-4 py-2.5 rounded-xl
                  border border-slate-200 dark:border-slate-600
                  bg-white dark:bg-slate-700
                  text-slate-900 dark:text-white
                  focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
                  transition-all duration-200
                "
                placeholder="Confirm your new password"
              />
            </div>

            {#if error}
              <div class="p-3 rounded-lg bg-semantic-danger/5 dark:bg-semantic-danger/15 text-semantic-danger-dark dark:text-semantic-danger-light text-sm">
                {error}
              </div>
            {/if}

            <button
              type="submit"
              disabled={loading}
              class="
                w-full btn-primary py-3 text-base
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {#if loading}
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {:else}
                Update Password
              {/if}
            </button>
          </form>
        {/if}
      </div>
    </div>
  </div>
</Container>

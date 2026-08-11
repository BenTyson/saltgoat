<script lang="ts">
  import Container from '$lib/components/ui/Container.svelte';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import { createBrowserClient } from '@supabase/ssr';
  import { page } from '$app/stores';

  const redirectTo = $derived($page.url.searchParams.get('redirectTo') || '/');

  let mode = $state<'login' | 'signup' | 'forgot'>('login');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let message = $state<string | null>(null);

  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = null;
    message = null;

    if (mode === 'forgot') {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`
      });

      if (authError) {
        error = authError.message;
      } else {
        message = 'Check your email for a password reset link!';
      }
    } else if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        error = authError.message;
      } else {
        window.location.href = redirectTo;
      }
    } else {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
        }
      });

      if (authError) {
        error = authError.message;
      } else {
        message = 'Check your email for a confirmation link!';
      }
    }

    loading = false;
  }

  async function handleGoogleLogin() {
    loading = true;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
      }
    });
    if (authError) {
      error = authError.message;
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'} | SaltGoat</title>
  <meta name="description" content="Sign in or create an account to track your Colorado 14er summits, log reviews, and earn achievements." />
</svelte:head>

<Container class="py-12 sm:py-20">
  <div class="mx-auto max-w-md">
    <div class="text-center mb-8 animate-fade-in-up">
      <h1 class="heading-page text-slate-900 dark:text-white">
        {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Join SaltGoat' : 'Reset Password'}
      </h1>
      <p class="mt-3 text-slate-600 dark:text-slate-400">
        {mode === 'login' ? 'Log in to track your summits' : mode === 'signup' ? 'Create an account to start bagging peaks' : 'Enter your email to receive a reset link'}
      </p>
    </div>

    <div
      class="
        animate-fade-in-up rounded-lg overflow-hidden
        bg-white dark:bg-slate-800
        shadow-card border border-slate-200 dark:border-slate-700
      "
      style="animation-delay: 100ms"
    >
      <div class="h-0.5 bg-accent"></div>

      <div class="p-6 sm:p-8">
        {#if mode !== 'forgot'}
          <!-- Google OAuth -->
          <button
            onclick={handleGoogleLogin}
            disabled={loading}
            class="
              w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
              border border-slate-300 dark:border-slate-500
              bg-white dark:bg-slate-700
              text-slate-700 dark:text-slate-200 font-medium
              hover:bg-slate-50 dark:hover:bg-slate-600
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200 dark:border-slate-600"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                or continue with email
              </span>
            </div>
          </div>
        {/if}

        <!-- Email/Password Form -->
        <form onsubmit={handleSubmit} class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              required
              class="
                w-full px-4 py-2.5 rounded-xl
                border border-slate-200 dark:border-slate-600
                bg-white dark:bg-slate-700
                text-slate-900 dark:text-white
                focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20
                transition-all duration-200
              "
              placeholder="you@example.com"
            />
          </div>

          {#if mode !== 'forgot'}
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {#if mode === 'login'}
                  <button
                    type="button"
                    onclick={() => { mode = 'forgot'; error = null; message = null; }}
                    class="text-xs text-accent hover:text-accent-warm transition-colors"
                  >
                    Forgot password?
                  </button>
                {/if}
              </div>
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
                placeholder="••••••••"
              />
            </div>
          {/if}

          {#if error}
            <div class="p-3 rounded-lg bg-semantic-danger/5 dark:bg-semantic-danger/15 text-semantic-danger-dark dark:text-semantic-danger-light text-sm">
              {error}
            </div>
          {/if}

          {#if message}
            <div class="p-3 rounded-lg bg-semantic-success/5 dark:bg-semantic-success/15 text-semantic-success-dark dark:text-semantic-success-light text-sm">
              {message}
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
              {mode === 'login' ? 'Log In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            {/if}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          {#if mode === 'forgot'}
            Remember your password?
            <button
              onclick={() => { mode = 'login'; error = null; message = null; }}
              class="font-medium text-accent hover:text-accent-warm transition-colors"
            >
              Log in
            </button>
          {:else if mode === 'login'}
            Don't have an account?
            <button
              onclick={() => mode = 'signup'}
              class="font-medium text-accent hover:text-accent-warm transition-colors"
            >
              Sign up
            </button>
          {:else}
            Already have an account?
            <button
              onclick={() => mode = 'login'}
              class="font-medium text-accent hover:text-accent-warm transition-colors"
            >
              Log in
            </button>
          {/if}
        </p>
      </div>
    </div>
  </div>
</Container>

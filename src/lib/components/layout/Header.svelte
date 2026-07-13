<script lang="ts">
  import ThemeToggle from './ThemeToggle.svelte';
  import Container from '../ui/Container.svelte';
  import SearchModal from '../search/SearchModal.svelte';
  import type { Session } from '@supabase/supabase-js';
  import type { Tables } from '$lib/types/database';

  type Peak = Pick<Tables<'peaks'>, 'id' | 'name' | 'slug' | 'elevation' | 'rank' | 'range'>;

  interface Props {
    session?: Session | null;
    profile?: { display_name?: string; avatar_url?: string } | null;
    peaks?: Peak[];
    isAdmin?: boolean;
    transparent?: boolean;
  }

  let { session = null, profile = null, peaks = [], isAdmin = false, transparent = false }: Props = $props();

  let scrolled = $state(false);

  function handleScroll() {
    scrolled = window.scrollY > 50;
  }

  let isMobileMenuOpen = $state(false);
  let userMenuOpen = $state(false);
  let searchOpen = $state(false);

  const navLinks = [
    { href: '/peaks', label: 'Peaks' },
    { href: '/ranges', label: 'Ranges' },
    { href: '/community', label: 'Community' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/map', label: 'Map' },
    { href: '/learn', label: 'Learn' },
    { href: '/blog', label: 'Blog' },
    { href: '/pricing', label: 'Pricing' }
  ];

  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }

  function closeUserMenu() {
    userMenuOpen = false;
  }

  function openSearch() {
    searchOpen = true;
  }

  function closeSearch() {
    searchOpen = false;
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchOpen = !searchOpen;
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} onscroll={handleScroll} />

<header
  class="
    fixed top-0 left-0 right-0 z-50
    transition-all duration-300
    {transparent && !scrolled
      ? 'bg-transparent border-b border-transparent'
      : 'bg-white/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80 dark:bg-slate-900/80'}
  "
>
  <Container size="wide">
    <nav class="flex h-16 items-center justify-between">
      <!-- Logo -->
      <a
        href="/"
        class="group flex items-center gap-2.5 text-xl font-bold {transparent && !scrolled ? 'text-white' : 'text-mountain-blue dark:text-white'}"
      >
        <span class="inline-flex items-center justify-center rounded-full transition-all duration-300 h-11 w-11 {transparent && !scrolled ? 'bg-white/90' : 'dark:bg-white'}">
          <img
            src="/brand/SaltGoat_LogoGoat.png"
            alt=""
            class="h-8 w-auto transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            aria-hidden="true"
          />
        </span>
        <span class="font-display text-2xl tracking-tight">SaltGoat</span>
      </a>

      <!-- Desktop Nav -->
      <div class="hidden items-center gap-1 md:flex">
        <!-- Search Button -->
        <button
          onclick={openSearch}
          class="
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mr-2
            {transparent && !scrolled
              ? 'text-white/70 hover:bg-white/10 hover:text-white'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'}
            transition-colors
          "
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <kbd class="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium {transparent && !scrolled ? 'bg-white/10 text-white/50' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}">
            <span>⌘</span>K
          </kbd>
        </button>

        <div class="h-5 w-px mx-2 {transparent && !scrolled ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}"></div>

        {#each navLinks as link}
          <a
            href={link.href}
            class="
              relative px-2.5 py-2 font-medium text-sm
              transition-colors duration-200
              {transparent && !scrolled
                ? 'text-white/80 hover:text-white'
                : 'text-slate-600 hover:text-mountain-blue dark:text-slate-300 dark:hover:text-white'}
              after:absolute after:inset-x-1 after:bottom-0.5 after:h-0.5
              after:bg-accent after:scale-x-0 after:transition-transform after:duration-300
              hover:after:scale-x-100
            "
          >
            {link.label}
          </a>
        {/each}

        <div class="h-5 w-px mx-2 {transparent && !scrolled ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}"></div>

        <ThemeToggle />

        <!-- Auth -->
        {#if session}
          <a
            href="/profile"
            class="
              relative px-2.5 py-2 font-medium text-sm
              transition-colors duration-200
              {transparent && !scrolled
                ? 'text-accent-light hover:text-white'
                : 'text-accent hover:text-accent-warm dark:text-accent-light dark:hover:text-white'}
              after:absolute after:inset-x-1 after:bottom-0.5 after:h-0.5
              after:bg-accent after:scale-x-0 after:transition-transform after:duration-300
              hover:after:scale-x-100
            "
          >
            My 58
          </a>
          <div class="relative">
            <button
              onclick={() => userMenuOpen = !userMenuOpen}
              class="
                flex items-center justify-center
                h-9 w-9 rounded-full
                border-2 border-transparent
                hover:border-accent transition-colors
                focus:outline-none focus:border-accent
              "
              aria-label="User menu"
            >
              {#if profile?.avatar_url}
                <img src={profile.avatar_url} alt="" class="h-9 w-9 rounded-full" />
              {:else}
                <div class="h-9 w-9 rounded-full bg-gradient-to-br from-accent to-accent-warm flex items-center justify-center">
                  <span class="text-white font-bold text-sm">
                    {(profile?.display_name || 'H').charAt(0).toUpperCase()}
                  </span>
                </div>
              {/if}
            </button>

            {#if userMenuOpen}
              <div
                class="
                  absolute right-0 mt-2 w-56 rounded-xl overflow-hidden
                  bg-white dark:bg-slate-800 shadow-card-elevated
                  border border-slate-200 dark:border-slate-700
                  animate-fade-in-up
                "
              >
                <!-- User info header -->
                <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <div class="font-medium text-slate-900 dark:text-white truncate">
                    {profile?.display_name || 'Hiker'}
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">View your profile</div>
                </div>

                <a
                  href="/profile"
                  onclick={closeUserMenu}
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <svg class="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
                  </svg>
                  My 58 Progress
                </a>
                {#if isAdmin}
                  <a
                    href="/admin"
                    onclick={closeUserMenu}
                    class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <svg class="h-4 w-4 text-semantic-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Admin
                  </a>
                {/if}
                <form action="/auth/logout" method="POST">
                  <button
                    type="submit"
                    class="w-full flex items-center gap-3 text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700"
                  >
                    <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                  </button>
                </form>
              </div>
            {/if}
          </div>
        {:else}
          <a
            href="/auth"
            class="
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              {transparent && !scrolled
                ? 'bg-white/15 text-white border border-white/25 hover:bg-white/25'
                : 'bg-accent text-white hover:bg-accent-warm'}
            "
          >
            Log In
          </a>
        {/if}
      </div>

      <!-- Mobile Menu Button -->
      <div class="flex items-center gap-2 md:hidden">
        <!-- Mobile Search Button -->
        <button
          onclick={openSearch}
          class="tap-target flex items-center justify-center rounded-lg p-2 transition-colors {transparent && !scrolled ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-mountain-blue dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'}"
          aria-label="Search"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <ThemeToggle />
        <button
          class="
            tap-target flex items-center justify-center rounded-lg p-2
            transition-colors
            {transparent && !scrolled
              ? 'text-white/80 hover:bg-white/10 hover:text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-mountain-blue dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'}
          "
          onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {#if isMobileMenuOpen}
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            {:else}
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            {/if}
          </svg>
        </button>
      </div>
    </nav>

    <!-- Mobile Menu -->
    {#if isMobileMenuOpen}
      <div
        class="
          border-t border-slate-200 py-4 md:hidden dark:border-slate-700
          animate-fade-in-down
        "
      >
        <div class="flex flex-col gap-1">
          {#each navLinks as link, i}
            <a
              href={link.href}
              class="
                tap-target flex items-center rounded-lg px-4 py-3
                text-lg font-medium text-slate-700
                transition-all duration-200
                hover:bg-accent/10 hover:text-accent
                dark:text-slate-200 dark:hover:bg-accent/20
                animate-fade-in-up
              "
              style="animation-delay: {i * 50}ms"
              onclick={closeMobileMenu}
            >
              {link.label}
            </a>
          {/each}

          <!-- Mobile Auth -->
          <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            {#if session}
              <!-- My 58 prominent link -->
              <a
                href="/profile"
                onclick={closeMobileMenu}
                class="
                  flex items-center gap-3 mx-4 mb-4 px-4 py-3 rounded-xl
                  bg-gradient-to-r from-accent/10 to-accent-warm/10
                  border border-accent/30
                  hover:from-accent/20 hover:to-accent-warm/20
                "
              >
                <div class="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <svg class="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
                  </svg>
                </div>
                <div>
                  <span class="font-semibold text-accent">My 58</span>
                  <span class="block text-xs text-slate-500 dark:text-slate-400">Track your summits</span>
                </div>
              </a>

              <div class="flex items-center gap-3 px-4 py-2 mb-2">
                {#if profile?.avatar_url}
                  <img src={profile.avatar_url} alt="" class="h-8 w-8 rounded-full" />
                {:else}
                  <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <svg class="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                    </svg>
                  </div>
                {/if}
                <span class="text-sm text-slate-600 dark:text-slate-300">{profile?.display_name || 'Hiker'}</span>
              </div>
              <form action="/auth/logout" method="POST">
                <button
                  type="submit"
                  class="w-full text-left px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                >
                  Log Out
                </button>
              </form>
            {:else}
              <a
                href="/auth"
                onclick={closeMobileMenu}
                class="block mx-4 py-3 text-center rounded-lg bg-accent text-white font-medium hover:bg-accent-warm transition-colors"
              >
                Log In
              </a>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </Container>
</header>

<!-- Search Modal -->
<SearchModal {peaks} open={searchOpen} onClose={closeSearch} />

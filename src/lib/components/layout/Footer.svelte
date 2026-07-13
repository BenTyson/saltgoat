<script lang="ts">
  import Container from '../ui/Container.svelte';

  const currentYear = new Date().getFullYear();
</script>

<footer
  class="relative border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 overflow-hidden"
>
  <!-- Decorative mountain silhouette -->
  <div class="absolute inset-x-0 top-0 h-16 pointer-events-none">
    <svg
      class="absolute bottom-0 h-16 w-full text-slate-100 dark:text-slate-700"
      preserveAspectRatio="none"
      viewBox="0 0 1200 80"
      fill="currentColor"
    >
      <path
        d="M0,80 L0,60 L200,40 L400,55 L600,30 L800,50 L1000,35 L1200,45 L1200,80 Z"
      />
    </svg>
  </div>

  <Container size="wide" class="relative py-12">
    <div class="flex flex-col items-center justify-between gap-6 sm:flex-row">
      <!-- Logo and tagline -->
      <div class="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
        <a href="/" class="group flex items-center gap-2">
          <span class="inline-flex items-center justify-center rounded-full h-10 w-10 dark:bg-white">
            <img
              src="/brand/SaltGoat_LogoGoat.png"
              alt=""
              class="h-7 w-auto transition-transform duration-300 group-hover:scale-110"
              aria-hidden="true"
            />
          </span>
          <span
            class="font-display text-xl font-semibold text-slate-700 dark:text-slate-200"
          >
            SaltGoat
          </span>
        </a>
        <span class="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
        <span class="text-sm text-slate-500 dark:text-slate-400">
          The modern guide to Colorado's 14ers
        </span>
      </div>

      <!-- Links + Copyright -->
      <div class="flex flex-col items-center gap-2 sm:items-end">
        <div class="flex items-center gap-4 text-sm">
          <a href="/pricing" class="text-slate-500 dark:text-slate-400 hover:text-accent transition-colors">Pricing</a>
          <a href="/guidelines" class="text-slate-500 dark:text-slate-400 hover:text-accent transition-colors">Guidelines</a>
          <a href="/legal/terms" class="text-slate-500 dark:text-slate-400 hover:text-accent transition-colors">Terms</a>
          <a href="/legal/privacy" class="text-slate-500 dark:text-slate-400 hover:text-accent transition-colors">Privacy</a>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          &copy; {currentYear} SaltGoat. All rights reserved.
        </p>
      </div>
    </div>

    <!-- Disclaimer with icon -->
    <div
      class="
        mt-8 flex items-start gap-3 rounded-xl
        bg-slate-100 dark:bg-slate-700/50 p-4
        border border-slate-200 dark:border-slate-600
      "
    >
      <svg
        class="h-5 w-5 flex-shrink-0 text-accent mt-0.5"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fill-rule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clip-rule="evenodd"
        />
      </svg>
      <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        <strong class="text-slate-600 dark:text-slate-300">Safety Notice:</strong>
        Mountain climbing is inherently dangerous. Always check current conditions, prepare properly,
        and make your own safety decisions. This site is for informational purposes only.
      </p>
    </div>
  </Container>
</footer>

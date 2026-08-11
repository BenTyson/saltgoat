<script lang="ts">
  import Container from '../ui/Container.svelte';

  const currentYear = new Date().getFullYear();
</script>

<footer class="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
  <Container size="wide" class="py-12">
    <div class="flex flex-col items-center justify-between gap-6 sm:flex-row">
      <!-- Logo and tagline -->
      <div class="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
        <a href="/" class="flex items-center gap-2.5">
          <span class="inline-flex items-center justify-center rounded-full h-10 w-10 dark:bg-white">
            <img
              src="/brand/SaltGoat_LogoGoat.png"
              alt=""
              class="h-7 w-auto"
              aria-hidden="true"
            />
          </span>
          <span class="font-display font-normal text-xl text-slate-800 dark:text-slate-100">
            SaltGoat
          </span>
        </a>
        <span class="hidden sm:inline h-4 w-px bg-slate-200 dark:bg-slate-700"></span>
        <span class="text-sm text-slate-500 dark:text-slate-400">
          A field guide to Colorado's fourteeners
        </span>
      </div>

      <!-- Links + Copyright -->
      <div class="flex flex-col items-center gap-2 sm:items-end">
        <div class="flex items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.14em]">
          <a href="/pricing" class="text-slate-500 dark:text-slate-400 hover:text-accent-dark dark:hover:text-accent transition-colors">Pricing</a>
          <a href="/guidelines" class="text-slate-500 dark:text-slate-400 hover:text-accent-dark dark:hover:text-accent transition-colors">Guidelines</a>
          <a href="/legal/terms" class="text-slate-500 dark:text-slate-400 hover:text-accent-dark dark:hover:text-accent transition-colors">Terms</a>
          <a href="/legal/privacy" class="text-slate-500 dark:text-slate-400 hover:text-accent-dark dark:hover:text-accent transition-colors">Privacy</a>
        </div>
        <p class="text-sm text-slate-400 dark:text-slate-500">
          &copy; {currentYear} SaltGoat. All rights reserved.
        </p>
      </div>
    </div>

    <!-- Disclaimer -->
    <div class="mt-10 border-t border-slate-100 dark:border-slate-800 pt-6">
      <p class="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-3xl">
        <span class="font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Safety notice</span>
        &nbsp;·&nbsp; Mountain climbing is inherently dangerous. Always check current conditions, prepare
        properly, and make your own safety decisions. This site is for informational purposes only.
      </p>
    </div>
  </Container>
</footer>

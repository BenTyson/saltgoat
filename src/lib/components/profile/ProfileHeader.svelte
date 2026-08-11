<script lang="ts">
  import type { Database } from '$lib/types/database';

  type Profile = Database['public']['Tables']['profiles']['Row'];
  type Peak = {
    id: string;
    name: string;
    slug: string;
  };

  interface Props {
    profile: Profile;
    favoritePeak?: Peak | null;
    isOwnProfile?: boolean;
    isPro?: boolean;
    onEditClick?: () => void;
  }

  let { profile, favoritePeak = null, isOwnProfile = false, isPro = false, onEditClick }: Props = $props();

  const memberSince = $derived(
    profile.created_at
      ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : null
  );

  const initials = $derived(
    profile.display_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  );

  const hasAnySocialLinks = $derived(
    profile.website_url || profile.instagram_handle || profile.strava_athlete_id
  );
</script>

<!-- Cover Photo -->
<div class="relative h-36 sm:h-48 md:h-56 bg-gradient-to-br from-mountain-blue via-mountain-mist to-accent overflow-hidden">
  {#if profile.cover_image_url}
    <img
      src={profile.cover_image_url}
      alt="Cover"
      class="w-full h-full object-cover"
    />
  {/if}
</div>

<!-- Profile Info Section -->
<div class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <div class="flex flex-col sm:flex-row gap-5 sm:gap-6">
      <!-- Avatar -->
      <div class="flex-shrink-0">
        {#if profile.avatar_url}
          <img
            src={profile.avatar_url}
            alt={profile.display_name || 'Profile'}
            class="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-2xl shadow-lg object-cover ring-4 ring-white dark:ring-slate-800 bg-white dark:bg-slate-800"
          />
        {:else}
          <div class="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-2xl shadow-lg bg-accent flex items-center justify-center ring-4 ring-white dark:ring-slate-800">
            <span class="text-4xl sm:text-5xl font-bold text-white">{initials}</span>
          </div>
        {/if}
      </div>

      <!-- Info Column -->
      <div class="flex-1 min-w-0">
        <!-- Name row + edit button -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
              {profile.display_name || 'Peak Bagger'}
              {#if isPro}
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">PRO</span>
              {/if}
            </h1>

            {#if profile.tagline}
              <p class="text-slate-500 dark:text-slate-400 mt-1">{profile.tagline}</p>
            {/if}
          </div>

          {#if isOwnProfile && onEditClick}
            <button
              onclick={onEditClick}
              class="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Profile
            </button>
          {/if}
        </div>

        <!-- Metadata -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-slate-500 dark:text-slate-400">
          {#if profile.username}
            <span>@{profile.username}</span>
          {/if}
          {#if profile.location}
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {profile.location}
            </span>
          {/if}
          {#if memberSince}
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Member since {memberSince}
            </span>
          {/if}
          {#if profile.years_hiking}
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {profile.years_hiking}+ years hiking
            </span>
          {/if}
        </div>

        <!-- Bio -->
        {#if profile.bio}
          <p class="mt-4 text-slate-700 dark:text-slate-300 max-w-xl leading-relaxed">
            {profile.bio}
          </p>
        {/if}

        <!-- Favorite Peak + Social Links -->
        {#if favoritePeak || hasAnySocialLinks}
          <div class="flex flex-wrap items-center gap-4 mt-4">
            {#if favoritePeak}
              <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                Favorite: <a href="/peaks/{favoritePeak.slug}" class="hover:underline">{favoritePeak.name}</a>
              </div>
            {/if}

            {#if hasAnySocialLinks}
              <div class="flex items-center gap-1">
                {#if profile.website_url}
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    title="Website"
                  >
                    <svg class="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </a>
                {/if}
                {#if profile.instagram_handle}
                  <a
                    href="https://instagram.com/{profile.instagram_handle}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    title="Instagram"
                  >
                    <svg class="w-5 h-5 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                {/if}
                {#if profile.strava_athlete_id}
                  <a
                    href="https://www.strava.com/athletes/{profile.strava_athlete_id}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    title="Strava"
                  >
                    <svg class="w-5 h-5 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                    </svg>
                  </a>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

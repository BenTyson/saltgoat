<script lang="ts">
  import type { Database } from '$lib/types/database';
  import type { SupabaseClient } from '@supabase/supabase-js';

  type Profile = Database['public']['Tables']['profiles']['Row'];
  type Peak = {
    id: string;
    name: string;
  };

  interface Props {
    open: boolean;
    profile: Profile;
    peaks: Peak[];
    supabase: SupabaseClient<Database>;
    onClose: () => void;
    onSave: (updates: Partial<Profile>) => Promise<void>;
  }

  let { open, profile, peaks, supabase, onClose, onSave }: Props = $props();

  // Form state
  let displayName = $state(profile.display_name || '');
  let username = $state(profile.username || '');
  let tagline = $state(profile.tagline || '');
  let bio = $state(profile.bio || '');
  let location = $state(profile.location || '');
  let websiteUrl = $state(profile.website_url || '');
  let instagramHandle = $state(profile.instagram_handle || '');
  let stravaAthleteId = $state(profile.strava_athlete_id || '');
  let favoritePeakId = $state(profile.favorite_peak_id || '');
  let yearsHiking = $state<number | null>(profile.years_hiking);

  let avatarUrl = $state(profile.avatar_url || '');
  let coverImageUrl = $state(profile.cover_image_url || '');

  let isSubmitting = $state(false);
  let uploadingAvatar = $state(false);
  let uploadingCover = $state(false);
  let error = $state<string | null>(null);

  // Reset form when profile changes
  $effect(() => {
    if (open) {
      displayName = profile.display_name || '';
      username = profile.username || '';
      tagline = profile.tagline || '';
      bio = profile.bio || '';
      location = profile.location || '';
      websiteUrl = profile.website_url || '';
      instagramHandle = profile.instagram_handle || '';
      stravaAthleteId = profile.strava_athlete_id || '';
      favoritePeakId = profile.favorite_peak_id || '';
      yearsHiking = profile.years_hiking;
      avatarUrl = profile.avatar_url || '';
      coverImageUrl = profile.cover_image_url || '';
      error = null;
    }
  });

  async function uploadImage(file: File, type: 'avatar' | 'cover'): Promise<string | null> {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      error = `${type === 'avatar' ? 'Avatar' : 'Cover photo'} must be less than 5MB`;
      return null;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      error = 'Please upload a JPEG, PNG, WebP, or GIF image';
      return null;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${profile.id}/${type}-${Date.now()}.${ext}`;

    const { error: uploadError, data } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      error = `Failed to upload image: ${uploadError.message}`;
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  async function handleAvatarChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadingAvatar = true;
    error = null;

    const url = await uploadImage(file, 'avatar');
    if (url) {
      avatarUrl = url;
    }

    uploadingAvatar = false;
    input.value = '';
  }

  async function handleCoverChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadingCover = true;
    error = null;

    const url = await uploadImage(file, 'cover');
    if (url) {
      coverImageUrl = url;
    }

    uploadingCover = false;
    input.value = '';
  }

  function removeCover() {
    coverImageUrl = '';
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    isSubmitting = true;
    error = null;

    try {
      const updates: Partial<Profile> = {
        display_name: displayName || null,
        username: username || null,
        tagline: tagline || null,
        bio: bio || null,
        location: location || null,
        website_url: websiteUrl || null,
        instagram_handle: instagramHandle?.replace('@', '') || null,
        strava_athlete_id: stravaAthleteId || null,
        favorite_peak_id: favoritePeakId || null,
        years_hiking: yearsHiking,
        avatar_url: avatarUrl || null,
        cover_image_url: coverImageUrl || null
      };

      await onSave(updates);
      onClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save profile';
    } finally {
      isSubmitting = false;
    }
  }

  const initials = $derived(
    displayName
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  );
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
    onclick={onClose}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    role="button"
    tabindex="-1"
  ></div>

  <!-- Modal -->
  <div
    class="
      fixed inset-x-4 top-[3vh] z-50
      mx-auto max-w-2xl
      max-h-[94vh] overflow-y-auto
      rounded-2xl bg-white dark:bg-slate-800
      shadow-2xl
      animate-fade-in-up
    "
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <!-- Header -->
    <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4">
      <h2 id="modal-title" class="text-lg font-bold text-slate-900 dark:text-white">
        Edit Profile
      </h2>
      <button
        onclick={onClose}
        class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        aria-label="Close modal"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <form onsubmit={handleSubmit} class="p-6 space-y-6">
      {#if error}
        <div class="rounded-lg bg-semantic-danger/5 dark:bg-semantic-danger/15 border border-semantic-danger/20 dark:border-semantic-danger-dark p-4 text-sm text-semantic-danger-dark dark:text-semantic-danger-light">
          {error}
        </div>
      {/if}

      <!-- Cover Photo -->
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          Cover Photo
        </label>
        <div class="relative h-32 rounded-lg overflow-hidden bg-gradient-to-br from-mountain-blue via-mountain-mist to-accent">
          {#if coverImageUrl}
            <img src={coverImageUrl} alt="Cover" class="w-full h-full object-cover" />
            <button
              type="button"
              onclick={removeCover}
              class="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Remove cover photo"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
          <label class="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black/20 transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onchange={handleCoverChange}
              class="sr-only"
              disabled={uploadingCover}
            />
            {#if uploadingCover}
              <div class="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/50 text-white text-sm">
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </div>
            {:else if !coverImageUrl}
              <div class="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/50 text-white text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add cover photo
              </div>
            {/if}
          </label>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Recommended: 1200x400px, max 5MB</p>
      </div>

      <!-- Avatar -->
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          Profile Photo
        </label>
        <div class="flex items-center gap-4">
          <div class="relative">
            {#if avatarUrl}
              <img
                src={avatarUrl}
                alt="Avatar"
                class="w-20 h-20 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600"
              />
            {:else}
              <div class="w-20 h-20 rounded-full bg-accent flex items-center justify-center border-2 border-slate-200 dark:border-slate-600">
                <span class="text-xl font-bold text-white">{initials}</span>
              </div>
            {/if}
            <label class="absolute inset-0 flex items-center justify-center rounded-full cursor-pointer hover:bg-black/20 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onchange={handleAvatarChange}
                class="sr-only"
                disabled={uploadingAvatar}
              />
            </label>
          </div>
          <div class="flex-1">
            <label class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onchange={handleAvatarChange}
                class="sr-only"
                disabled={uploadingAvatar}
              />
              {#if uploadingAvatar}
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              {:else}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Change photo
              {/if}
            </label>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Square image, max 5MB</p>
          </div>
        </div>
      </div>

      <!-- Basic Info -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="display_name" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            id="display_name"
            bind:value={displayName}
            maxlength="50"
            class="
              w-full rounded-lg border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700
              px-4 py-2.5
              text-slate-900 dark:text-white
              focus:border-accent focus:ring-2 focus:ring-accent/20
              transition-colors
            "
          />
        </div>
        <div>
          <label for="username" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Username
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
            <input
              type="text"
              id="username"
              bind:value={username}
              maxlength="30"
              pattern="[a-zA-Z0-9_]+"
              class="
                w-full rounded-lg border border-slate-300 dark:border-slate-600
                bg-white dark:bg-slate-700
                pl-8 pr-4 py-2.5
                text-slate-900 dark:text-white
                focus:border-accent focus:ring-2 focus:ring-accent/20
                transition-colors
              "
            />
          </div>
        </div>
      </div>

      <!-- Tagline -->
      <div>
        <label for="tagline" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Tagline
        </label>
        <input
          type="text"
          id="tagline"
          bind:value={tagline}
          maxlength="100"
          placeholder="A short description that appears under your name"
          class="
            w-full rounded-lg border border-slate-300 dark:border-slate-600
            bg-white dark:bg-slate-700
            px-4 py-2.5
            text-slate-900 dark:text-white
            focus:border-accent focus:ring-2 focus:ring-accent/20
            transition-colors
          "
        />
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{tagline.length}/100</p>
      </div>

      <!-- Bio -->
      <div>
        <label for="bio" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Bio
        </label>
        <textarea
          id="bio"
          bind:value={bio}
          rows="3"
          maxlength="500"
          placeholder="Tell others about yourself and your hiking journey..."
          class="
            w-full rounded-lg border border-slate-300 dark:border-slate-600
            bg-white dark:bg-slate-700
            px-4 py-2.5
            text-slate-900 dark:text-white
            focus:border-accent focus:ring-2 focus:ring-accent/20
            transition-colors resize-none
          "
        ></textarea>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{bio.length}/500</p>
      </div>

      <!-- Location & Experience -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="location" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Location
          </label>
          <input
            type="text"
            id="location"
            bind:value={location}
            maxlength="100"
            placeholder="Denver, CO"
            class="
              w-full rounded-lg border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700
              px-4 py-2.5
              text-slate-900 dark:text-white
              focus:border-accent focus:ring-2 focus:ring-accent/20
              transition-colors
            "
          />
        </div>
        <div>
          <label for="years_hiking" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Years Hiking
          </label>
          <input
            type="number"
            id="years_hiking"
            bind:value={yearsHiking}
            min="0"
            max="100"
            placeholder="e.g., 5"
            class="
              w-full rounded-lg border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700
              px-4 py-2.5
              text-slate-900 dark:text-white
              focus:border-accent focus:ring-2 focus:ring-accent/20
              transition-colors
            "
          />
        </div>
      </div>

      <!-- Favorite Peak -->
      <div>
        <label for="favorite_peak" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          Favorite 14er
        </label>
        <select
          id="favorite_peak"
          bind:value={favoritePeakId}
          class="
            w-full rounded-lg border border-slate-300 dark:border-slate-600
            bg-white dark:bg-slate-700
            px-4 py-2.5
            text-slate-900 dark:text-white
            focus:border-accent focus:ring-2 focus:ring-accent/20
            transition-colors
          "
        >
          <option value="">No favorite selected</option>
          {#each peaks as peak}
            <option value={peak.id}>{peak.name}</option>
          {/each}
        </select>
      </div>

      <!-- Social Links -->
      <div class="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-4">Social Links</h3>

        <div class="space-y-4">
          <div>
            <label for="website_url" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Website
            </label>
            <input
              type="url"
              id="website_url"
              bind:value={websiteUrl}
              placeholder="https://yourwebsite.com"
              class="
                w-full rounded-lg border border-slate-300 dark:border-slate-600
                bg-white dark:bg-slate-700
                px-4 py-2.5
                text-slate-900 dark:text-white
                focus:border-accent focus:ring-2 focus:ring-accent/20
                transition-colors
              "
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="instagram" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Instagram
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                <input
                  type="text"
                  id="instagram"
                  bind:value={instagramHandle}
                  maxlength="30"
                  placeholder="username"
                  class="
                    w-full rounded-lg border border-slate-300 dark:border-slate-600
                    bg-white dark:bg-slate-700
                    pl-8 pr-4 py-2.5
                    text-slate-900 dark:text-white
                    focus:border-accent focus:ring-2 focus:ring-accent/20
                    transition-colors
                  "
                />
              </div>
            </div>
            <div>
              <label for="strava" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Strava Athlete ID
              </label>
              <input
                type="text"
                id="strava"
                bind:value={stravaAthleteId}
                maxlength="20"
                placeholder="12345678"
                class="
                  w-full rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700
                  px-4 py-2.5
                  text-slate-900 dark:text-white
                  focus:border-accent focus:ring-2 focus:ring-accent/20
                  transition-colors
                "
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploadingAvatar || uploadingCover}
          class="
            px-6 py-2.5 rounded-lg
            bg-accent
            text-white text-sm font-semibold
            hover:bg-accent-light
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300
            shadow-md hover:shadow-lg
          "
        >
          {#if isSubmitting}
            <span class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          {:else}
            Save Changes
          {/if}
        </button>
      </div>
    </form>
  </div>
{/if}

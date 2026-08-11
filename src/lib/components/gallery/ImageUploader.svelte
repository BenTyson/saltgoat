<script lang="ts">
  import { PHOTO_CATEGORIES } from '$lib/data/categories';

  interface Props {
    peakId: string;
    onUpload: (file: File, caption: string, isPrivate: boolean, category: string) => Promise<void>;
  }

  let { peakId, onUpload }: Props = $props();

  let fileInput: HTMLInputElement;
  let selectedFile = $state<File | null>(null);
  let caption = $state('');
  let category = $state('');
  let isPrivate = $state(false);
  let isUploading = $state(false);
  let isDragging = $state(false);
  let previewUrl = $state<string | null>(null);
  let error = $state<string | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  function handleFileSelect(file: File | null) {
    error = null;

    if (!file) {
      selectedFile = null;
      previewUrl = null;
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      error = 'Please select a JPEG, PNG, or WebP image.';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      error = 'File size must be less than 10MB.';
      return;
    }

    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
  }

  function handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    handleFileSelect(target.files?.[0] || null);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    handleFileSelect(e.dataTransfer?.files?.[0] || null);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function clearSelection() {
    selectedFile = null;
    caption = '';
    category = '';
    isPrivate = false;
    previewUrl = null;
    error = null;
    if (fileInput) fileInput.value = '';
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    isUploading = true;
    error = null;

    try {
      await onUpload(selectedFile, caption, isPrivate, category);
      clearSelection();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Upload failed. Please try again.';
    } finally {
      isUploading = false;
    }
  }
</script>

<div class="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-6">
  <form onsubmit={handleSubmit}>
    {#if !selectedFile}
      <!-- Drop zone -->
      <div
        class="
          flex flex-col items-center justify-center py-8 cursor-pointer
          {isDragging ? 'bg-accent/10 border-accent' : ''}
        "
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        onclick={() => fileInput.click()}
        onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
        role="button"
        tabindex="0"
      >
        <div class="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
          <svg class="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p class="text-slate-700 dark:text-slate-200 font-medium mb-1">
          Add a photo
        </p>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Drag and drop or click to browse
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-2">
          JPEG, PNG, or WebP up to 10MB
        </p>
      </div>

      <input
        bind:this={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        onchange={handleInputChange}
      />
    {:else}
      <!-- Preview -->
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative w-full sm:w-48 aspect-square rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={previewUrl}
            alt="Preview"
            class="w-full h-full object-cover"
          />
          <button
            type="button"
            onclick={clearSelection}
            class="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Remove image"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 flex flex-col">
          <label for="caption" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
            Caption (optional)
          </label>
          <textarea
            id="caption"
            bind:value={caption}
            rows="3"
            placeholder="Describe this photo..."
            class="
              flex-1 w-full rounded-lg border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700
              px-4 py-2.5
              text-slate-900 dark:text-white text-sm
              focus:border-accent focus:ring-2 focus:ring-accent/20
              transition-colors resize-none
            "
          ></textarea>

          <label for="category" class="block text-sm font-medium text-slate-700 dark:text-slate-200 mt-3 mb-1.5">
            Category (optional)
          </label>
          <select
            id="category"
            bind:value={category}
            class="
              w-full rounded-lg border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700
              px-4 py-2.5
              text-slate-900 dark:text-white text-sm
              focus:border-accent focus:ring-2 focus:ring-accent/20
              transition-colors
            "
          >
            <option value="">No category</option>
            {#each PHOTO_CATEGORIES as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>

          <label class="mt-3 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={isPrivate}
              class="rounded border-slate-300 dark:border-slate-600 text-accent focus:ring-accent"
            />
            <span class="text-sm text-slate-600 dark:text-slate-400">Private photo</span>
            <span class="text-xs text-slate-400 dark:text-slate-500">(only visible to you)</span>
          </label>

          <button
            type="submit"
            disabled={isUploading}
            class="
              mt-3 w-full sm:w-auto px-6 py-2.5 rounded-lg
              bg-accent
              text-white font-medium
              hover:bg-accent-light
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300
            "
          >
            {#if isUploading}
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </span>
            {:else}
              Upload Photo
            {/if}
          </button>
        </div>
      </div>
    {/if}

    {#if error}
      <p class="mt-3 text-sm text-semantic-danger-dark dark:text-semantic-danger-light">{error}</p>
    {/if}
  </form>
</div>

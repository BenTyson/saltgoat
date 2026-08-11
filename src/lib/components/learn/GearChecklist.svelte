<script lang="ts">
  interface Props {
    variant: 'summer' | 'shoulder';
  }

  let { variant }: Props = $props();

  interface ChecklistItem {
    id: string;
    label: string;
    category: string;
  }

  const summerItems: ChecklistItem[] = [
    // Clothing
    { id: 'base-layer', label: 'Moisture-wicking base layer', category: 'Clothing' },
    { id: 'hiking-pants', label: 'Hiking pants or shorts', category: 'Clothing' },
    { id: 'mid-layer', label: 'Fleece or light puffy jacket', category: 'Clothing' },
    { id: 'wind-shell', label: 'Wind/rain shell', category: 'Clothing' },
    { id: 'warm-hat', label: 'Warm hat (for summit)', category: 'Clothing' },
    { id: 'sun-hat', label: 'Sun hat or cap', category: 'Clothing' },
    { id: 'gloves', label: 'Lightweight gloves', category: 'Clothing' },
    { id: 'hiking-socks', label: 'Wool or synthetic hiking socks', category: 'Clothing' },
    { id: 'trail-shoes', label: 'Trail runners or hiking boots', category: 'Clothing' },
    // Essentials
    { id: 'backpack', label: 'Daypack (20-30L)', category: 'Essentials' },
    { id: 'water', label: 'Water (3+ liters)', category: 'Essentials' },
    { id: 'food', label: 'Food + extra snacks', category: 'Essentials' },
    { id: 'headlamp', label: 'Headlamp + extra batteries', category: 'Essentials' },
    { id: 'sunscreen', label: 'Sunscreen (SPF 30+)', category: 'Essentials' },
    { id: 'sunglasses', label: 'Sunglasses', category: 'Essentials' },
    { id: 'first-aid', label: 'First aid kit', category: 'Essentials' },
    { id: 'navigation', label: 'Map/GPS/phone with offline maps', category: 'Essentials' },
    // Safety
    { id: 'emergency-blanket', label: 'Emergency blanket/bivy', category: 'Safety' },
    { id: 'fire-starter', label: 'Fire starter/matches', category: 'Safety' },
    { id: 'knife', label: 'Knife or multi-tool', category: 'Safety' },
    { id: 'whistle', label: 'Emergency whistle', category: 'Safety' },
    // Optional
    { id: 'trekking-poles', label: 'Trekking poles', category: 'Optional' },
    { id: 'camera', label: 'Camera', category: 'Optional' },
    { id: 'sit-pad', label: 'Sit pad for breaks', category: 'Optional' }
  ];

  const shoulderItems: ChecklistItem[] = [
    { id: 'microspikes', label: 'Microspikes or light crampons', category: 'Traction' },
    { id: 'gaiters', label: 'Gaiters (for snow)', category: 'Traction' },
    { id: 'ice-axe', label: 'Ice axe (if steep snow)', category: 'Traction' },
    { id: 'insulated-jacket', label: 'Heavier insulated jacket', category: 'Warmth' },
    { id: 'insulated-gloves', label: 'Insulated waterproof gloves', category: 'Warmth' },
    { id: 'balaclava', label: 'Balaclava or face protection', category: 'Warmth' },
    { id: 'extra-layers', label: 'Extra base layer (backup)', category: 'Warmth' },
    { id: 'goggles', label: 'Ski goggles (high wind/snow)', category: 'Protection' }
  ];

  const items = $derived(variant === 'summer' ? summerItems : shoulderItems);

  let checked = $state<Set<string>>(new Set());

  function toggle(id: string) {
    if (checked.has(id)) {
      checked.delete(id);
    } else {
      checked.add(id);
    }
    checked = new Set(checked);
  }

  const progress = $derived(Math.round((checked.size / items.length) * 100));

  // Group items by category
  const groupedItems = $derived(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    for (const item of items) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  });
</script>

<div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
  <!-- Header with progress -->
  <div class="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold text-slate-900 dark:text-white">
        {variant === 'summer' ? 'Summer Day Hike' : 'Shoulder Season Additions'}
      </h3>
      <span class="text-sm font-medium text-accent">{progress}% packed</span>
    </div>
    <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
      <div
        class="bg-accent h-2 rounded-full transition-all duration-300"
        style="width: {progress}%"
      ></div>
    </div>
  </div>

  <!-- Checklist items grouped by category -->
  <div class="p-4 space-y-6">
    {#each Object.entries(groupedItems()) as [category, categoryItems]}
      <div>
        <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          {category}
        </h4>
        <div class="space-y-1">
          {#each categoryItems as item}
            <label
              class="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={checked.has(item.id)}
                onchange={() => toggle(item.id)}
                class="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-accent focus:ring-accent"
              />
              <span
                class="text-slate-700 dark:text-slate-300 transition-all {checked.has(item.id)
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : ''}"
              >
                {item.label}
              </span>
            </label>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Footer -->
  {#if checked.size > 0}
    <div class="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
      <button
        onclick={() => (checked = new Set())}
        class="text-sm text-slate-500 dark:text-slate-400 hover:text-accent transition-colors"
      >
        Reset checklist
      </button>
    </div>
  {/if}
</div>

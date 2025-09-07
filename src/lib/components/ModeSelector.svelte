<script>
  import { mode, setMode, resetSelectionsToMode } from '$lib/stores/ui';
  import { getTranslation } from '$lib/modules/i18n/translations';
  import { selectedLanguage } from '$lib/modules/i18n/stores';

  const modes = [
    { id: 'learning', key: 'mode.learning' },
    { id: 'fun', key: 'mode.fun' },
    { id: 'chat', key: 'mode.chat' }
  ];

  function handleSelect(id) {
    setMode(id);
    resetSelectionsToMode();
  }
</script>

<div class="flex justify-center mb-4">
  {#each modes as m}
    <button
      aria-pressed={$mode === m.id}
      class="px-4 py-2 mx-1 rounded-token shadow-sm focus:outline-none focus:ring-2 focus:ring-accent {$mode ===
      m.id
        ? 'bg-accent text-white'
        : 'bg-white text-stone-600'}"
      on:click={() => handleSelect(m.id)}
    >
      {getTranslation($selectedLanguage, m.key)}
    </button>
  {/each}
</div>

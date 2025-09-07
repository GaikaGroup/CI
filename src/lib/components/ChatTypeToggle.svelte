<script>
  import { chatType, setChatType } from '$lib/stores/ui';
  import { getTranslation } from '$lib/modules/i18n/translations';
  import { selectedLanguage } from '$lib/modules/i18n/stores';
</script>

<div class="flex justify-center mb-4">
  <button
    aria-pressed={$chatType === 'text'}
    class="px-4 py-2 mx-1 rounded-token shadow-sm focus:outline-none focus:ring-2 focus:ring-accent {$chatType ===
    'text'
      ? 'bg-accent text-white'
      : 'bg-white text-stone-600'}"
    on:click={() => setChatType('text')}
  >
    {getTranslation($selectedLanguage, 'chat.type.text')}
  </button>
  <button
    aria-pressed={$chatType === 'voice'}
    class="px-4 py-2 mx-1 rounded-token shadow-sm focus:outline-none focus:ring-2 focus:ring-accent {$chatType ===
    'voice'
      ? 'bg-accent text-white'
      : 'bg-white text-stone-600'}"
    on:click={() => setChatType('voice')}
  >
    {getTranslation($selectedLanguage, 'chat.type.voice')}
  </button>
</div>

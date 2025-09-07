<script>
  import { setActivity } from '$lib/stores/ui';
  import { getTranslation } from '$lib/modules/i18n/translations';
  import { selectedLanguage } from '$lib/modules/i18n/stores';
  const activities = ['anecdotes', 'motivation', 'wisdom', 'facts', 'riddles', 'stories'];
</script>

<div class="grid grid-cols-2 gap-4">
  {#each activities as a}
    <button
      class="bg-white rounded-token shadow-subtle p-4 text-center hover:bg-accent hover:text-white transition"
      on:click={() => setActivity(a)}
    >
      {getTranslation($selectedLanguage, `fun.${a}`)}
    </button>
  {/each}
</div>

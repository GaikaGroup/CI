<script>
  import { setSubject } from '$lib/stores/ui';
  import { getTranslation } from '$lib/modules/i18n/translations';
  import { selectedLanguage } from '$lib/modules/i18n/stores';
  const subjects = ['math', 'english', 'literature', 'physics', 'chemistry', 'history'];
</script>

<div class="grid grid-cols-2 gap-4">
  {#each subjects as s}
    <button
      class="bg-white rounded-token shadow-subtle p-4 text-center hover:bg-accent hover:text-white transition"
      on:click={() => setSubject(s)}
    >
      {getTranslation($selectedLanguage, `subjects.${s}`)}
    </button>
  {/each}
</div>

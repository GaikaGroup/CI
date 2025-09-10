<script>
  import ChatInterface from '$lib/modules/chat/components/ChatInterface.svelte';
  import { consent, gender } from '$lib/stores/session';
  import ConsentDialog from './setup/ConsentDialog.svelte';
  import GenderSelect from './setup/GenderSelect.svelte';
  import LanguageSelect from './setup/LanguageSelect.svelte';
  import { subjectConfig, loadMaterial } from '$lib/stores/subject-config';

  let drawerOpen = false;
  let currentMaterial = null;
  let materialContent = '';

  async function openMaterial(mat) {
    currentMaterial = mat;
    if (!mat.filename.endsWith('.pdf')) {
      materialContent = await loadMaterial(mat.filename);
    }
  }

  function pdfSrc() {
    if (!currentMaterial) return '';
    return `/pdfjs/web/viewer.html?file=/tutor/${$subjectConfig.id}/materials/${currentMaterial.filename}`;
  }
</script>

<div class="relative flex">
  <div class="flex-1">
    {#if !$consent}
      <LanguageSelect />
      <ConsentDialog />
    {:else if !$gender}
      <GenderSelect />
    {:else}
      <ChatInterface showModeToggle={false} />
    {/if}
  </div>
  {#if drawerOpen}
    <div class="w-64 border-l p-2 overflow-y-auto bg-white">
      <h3 class="font-bold mb-2">Materials</h3>
      {#if $subjectConfig?.materials}
        <ul class="space-y-1">
          {#each $subjectConfig.materials as m}
            <li>
              <button class="text-blue-500" on:click={() => openMaterial(m)}>{m.title}</button>
            </li>
          {/each}
        </ul>
        {#if currentMaterial}
          {#if currentMaterial.filename.endsWith('.pdf')}
            <iframe title="Material PDF" class="w-full h-64 mt-2" src={pdfSrc()}></iframe>
          {:else}
            <pre class="mt-2 whitespace-pre-wrap">{materialContent}</pre>
          {/if}
        {/if}
      {:else}
        <p>No materials available.</p>
      {/if}
    </div>
  {/if}
  <button
    class="absolute top-2 right-2 bg-gray-200 p-1 rounded"
    on:click={() => (drawerOpen = !drawerOpen)}
  >
    {drawerOpen ? 'Close' : 'Materials'}
  </button>
</div>

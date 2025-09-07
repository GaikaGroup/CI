<script lang="ts">
  import { onMount } from 'svelte';
  import { checkAuth } from '$modules/auth/stores';
  import ModeSelector from '$lib/components/ModeSelector.svelte';
  import ChatTypeToggle from '$lib/components/ChatTypeToggle.svelte';
  import LearningGrid from '$lib/components/LearningGrid.svelte';
  import FunGrid from '$lib/components/FunGrid.svelte';
  import ChatPane from '$lib/components/ChatPane.svelte';
  import { mode, subject, activity, setSubject, setActivity } from '$lib/stores/ui';
  import { getTranslation } from '$lib/modules/i18n/translations';
  import { selectedLanguage } from '$lib/modules/i18n/stores';

  onMount(() => {
    checkAuth();
  });

  function goBack() {
    if ($mode === 'learning') setSubject(null);
    if ($mode === 'fun') setActivity(null);
  }
</script>

<div class="min-h-screen bg-pagebg">
  <div class="max-w-4xl mx-auto px-4 py-8">
    <ModeSelector />
    <ChatTypeToggle />

    {#if $mode === 'learning' && !$subject}
      <LearningGrid />
    {:else if $mode === 'fun' && !$activity}
      <FunGrid />
    {:else}
      {#if $mode !== 'chat'}
        <button
          on:click={goBack}
          class="mb-2 text-accent focus:outline-none focus:ring-2 focus:ring-accent rounded-token px-3 py-1"
          aria-label={getTranslation($selectedLanguage, 'back')}
          >{getTranslation($selectedLanguage, 'back')}</button
        >
      {/if}
      <ChatPane />
    {/if}
  </div>
</div>

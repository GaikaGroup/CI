<script>
  import Math from '$lib/shared/components/Math.svelte';
  import { parseMathSegments } from '$lib/modules/chat/utils/math';

  export let content = '';
  export let className = '';

  $: segments = parseMathSegments(content);
</script>

<div class="math-message {className}">
  {#if segments.length === 0}
    <span class="text-content"></span>
  {:else}
    {#each segments as segment}
      {#if segment.type === 'math'}
        <Math tex={segment.content} display={segment.display} />
      {:else}
        <span class="text-content">{segment.content}</span>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .math-message {
    line-height: 1.6;
  }

  .text-content {
    white-space: pre-wrap;
  }
</style>

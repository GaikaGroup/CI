<script>
  import Math from '$lib/shared/components/Math.svelte';
  import { parseMathSegments } from '$lib/modules/chat/utils/math';

  export let content = '';
  export let className = '';

  $: segments = parseMathSegments(content);
</script>

<div class="math-content {className}">
  {#if segments && segments.length > 0}
    {#each segments as segment}
      {#if segment.type === 'math'}
        <Math tex={segment.content} display={segment.display} />
      {:else}
        <span class="text-segment">{segment.content}</span>
      {/if}
    {/each}
  {/if}
</div>

<style>
  :global(.math-content .katex) {
    font-size: 1.1em;
  }

  :global(.math-content .katex-display) {
    margin: 0.5em 0;
    text-align: center;
  }

  :global(.math-error) {
    font-family: 'Courier New', monospace;
    background-color: rgba(255, 0, 0, 0.1);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-weight: 500;
    color: #d32f2f;
  }

  :global(.dark .math-error) {
    background-color: rgba(255, 0, 0, 0.2);
    color: #ff6b6b;
  }

  .text-segment {
    white-space: pre-wrap;
  }
</style>

<script>
  import { createEventDispatcher } from 'svelte';

  export let messageId;
  export let hasFeedback = false;

  const dispatch = createEventDispatcher();

  function handleClick() {
    if (!hasFeedback) {
      dispatch('dislike', { messageId });
    }
  }
</script>

<button
  class="dislike-btn"
  class:disabled={hasFeedback}
  on:click={handleClick}
  disabled={hasFeedback}
  title={hasFeedback ? 'Feedback already submitted' : 'Report issue with this response'}
  aria-label={hasFeedback ? 'Feedback already submitted' : 'Report issue with this response'}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M17 14V2" />
    <path
      d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"
    />
  </svg>
</button>

<style>
  .dislike-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    opacity: 0.5;
    transition: opacity 0.2s;
    color: currentColor;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .dislike-btn:hover:not(.disabled) {
    opacity: 1;
  }

  .dislike-btn.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .dislike-btn svg {
    width: 16px;
    height: 16px;
  }
</style>

<script>
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import { ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-svelte';
  import TypewriterMessage from './TypewriterMessage.svelte';
  import DivergenceAlert from './DivergenceAlert.svelte';
  import { darkMode } from '$modules/theme/stores';

  export let message;
  export let primaryMessage;
  export let provider;
  export let model;
  export let divergenceLevel = null;
  export let divergenceData = null;
  export let feedbackSubmitted = false;
  export let collapsed = false;

  const dispatch = createEventDispatcher();

  let isCollapsed = collapsed;
  let feedbackGiven = feedbackSubmitted;

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }

  function handleFeedback(helpful) {
    if (feedbackGiven) return;

    dispatch('feedback', {
      opinionId: message.metadata?.opinionId,
      messageId: message.id,
      helpful
    });

    feedbackGiven = true;
  }

  function handleKeyDown(event, action) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  $: providerDisplayName = provider
    ? provider.charAt(0).toUpperCase() + provider.slice(1)
    : 'Unknown';
  $: modelDisplayName = model || 'Unknown Model';
  $: hasDivergence = divergenceLevel && divergenceLevel !== 'low';
</script>

<div
  class="second-opinion-message"
  class:dark={$darkMode}
  class:collapsed={isCollapsed}
  transition:slide={{ duration: 300 }}
>
  <!-- Header -->
  <div class="opinion-header">
    <div class="header-left">
      <Sparkles class="w-4 h-4 text-purple-500" />
      <span class="provider-badge">
        {providerDisplayName}
        {#if model}
          <span class="model-name">({modelDisplayName})</span>
        {/if}
      </span>
    </div>

    <button
      class="collapse-btn"
      on:click={toggleCollapse}
      on:keydown={(e) => handleKeyDown(e, toggleCollapse)}
      aria-label={isCollapsed ? 'Expand second opinion' : 'Collapse second opinion'}
      title={isCollapsed ? 'Expand' : 'Collapse'}
    >
      {#if isCollapsed}
        <ChevronDown class="w-4 h-4" />
      {:else}
        <ChevronUp class="w-4 h-4" />
      {/if}
    </button>
  </div>

  {#if !isCollapsed}
    <!-- Divergence Alert -->
    {#if hasDivergence && divergenceData}
      <div class="divergence-container">
        <DivergenceAlert
          level={divergenceLevel}
          differences={divergenceData.differences || []}
          suggestedQuestions={divergenceData.suggestedQuestions || []}
          on:questionClick
        />
      </div>
    {/if}

    <!-- Message Content -->
    <div class="opinion-content">
      <TypewriterMessage text={message.content} animate={message.animate || false} on:complete />
    </div>

    <!-- Footer with Feedback -->
    <div class="opinion-footer">
      <div class="timestamp">
        {message.timestamp || new Date().toLocaleTimeString()}
      </div>

      <div class="feedback-buttons">
        <button
          class="feedback-btn"
          class:active={feedbackGiven === true}
          class:disabled={feedbackGiven !== null && feedbackGiven !== true}
          on:click={() => handleFeedback(true)}
          on:keydown={(e) => handleKeyDown(e, () => handleFeedback(true))}
          disabled={feedbackGiven !== null && feedbackGiven !== true}
          aria-label="This was helpful"
          title="This was helpful"
        >
          <ThumbsUp class="w-4 h-4" />
          <span class="feedback-text">Helpful</span>
        </button>

        <button
          class="feedback-btn"
          class:active={feedbackGiven === false}
          class:disabled={feedbackGiven !== null && feedbackGiven !== false}
          on:click={() => handleFeedback(false)}
          on:keydown={(e) => handleKeyDown(e, () => handleFeedback(false))}
          disabled={feedbackGiven !== null && feedbackGiven !== false}
          aria-label="Not helpful"
          title="Not helpful"
        >
          <ThumbsDown class="w-4 h-4" />
          <span class="feedback-text">Not helpful</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .second-opinion-message {
    margin: 0.75rem 0 0.75rem 2rem;
    padding: 1rem;
    border-left: 3px solid #a855f7;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(168, 85, 247, 0.02) 100%);
    box-shadow: 0 2px 8px rgba(168, 85, 247, 0.1);
    transition: all 0.3s ease;
  }

  .second-opinion-message.dark {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%);
    box-shadow: 0 2px 8px rgba(168, 85, 247, 0.2);
  }

  .second-opinion-message.collapsed {
    padding: 0.75rem 1rem;
  }

  .opinion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .second-opinion-message.collapsed .opinion-header {
    margin-bottom: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .provider-badge {
    font-size: 0.875rem;
    font-weight: 600;
    color: #a855f7;
  }

  .dark .provider-badge {
    color: #c084fc;
  }

  .model-name {
    font-weight: 400;
    opacity: 0.8;
    font-size: 0.8125rem;
  }

  .collapse-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: currentColor;
    opacity: 0.6;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .collapse-btn:hover {
    opacity: 1;
  }

  .collapse-btn:focus {
    outline: 2px solid #a855f7;
    outline-offset: 2px;
    border-radius: 0.25rem;
  }

  .divergence-container {
    margin-bottom: 0.75rem;
  }

  .opinion-content {
    margin-bottom: 0.75rem;
    line-height: 1.6;
    color: inherit;
  }

  .opinion-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(168, 85, 247, 0.2);
    font-size: 0.75rem;
  }

  .timestamp {
    opacity: 0.6;
  }

  .feedback-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .feedback-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: none;
    border: 1px solid currentColor;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.75rem;
    color: currentColor;
    opacity: 0.5;
    transition: all 0.2s ease;
  }

  .feedback-btn:hover:not(.disabled) {
    opacity: 1;
    background: rgba(168, 85, 247, 0.1);
  }

  .feedback-btn:focus {
    outline: 2px solid #a855f7;
    outline-offset: 2px;
  }

  .feedback-btn.active {
    opacity: 1;
    background: rgba(168, 85, 247, 0.2);
    border-color: #a855f7;
    color: #a855f7;
  }

  .dark .feedback-btn.active {
    color: #c084fc;
    border-color: #c084fc;
    background: rgba(192, 132, 252, 0.2);
  }

  .feedback-btn.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .feedback-text {
    font-weight: 500;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .second-opinion-message {
      margin-left: 1rem;
      padding: 0.75rem;
    }

    .feedback-text {
      display: none;
    }

    .feedback-btn {
      padding: 0.375rem;
    }

    .opinion-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>

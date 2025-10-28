<script>
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import { AlertTriangle, Info, AlertCircle, X } from 'lucide-svelte';
  import { darkMode } from '$modules/theme/stores';

  export let level = 'medium'; // 'low', 'medium', 'high'
  export let differences = [];
  export let suggestedQuestions = [];

  const dispatch = createEventDispatcher();

  let dismissed = false;

  function handleDismiss() {
    dismissed = true;
  }

  function handleQuestionClick(question) {
    dispatch('questionClick', { question });
  }

  function handleKeyDown(event, action) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  $: levelConfig = {
    low: {
      icon: Info,
      color: 'green',
      title: 'Similar Responses',
      description: 'Both models provided similar answers with minor variations.'
    },
    medium: {
      icon: AlertCircle,
      color: 'yellow',
      title: 'Different Approaches',
      description: 'The models used different approaches or emphasized different aspects.'
    },
    high: {
      icon: AlertTriangle,
      color: 'red',
      title: 'Significant Differences',
      description:
        'The models provided notably different answers. Consider asking for clarification.'
    }
  };

  $: config = levelConfig[level] || levelConfig.medium;
  $: IconComponent = config.icon;
</script>

{#if !dismissed}
  <div
    class="divergence-alert {config.color}"
    class:dark={$darkMode}
    transition:slide={{ duration: 300 }}
    role="alert"
    aria-live="polite"
  >
    <div class="alert-header">
      <div class="header-left">
        <svelte:component this={IconComponent} class="alert-icon w-5 h-5" />
        <h4 class="alert-title">{config.title}</h4>
      </div>
      <button
        class="dismiss-btn"
        on:click={handleDismiss}
        on:keydown={(e) => handleKeyDown(e, handleDismiss)}
        aria-label="Dismiss alert"
        title="Dismiss"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <p class="alert-description">{config.description}</p>

    {#if differences && differences.length > 0}
      <div class="differences-section">
        <h5 class="section-title">Key Differences:</h5>
        <ul class="differences-list">
          {#each differences as difference}
            <li class="difference-item">{difference}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if suggestedQuestions && suggestedQuestions.length > 0}
      <div class="questions-section">
        <h5 class="section-title">Suggested Follow-up Questions:</h5>
        <div class="questions-list">
          {#each suggestedQuestions as question}
            <button
              class="question-btn"
              on:click={() => handleQuestionClick(question)}
              on:keydown={(e) => handleKeyDown(e, () => handleQuestionClick(question))}
              aria-label="Ask: {question}"
            >
              {question}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .divergence-alert {
    padding: 1rem;
    border-radius: 0.5rem;
    border-left: 4px solid;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-1rem);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Green (Low divergence) */
  .divergence-alert.green {
    background: #f0fdf4;
    border-color: #22c55e;
    color: #166534;
  }

  .dark .divergence-alert.green {
    background: rgba(34, 197, 94, 0.1);
    border-color: #22c55e;
    color: #86efac;
  }

  .divergence-alert.green .alert-icon {
    color: #22c55e;
  }

  /* Yellow (Medium divergence) */
  .divergence-alert.yellow {
    background: #fefce8;
    border-color: #eab308;
    color: #854d0e;
  }

  .dark .divergence-alert.yellow {
    background: rgba(234, 179, 8, 0.1);
    border-color: #eab308;
    color: #fde047;
  }

  .divergence-alert.yellow .alert-icon {
    color: #eab308;
  }

  /* Red (High divergence) */
  .divergence-alert.red {
    background: #fef2f2;
    border-color: #ef4444;
    color: #991b1b;
  }

  .dark .divergence-alert.red {
    background: rgba(239, 68, 68, 0.1);
    border-color: #ef4444;
    color: #fca5a5;
  }

  .divergence-alert.red .alert-icon {
    color: #ef4444;
  }

  .alert-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .alert-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
  }

  .dismiss-btn {
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

  .dismiss-btn:hover {
    opacity: 1;
  }

  .dismiss-btn:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 0.25rem;
  }

  .alert-description {
    font-size: 0.8125rem;
    margin: 0 0 0.75rem 0;
    line-height: 1.5;
    opacity: 0.9;
  }

  .differences-section,
  .questions-section {
    margin-top: 0.75rem;
  }

  .section-title {
    font-size: 0.8125rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .differences-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .difference-item {
    font-size: 0.8125rem;
    padding-left: 1rem;
    position: relative;
    line-height: 1.5;
  }

  .difference-item::before {
    content: '•';
    position: absolute;
    left: 0;
    font-weight: bold;
  }

  .questions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .question-btn {
    text-align: left;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid currentColor;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.8125rem;
    color: currentColor;
    transition: all 0.2s ease;
    opacity: 0.8;
  }

  .dark .question-btn {
    background: rgba(0, 0, 0, 0.2);
  }

  .question-btn:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.8);
    transform: translateX(0.25rem);
  }

  .dark .question-btn:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  .question-btn:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .divergence-alert {
      padding: 0.75rem;
    }

    .alert-title {
      font-size: 0.8125rem;
    }

    .alert-description,
    .difference-item,
    .question-btn {
      font-size: 0.75rem;
    }
  }
</style>

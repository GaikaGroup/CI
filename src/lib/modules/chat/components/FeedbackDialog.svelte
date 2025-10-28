<script>
  import { createEventDispatcher } from 'svelte';

  export let messageId;
  export let open = false;

  const dispatch = createEventDispatcher();
  let feedbackText = '';
  let submitting = false;
  let error = null;

  async function handleSubmit() {
    if (!feedbackText.trim()) return;

    if (feedbackText.trim().length < 10) {
      error = 'Feedback must be at least 10 characters';
      return;
    }

    // Validate messageId
    if (!messageId) {
      error = 'Cannot submit feedback: Message ID is missing';
      console.error('FeedbackDialog: messageId is null or undefined');
      return;
    }

    submitting = true;
    error = null;

    try {
      console.log('Submitting feedback for message:', messageId);
      const response = await fetch('/api/messages/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          feedback: feedbackText
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        dispatch('submitted');
        close();
      } else {
        error = data.error || 'Failed to submit feedback';
        console.error('Feedback submission failed:', data);
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      error = 'Network error. Please try again.';
    } finally {
      submitting = false;
    }
  }

  function close() {
    open = false;
    feedbackText = '';
    error = null;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      close();
    }
  }
</script>

{#if open}
  <div class="dialog-overlay" on:click={close} on:keydown={handleKeydown} role="presentation">
    <div class="dialog" on:click|stopPropagation role="dialog" aria-labelledby="dialog-title">
      <h3 id="dialog-title">Provide Feedback</h3>
      <p>Please describe what was wrong with this response:</p>

      <textarea
        bind:value={feedbackText}
        placeholder="The answer was not accurate because..."
        rows="5"
        aria-label="Feedback text"
      />

      {#if error}
        <div class="error-message" role="alert">{error}</div>
      {/if}

      <div class="actions">
        <button on:click={close} disabled={submitting} class="btn-secondary">Cancel</button>
        <button
          on:click={handleSubmit}
          disabled={!feedbackText.trim() || submitting}
          class="btn-primary"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: #333;
  }

  p {
    margin: 0 0 1rem 0;
    color: #666;
  }

  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin: 0 0 1rem 0;
    font-family: inherit;
    font-size: 0.95rem;
    resize: vertical;
  }

  textarea:focus {
    outline: none;
    border-color: #4a90e2;
  }

  .error-message {
    color: #d32f2f;
    font-size: 0.875rem;
    margin: -0.5rem 0 1rem 0;
    padding: 0.5rem;
    background: #ffebee;
    border-radius: 4px;
  }

  .actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background-color 0.2s;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #f5f5f5;
    color: #333;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e0e0e0;
  }

  .btn-primary {
    background: #4a90e2;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #357abd;
  }
</style>

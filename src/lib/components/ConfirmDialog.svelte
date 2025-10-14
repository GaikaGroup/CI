<script>
  import { createEventDispatcher } from 'svelte';
  import { X, AlertTriangle } from 'lucide-svelte';

  export let isOpen = false;
  export let title = 'Confirm Action';
  export let message = 'Are you sure you want to proceed?';
  export let confirmText = 'Confirm';
  export let cancelText = 'Cancel';
  export let type = 'default'; // 'default', 'danger', 'warning'
  export let loading = false;

  const dispatch = createEventDispatcher();

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="dialog-backdrop" on:click={handleBackdropClick}>
    <div
      class="dialog"
      role="dialog"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
    >
      <div class="dialog-header">
        <div
          class="dialog-icon"
          class:danger={type === 'danger'}
          class:warning={type === 'warning'}
        >
          {#if type === 'danger' || type === 'warning'}
            <AlertTriangle class="h-6 w-6" />
          {/if}
        </div>
        <h2 id="dialog-title" class="dialog-title">{title}</h2>
        <button class="dialog-close" on:click={handleCancel} aria-label="Close dialog">
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="dialog-content">
        <p id="dialog-message" class="dialog-message">{message}</p>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-secondary" on:click={handleCancel} disabled={loading}>
          {cancelText}
        </button>
        <button
          class="btn"
          class:btn-danger={type === 'danger'}
          class:btn-warning={type === 'warning'}
          class:btn-primary={type === 'default'}
          on:click={handleConfirm}
          disabled={loading}
        >
          {#if loading}
            <div class="loading-spinner"></div>
          {/if}
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
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
    padding: 20px;
  }

  .dialog {
    background: white;
    border-radius: 12px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 400px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    animation: dialogEnter 0.2s ease-out;
  }

  @keyframes dialogEnter {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px 24px 0 24px;
  }

  .dialog-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #f3f4f6;
    color: #6b7280;
  }

  .dialog-icon.danger {
    background: #fef2f2;
    color: #dc2626;
  }

  .dialog-icon.warning {
    background: #fffbeb;
    color: #d97706;
  }

  .dialog-title {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .dialog-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: #6b7280;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .dialog-close:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .dialog-content {
    padding: 16px 24px;
  }

  .dialog-message {
    font-size: 14px;
    line-height: 1.5;
    color: #6b7280;
    margin: 0;
  }

  .dialog-actions {
    display: flex;
    gap: 12px;
    padding: 0 24px 24px 24px;
    justify-content: flex-end;
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 80px;
    justify-content: center;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #f9fafb;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
  }

  .btn-warning {
    background: #d97706;
    color: white;
  }

  .btn-warning:hover:not(:disabled) {
    background: #b45309;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .dialog-backdrop {
      padding: 16px;
    }

    .dialog {
      max-width: none;
    }

    .dialog-header {
      padding: 20px 20px 0 20px;
    }

    .dialog-content {
      padding: 12px 20px;
    }

    .dialog-actions {
      padding: 0 20px 20px 20px;
      flex-direction: column-reverse;
    }

    .btn {
      width: 100%;
    }
  }
</style>

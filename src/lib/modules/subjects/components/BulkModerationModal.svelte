<script>
  import { createEventDispatcher } from 'svelte';
  import Button from '$shared/components/Button.svelte';
  import { getReportReasonLabel } from '../reports.js';

  export let show = false;
  export let selectedReports = [];
  export let action = '';
  export let isProcessing = false;

  const dispatch = createEventDispatcher();

  let adminNotes = '';
  let confirmationText = '';

  $: actionLabel = getActionLabel(action);
  $: actionDescription = getActionDescription(action);
  $: confirmationRequired = action === 'delete';
  $: expectedConfirmation = confirmationRequired ? `DELETE ${selectedReports.length} SUBJECTS` : '';
  $: canProceed = !confirmationRequired || confirmationText === expectedConfirmation;

  const getActionLabel = (action) => {
    const labels = {
      reject: 'Reject Reports',
      block: 'Block Subjects',
      delete: 'Delete Subjects'
    };
    return labels[action] || 'Process Reports';
  };

  const getActionDescription = (action) => {
    const descriptions = {
      reject:
        'Mark the selected reports as reviewed with no action taken. The subjects will remain active.',
      block:
        'Block the reported subjects, making them unavailable to users while preserving the data.',
      delete:
        'Permanently delete the reported subjects and all associated data. This action cannot be undone.'
    };
    return descriptions[action] || 'Process the selected reports.';
  };

  const getActionColor = (action) => {
    const colors = {
      reject: 'text-gray-600 dark:text-gray-400',
      block: 'text-amber-600 dark:text-amber-400',
      delete: 'text-red-600 dark:text-red-400'
    };
    return colors[action] || 'text-stone-600 dark:text-gray-400';
  };

  const getActionIcon = (action) => {
    const icons = {
      reject: 'M6 18L18 6M6 6l12 12',
      block:
        'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728',
      delete:
        'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
    };
    return icons[action] || 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
  };

  const handleConfirm = () => {
    if (canProceed) {
      dispatch('confirm', {
        action,
        reportIds: selectedReports.map((r) => r.id),
        adminNotes: adminNotes.trim()
      });
    }
  };

  const handleCancel = () => {
    dispatch('cancel');
    // Reset form
    adminNotes = '';
    confirmationText = '';
  };

  // Group reports by reason for display
  $: reportsByReason = selectedReports.reduce((acc, report) => {
    const reason = report.reason;
    if (!acc[reason]) {
      acc[reason] = [];
    }
    acc[reason].push(report);
    return acc;
  }, {});
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 rounded-lg bg-stone-100 dark:bg-gray-700">
          <svg
            class="w-6 h-6 {getActionColor(action)}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d={getActionIcon(action)}
            />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-stone-900 dark:text-white">
            {actionLabel}
          </h2>
          <p class="text-sm text-stone-600 dark:text-gray-400">
            {selectedReports.length} report{selectedReports.length === 1 ? '' : 's'} selected
          </p>
        </div>
      </div>

      <!-- Action Description -->
      <div class="mb-6">
        <div class="bg-stone-50 dark:bg-gray-900 rounded-lg p-4">
          <p class="text-sm text-stone-700 dark:text-gray-300">
            {actionDescription}
          </p>
        </div>
      </div>

      <!-- Reports Summary -->
      <div class="mb-6">
        <h3 class="text-sm font-medium text-stone-900 dark:text-white mb-3">Reports Summary</h3>
        <div class="space-y-2">
          {#each Object.entries(reportsByReason) as [reason, reports]}
            <div class="flex items-center justify-between text-sm">
              <span class="text-stone-600 dark:text-gray-400">
                {getReportReasonLabel(reason)}
              </span>
              <span class="font-medium text-stone-900 dark:text-white">
                {reports.length} report{reports.length === 1 ? '' : 's'}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Affected Subjects -->
      <div class="mb-6">
        <h3 class="text-sm font-medium text-stone-900 dark:text-white mb-3">Affected Subjects</h3>
        <div class="max-h-32 overflow-y-auto space-y-2">
          {#each selectedReports as report}
            <div
              class="flex items-center justify-between text-sm bg-stone-50 dark:bg-gray-900 rounded-lg p-2"
            >
              <span class="font-medium text-stone-900 dark:text-white">
                {report.subject?.name || 'Unknown Subject'}
              </span>
              <span class="text-stone-500 dark:text-gray-500">
                {report.subject?.creatorRole === 'admin' ? 'Official' : 'Community'}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Admin Notes -->
      <div class="mb-6">
        <label
          for="admin-notes"
          class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
        >
          Admin Notes (optional)
        </label>
        <textarea
          id="admin-notes"
          bind:value={adminNotes}
          placeholder="Add notes about this moderation action..."
          rows="3"
          class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
        ></textarea>
      </div>

      <!-- Confirmation for Destructive Actions -->
      {#if confirmationRequired}
        <div class="mb-6">
          <div
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div class="flex items-center gap-2 mb-3">
              <svg
                class="w-5 h-5 text-red-600 dark:text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <h4 class="font-medium text-red-800 dark:text-red-200">
                Destructive Action Confirmation
              </h4>
            </div>
            <p class="text-sm text-red-700 dark:text-red-300 mb-3">
              This action will permanently delete {selectedReports.length} subject{selectedReports.length ===
              1
                ? ''
                : 's'} and cannot be undone.
            </p>
            <div>
              <label
                for="confirmation-text"
                class="block text-sm font-medium text-red-800 dark:text-red-200 mb-2"
              >
                Type "{expectedConfirmation}" to confirm:
              </label>
              <input
                id="confirmation-text"
                type="text"
                bind:value={confirmationText}
                placeholder={expectedConfirmation}
                class="w-full rounded-lg border border-red-300 px-3 py-2 text-stone-900 placeholder-red-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-red-600 dark:bg-red-900/20 dark:text-white dark:placeholder-red-400 dark:focus:border-red-400"
              />
            </div>
          </div>
        </div>
      {/if}

      <!-- Warning for Block Action -->
      {#if action === 'block'}
        <div class="mb-6">
          <div
            class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
          >
            <div class="flex items-center gap-2">
              <svg
                class="w-4 h-4 text-amber-600 dark:text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
              <p class="text-sm text-amber-800 dark:text-amber-200">
                Blocked subjects will be hidden from users but can be unblocked later by
                administrators.
              </p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex gap-3">
        <Button variant="secondary" class="flex-1" on:click={handleCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          variant={action === 'delete' ? 'primary' : 'primary'}
          class="flex-1 {action === 'delete'
            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            : ''}"
          on:click={handleConfirm}
          disabled={!canProceed || isProcessing}
        >
          {#if isProcessing}
            Processing...
          {:else}
            {actionLabel}
          {/if}
        </Button>
      </div>

      <!-- Processing Indicator -->
      {#if isProcessing}
        <div
          class="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p class="text-sm text-blue-800 dark:text-blue-200">
              Processing {selectedReports.length} report{selectedReports.length === 1 ? '' : 's'}...
            </p>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<script>
  import { createEventDispatcher } from 'svelte';
  import { user } from '$modules/auth/stores';
  import Button from '$shared/components/Button.svelte';
  import { moderationStats } from '../stores/moderationStore.js';
  import { adminStore, selectedReportsCount, hasSelectedReports } from '../stores/adminStore.js';
  import { getReportReasonLabel, getModerationActionLabel, REPORT_STATUS } from '../reports.js';

  export let reports = [];
  export let showFilters = true;
  export let allowBulkActions = true;

  const dispatch = createEventDispatcher();

  let selectedStatus = 'pending';
  let selectedReason = 'all';
  let searchQuery = '';
  let showReportDetails = {};

  // Filter reports
  $: filteredReports = reports.filter((report) => {
    const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
    const matchesReason = selectedReason === 'all' || report.reason === selectedReason;
    const matchesSearch =
      !searchQuery ||
      report.subject?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.details.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesReason && matchesSearch;
  });

  // Get unique reasons for filter
  $: availableReasons = [...new Set(reports.map((r) => r.reason))];

  const handleReportAction = (reportId, action) => {
    dispatch('report-action', { reportId, action });
  };

  const handleBulkAction = (action) => {
    const selectedIds = $adminStore.selectedReports;
    if (selectedIds.size > 0) {
      dispatch('bulk-action', {
        reportIds: Array.from(selectedIds),
        action
      });
    }
  };

  const toggleReportSelection = (reportId) => {
    adminStore.toggleReportSelection(reportId);
  };

  const selectAllVisible = () => {
    const visibleIds = filteredReports.map((r) => r.id);
    adminStore.selectAllReports(visibleIds);
  };

  const clearSelection = () => {
    adminStore.clearReportSelection();
  };

  const toggleReportDetails = (reportId) => {
    showReportDetails[reportId] = !showReportDetails[reportId];
    showReportDetails = { ...showReportDetails };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getActionBadgeClass = (action) => {
    const classes = {
      none: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return classes[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold text-stone-900 dark:text-white">Moderation Queue</h2>
      <p class="text-sm text-stone-600 dark:text-gray-400 mt-1">
        Review and manage reported courses
      </p>
    </div>

    <!-- Stats -->
    <div class="flex gap-4 text-sm">
      <div class="text-center">
        <div class="font-semibold text-stone-900 dark:text-white">
          {$moderationStats.pendingReports}
        </div>
        <div class="text-stone-600 dark:text-gray-400">Pending</div>
      </div>
      <div class="text-center">
        <div class="font-semibold text-stone-900 dark:text-white">
          {$moderationStats.totalReports}
        </div>
        <div class="text-stone-600 dark:text-gray-400">Total</div>
      </div>
    </div>
  </div>

  {#if showFilters}
    <!-- Filters -->
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-stone-200 dark:border-gray-700"
    >
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search -->
        <div>
          <input
            type="text"
            placeholder="Search reports..."
            bind:value={searchQuery}
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
          />
        </div>

        <!-- Status Filter -->
        <div>
          <select
            bind:value={selectedStatus}
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <!-- Reason Filter -->
        <div>
          <select
            bind:value={selectedReason}
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
          >
            <option value="all">All Reasons</option>
            {#each availableReasons as reason}
              <option value={reason}>{getReportReasonLabel(reason)}</option>
            {/each}
          </select>
        </div>

        <!-- Results -->
        <div class="flex items-center text-sm text-stone-600 dark:text-gray-400">
          Showing {filteredReports.length} of {reports.length} reports
        </div>
      </div>
    </div>
  {/if}

  {#if allowBulkActions && $hasSelectedReports}
    <!-- Bulk Actions -->
    <div
      class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-amber-800 dark:text-amber-200">
            {$selectedReportsCount} report{$selectedReportsCount === 1 ? '' : 's'} selected
          </span>
          <button
            on:click={clearSelection}
            class="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
          >
            Clear selection
          </button>
        </div>

        <div class="flex gap-2">
          <Button variant="secondary" size="sm" on:click={() => handleBulkAction('reject')}>
            Reject All
          </Button>
          <Button variant="secondary" size="sm" on:click={() => handleBulkAction('block')}>
            Block All
          </Button>
          <Button variant="primary" size="sm" on:click={() => handleBulkAction('delete')}>
            Delete All
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Reports List -->
  {#if filteredReports.length === 0}
    <div class="text-center py-12">
      <svg
        class="w-12 h-12 text-stone-400 dark:text-gray-500 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 class="text-lg font-medium text-stone-900 dark:text-white mb-2">No reports found</h3>
      <p class="text-stone-600 dark:text-gray-400">
        {reports.length === 0
          ? 'No reports have been submitted yet.'
          : 'No reports match your current filters.'}
      </p>
    </div>
  {:else}
    <div class="space-y-4">
      <!-- Select All -->
      {#if allowBulkActions && filteredReports.length > 0}
        <div class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            id="selectAll"
            checked={filteredReports.every((r) => $adminStore.selectedReports.has(r.id))}
            on:change={(e) => (e.target.checked ? selectAllVisible() : clearSelection())}
            class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <label for="selectAll" class="text-stone-700 dark:text-gray-300">
            Select all visible reports
          </label>
        </div>
      {/if}

      <!-- Report Cards -->
      {#each filteredReports as report}
        <div
          class="bg-white dark:bg-gray-800 rounded-xl border border-stone-200 dark:border-gray-700 overflow-hidden"
        >
          <div class="p-6">
            <div class="flex items-start gap-4">
              {#if allowBulkActions}
                <div class="flex items-center pt-1">
                  <input
                    type="checkbox"
                    checked={$adminStore.selectedReports.has(report.id)}
                    on:change={() => toggleReportSelection(report.id)}
                    class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
              {/if}

              <div class="flex-1 min-w-0">
                <!-- Header -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-stone-900 dark:text-white">
                      {report.subject?.name || 'Unknown Subject'}
                    </h3>
                    <div class="flex items-center gap-2 mt-1">
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusBadgeClass(
                          report.status
                        )}"
                      >
                        {report.status}
                      </span>
                      <span class="text-sm text-stone-600 dark:text-gray-400">
                        {getReportReasonLabel(report.reason)}
                      </span>
                      <span class="text-sm text-stone-500 dark:text-gray-500">
                        • {formatDate(report.metadata.reportedAt)}
                      </span>
                    </div>
                  </div>

                  {#if report.action}
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getActionBadgeClass(
                        report.action
                      )}"
                    >
                      {getModerationActionLabel(report.action)}
                    </span>
                  {/if}
                </div>

                <!-- Details -->
                {#if report.details}
                  <div class="mb-4">
                    <p class="text-sm text-stone-600 dark:text-gray-300">
                      {report.details}
                    </p>
                  </div>
                {/if}

                <!-- Subject Info -->
                {#if report.subject}
                  <div class="bg-stone-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
                    <div class="text-sm">
                      <div class="font-medium text-stone-900 dark:text-white mb-1">
                        Subject Details
                      </div>
                      <div class="text-stone-600 dark:text-gray-300 space-y-1">
                        <div>
                          Creator: {report.subject.creatorRole === 'admin'
                            ? 'Official'
                            : 'Community'}
                        </div>
                        <div>Language: {report.subject.language || 'Not specified'}</div>
                        <div>
                          Agents: {(report.subject.agents?.length || 0) +
                            (report.subject.orchestrationAgent ? 1 : 0)}
                        </div>
                        <div>Materials: {report.subject.materials?.length || 0}</div>
                      </div>
                    </div>
                  </div>
                {/if}

                <!-- Review Info -->
                {#if report.reviewedBy}
                  <div class="text-sm text-stone-500 dark:text-gray-400 mb-4">
                    Reviewed by Admin on {formatDate(report.reviewedAt)}
                    {#if report.adminNotes}
                      <div class="mt-1 text-stone-600 dark:text-gray-300">
                        Notes: {report.adminNotes}
                      </div>
                    {/if}
                  </div>
                {/if}

                <!-- Actions -->
                {#if report.status === REPORT_STATUS.PENDING && $user?.role === 'admin'}
                  <div class="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      on:click={() => handleReportAction(report.id, 'reject')}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      on:click={() => handleReportAction(report.id, 'block')}
                    >
                      Block Subject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      on:click={() => handleReportAction(report.id, 'delete')}
                    >
                      Delete Subject
                    </Button>
                    <button
                      on:click={() => toggleReportDetails(report.id)}
                      class="text-sm text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
                    >
                      {showReportDetails[report.id] ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Expanded Details -->
            {#if showReportDetails[report.id]}
              <div class="mt-4 pt-4 border-t border-stone-200 dark:border-gray-700">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 class="font-medium text-stone-900 dark:text-white mb-2">Report Info</h4>
                    <div class="space-y-1 text-stone-600 dark:text-gray-300">
                      <div>Report ID: {report.id}</div>
                      <div>Reporter ID: {report.reporterId}</div>
                      <div>Reporter IP: {report.metadata.reporterIP}</div>
                      <div>Reported: {formatDate(report.metadata.reportedAt)}</div>
                    </div>
                  </div>

                  {#if report.subject}
                    <div>
                      <h4 class="font-medium text-stone-900 dark:text-white mb-2">Subject Info</h4>
                      <div class="space-y-1 text-stone-600 dark:text-gray-300">
                        <div>Subject ID: {report.subject.id}</div>
                        <div>Creator ID: {report.subject.creatorId}</div>
                        <div>Status: {report.subject.status}</div>
                        <div>Created: {formatDate(report.subject.metadata?.createdAt)}</div>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

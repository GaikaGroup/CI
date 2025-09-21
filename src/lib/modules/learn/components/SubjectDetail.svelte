<script>
  import { createEventDispatcher } from 'svelte';
  import { user } from '$modules/auth/stores';
  import Button from '$shared/components/Button.svelte';

  export let subject;
  export let showReporting = true;

  const dispatch = createEventDispatcher();

  let showReportModal = false;
  let reportReason = '';
  let reportDetails = '';

  const handleStartLearning = (mode) => {
    dispatch('start-learning', { subject, mode });
  };

  const handleReportSubject = () => {
    showReportModal = true;
  };

  const submitReport = () => {
    if (reportReason) {
      dispatch('report-subject', {
        subjectId: subject.id,
        reason: reportReason,
        details: reportDetails
      });

      // Reset form
      showReportModal = false;
      reportReason = '';
      reportDetails = '';
    }
  };

  const cancelReport = () => {
    showReportModal = false;
    reportReason = '';
    reportDetails = '';
  };

  const getCreatorLabel = (creatorRole) => {
    return creatorRole === 'admin' ? 'Official' : 'Community';
  };

  const getCreatorBadgeClass = (creatorRole) => {
    return creatorRole === 'admin'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const getAgentTypeLabel = (type) => {
    return type === 'orchestration' ? 'Orchestration' : 'Specialist';
  };

  const getAgentTypeBadge = (type) => {
    return type === 'orchestration'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  };
</script>

<div class="max-w-4xl mx-auto space-y-8">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <div class="flex items-center gap-3 mb-2">
        <h1 class="text-3xl font-bold text-stone-900 dark:text-white">
          {subject.name}
        </h1>
        <span
          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getCreatorBadgeClass(
            subject.creatorRole
          )}"
        >
          {getCreatorLabel(subject.creatorRole)}
        </span>
      </div>

      <div class="flex items-center gap-4 text-sm text-stone-600 dark:text-gray-400">
        {#if subject.language}
          <span class="font-medium text-amber-600 dark:text-amber-400">
            {subject.language}
            {#if subject.level}· {subject.level}{/if}
          </span>
        {/if}

        {#if subject.metadata?.createdAt}
          <span>
            Created {new Date(subject.metadata.createdAt).toLocaleDateString()}
          </span>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if showReporting && $user}
        <button
          on:click={handleReportSubject}
          class="p-2 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-gray-700"
          title="Report inappropriate content"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Description -->
  <div
    class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
  >
    <h2 class="text-lg font-semibold text-stone-900 dark:text-white mb-3">About This Subject</h2>
    <p class="text-stone-600 dark:text-gray-300 leading-relaxed">
      {subject.description}
    </p>
  </div>

  <!-- Skills and Features -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Skills -->
    {#if subject.skills?.length}
      <div
        class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">Skills Covered</h3>
        <div class="flex flex-wrap gap-2">
          {#each subject.skills as skill}
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
            >
              {skill}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- LLM Settings -->
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
    >
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">AI Configuration</h3>
      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-stone-600 dark:text-gray-400">Provider:</span>
          <span class="font-medium text-stone-900 dark:text-white">
            {subject.llmSettings?.preferredProvider || 'Default'}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-stone-600 dark:text-gray-400">External APIs:</span>
          {#if subject.llmSettings?.allowOpenAI}
            <span class="text-green-600 dark:text-green-400 font-medium">Allowed</span>
          {:else}
            <span class="text-blue-600 dark:text-blue-400 font-medium">Local only</span>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          <span class="text-stone-600 dark:text-gray-400">Fallback:</span>
          <span class="font-medium text-stone-900 dark:text-white">
            {subject.llmSettings?.fallbackEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Agents -->
  {#if subject.agents?.length || subject.orchestrationAgent}
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
    >
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">AI Agents</h3>

      <div class="space-y-4">
        <!-- Subject Agents -->
        {#if subject.agents?.length}
          {#each subject.agents as agent}
            <div class="border border-stone-200 dark:border-gray-600 rounded-lg p-4">
              <div class="flex items-center gap-2 mb-2">
                <h4 class="font-medium text-stone-900 dark:text-white">
                  {agent.name}
                </h4>
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getAgentTypeBadge(
                    agent.type
                  )}"
                >
                  {getAgentTypeLabel(agent.type)}
                </span>
              </div>
              <p class="text-sm text-stone-600 dark:text-gray-300 mb-2">
                {agent.instructions.substring(0, 150)}...
              </p>
              {#if agent.assignedMaterials?.length}
                <div class="text-xs text-stone-500 dark:text-gray-400">
                  Has access to {agent.assignedMaterials.length} reference materials
                </div>
              {/if}
            </div>
          {/each}
        {/if}

        <!-- Orchestration Agent -->
        {#if subject.orchestrationAgent}
          <div
            class="border border-purple-200 dark:border-purple-600 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20"
          >
            <div class="flex items-center gap-2 mb-2">
              <h4 class="font-medium text-stone-900 dark:text-white">
                {subject.orchestrationAgent.name}
              </h4>
              <span
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
              >
                Orchestration
              </span>
            </div>
            <p class="text-sm text-stone-600 dark:text-gray-300">
              Coordinates responses between {subject.agents?.length || 0} specialist agents
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Materials -->
  {#if subject.materials?.length}
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
    >
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">Reference Materials</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each subject.materials as material}
          <div class="border border-stone-200 dark:border-gray-600 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <svg
                class="w-4 h-4 text-stone-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h4 class="font-medium text-stone-900 dark:text-white text-sm">
                {material.fileName}
              </h4>
            </div>

            <div class="text-xs text-stone-500 dark:text-gray-400 space-y-1">
              <div>Status: {material.status}</div>
              {#if material.assignments?.allAgents}
                <div>Available to all agents</div>
              {:else if material.assignments?.specificAgents?.length}
                <div>Available to {material.assignments.specificAgents.length} agents</div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Learning Modes -->
  <div
    class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
  >
    <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">Start Learning</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Practice Mode -->
      <div class="border border-stone-200 dark:border-gray-600 rounded-lg p-4">
        <h4 class="font-medium text-stone-900 dark:text-white mb-2">Practice Mode</h4>
        <p class="text-sm text-stone-600 dark:text-gray-300 mb-4">
          {subject.practice?.summary || 'Interactive practice with guided feedback and support.'}
        </p>
        <Button class="w-full" on:click={() => handleStartLearning('practice')}>
          Start Practice
        </Button>
      </div>

      <!-- Exam Mode -->
      <div class="border border-stone-200 dark:border-gray-600 rounded-lg p-4">
        <h4 class="font-medium text-stone-900 dark:text-white mb-2">Assessment Mode</h4>
        <p class="text-sm text-stone-600 dark:text-gray-300 mb-4">
          {subject.exam?.summary || 'Formal assessment to test your knowledge and skills.'}
        </p>
        <Button class="w-full" variant="secondary" on:click={() => handleStartLearning('exam')}>
          Take Assessment
        </Button>
      </div>
    </div>
  </div>
</div>

<!-- Report Modal -->
{#if showReportModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">Report Subject</h3>

      <p class="text-sm text-stone-600 dark:text-gray-300 mb-4">
        You are reporting: <strong>{subject.name}</strong>
      </p>

      <div class="space-y-4">
        <div>
          <label
            for="report-reason"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Reason for reporting *
          </label>
          <select
            id="report-reason"
            bind:value={reportReason}
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
            required
          >
            <option value="">Select a reason...</option>
            <option value="inappropriate_content">Inappropriate Content</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="copyright">Copyright Violation</option>
            <option value="misinformation">Misinformation</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label
            for="report-details"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Additional details (optional)
          </label>
          <textarea
            id="report-details"
            bind:value={reportDetails}
            placeholder="Please provide more details about the issue..."
            rows="3"
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
          ></textarea>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <Button variant="secondary" class="flex-1" on:click={cancelReport}>Cancel</Button>
        <Button variant="primary" class="flex-1" on:click={submitReport} disabled={!reportReason}>
          Submit Report
        </Button>
      </div>
    </div>
  </div>
{/if}

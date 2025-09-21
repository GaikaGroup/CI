<script>
  import { createEventDispatcher } from 'svelte';
  import { user } from '$modules/auth/stores';
  import Button from '$shared/components/Button.svelte';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';

  export let subjects = [];
  export let showFilters = true;
  export let showReporting = true;
  export let allowSubjectCreation = false;

  const dispatch = createEventDispatcher();

  // Filter and search state
  let searchQuery = '';
  let selectedLanguageFilter = 'all';
  let selectedLevelFilter = 'all';
  let selectedCreatorFilter = 'all';
  let showReportModal = false;
  let reportingSubject = null;
  let reportReason = '';
  let reportDetails = '';

  // Get unique filter options from subjects
  $: languages = [...new Set(subjects.map((s) => s.language).filter(Boolean))];
  $: levels = [...new Set(subjects.map((s) => s.level).filter(Boolean))];

  // Filter subjects based on search and filters
  $: filteredSubjects = subjects.filter((subject) => {
    const matchesSearch =
      !searchQuery ||
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.skills?.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLanguage =
      selectedLanguageFilter === 'all' || subject.language === selectedLanguageFilter;
    const matchesLevel = selectedLevelFilter === 'all' || subject.level === selectedLevelFilter;
    const matchesCreator =
      selectedCreatorFilter === 'all' || subject.creatorRole === selectedCreatorFilter;

    return matchesSearch && matchesLanguage && matchesLevel && matchesCreator;
  });

  const handleSelection = (subject, mode) => {
    dispatch('select', { subject, mode });
  };

  const handleCreateSubject = () => {
    dispatch('create-subject');
  };

  const handleReportSubject = (subject) => {
    reportingSubject = subject;
    showReportModal = true;
  };

  const submitReport = () => {
    if (reportingSubject && reportReason) {
      dispatch('report-subject', {
        subjectId: reportingSubject.id,
        reason: reportReason,
        details: reportDetails
      });

      // Reset form
      showReportModal = false;
      reportingSubject = null;
      reportReason = '';
      reportDetails = '';
    }
  };

  const cancelReport = () => {
    showReportModal = false;
    reportingSubject = null;
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
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">Subject Catalog</h2>
      <p class="mt-2 text-stone-600 dark:text-gray-300">
        Choose from available learning subjects or create your own
      </p>
    </div>

    {#if allowSubjectCreation}
      <Button on:click={handleCreateSubject} variant="primary">Create Subject</Button>
    {/if}
  </div>

  {#if showFilters}
    <!-- Search and Filters -->
    <div class="space-y-4 rounded-xl bg-stone-50 p-4 dark:bg-gray-900">
      <!-- Search -->
      <div>
        <input
          type="text"
          placeholder="Search subjects..."
          bind:value={searchQuery}
          class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
        />
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            for="language-filter"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-1"
          >
            Language
          </label>
          <select
            id="language-filter"
            bind:value={selectedLanguageFilter}
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-amber-400"
          >
            <option value="all">All Languages</option>
            {#each languages as language}
              <option value={language}>{language}</option>
            {/each}
          </select>
        </div>

        <div>
          <label
            for="level-filter"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-1"
          >
            Level
          </label>
          <select
            id="level-filter"
            bind:value={selectedLevelFilter}
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-amber-400"
          >
            <option value="all">All Levels</option>
            {#each levels as level}
              <option value={level}>{level}</option>
            {/each}
          </select>
        </div>

        <div>
          <label
            for="creator-filter"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-1"
          >
            Creator
          </label>
          <select
            id="creator-filter"
            bind:value={selectedCreatorFilter}
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-amber-400"
          >
            <option value="all">All Creators</option>
            <option value="admin">Official</option>
            <option value="user">Community</option>
          </select>
        </div>
      </div>

      <!-- Results count -->
      <div class="text-sm text-stone-600 dark:text-gray-400">
        Showing {filteredSubjects.length} of {subjects.length} subjects
      </div>
    </div>
  {/if}

  {#if filteredSubjects.length === 0}
    <div class="text-center py-12">
      {#if subjects.length === 0}
        <p class="text-stone-500 dark:text-gray-400 mb-4">No subjects available yet.</p>
        {#if allowSubjectCreation}
          <Button on:click={handleCreateSubject} variant="primary">Create the First Subject</Button>
        {/if}
      {:else}
        <p class="text-stone-500 dark:text-gray-400">No subjects match your current filters.</p>
      {/if}
    </div>
  {:else}
    <div class="grid gap-6 md:grid-cols-2">
      {#each filteredSubjects as subject}
        <article
          class="flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-xl font-semibold text-stone-900 dark:text-white">
                    {subject.name}
                  </h3>
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getCreatorBadgeClass(
                      subject.creatorRole
                    )}"
                  >
                    {getCreatorLabel(subject.creatorRole)}
                  </span>
                </div>
                <p class="text-sm uppercase tracking-wide text-amber-600 dark:text-amber-300">
                  {subject.language}{subject.level ? ` · ${subject.level}` : ''}
                </p>
              </div>

              {#if showReporting && $user}
                <button
                  on:click={() => handleReportSubject(subject)}
                  class="text-stone-400 hover:text-red-500 transition-colors p-1"
                  title="Report inappropriate content"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <p class="text-sm text-stone-600 dark:text-gray-300">{subject.description}</p>

            {#if subject.skills?.length}
              <div class="flex flex-wrap gap-1">
                {#each subject.skills as skill}
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {skill}
                  </span>
                {/each}
              </div>
            {/if}

            <!-- Agent information -->
            {#if subject.agents?.length}
              <div class="text-xs text-stone-500 dark:text-gray-400">
                <span class="font-medium">Agents:</span>
                {subject.agents.length} specialized
                {#if subject.orchestrationAgent}
                  + orchestration
                {/if}
              </div>
            {/if}

            <!-- Material count -->
            {#if subject.materials?.length}
              <div class="text-xs text-stone-500 dark:text-gray-400">
                <span class="font-medium">Materials:</span>
                {subject.materials.length} reference documents
              </div>
            {/if}

            <div class="mt-4 space-y-3 rounded-xl bg-stone-50 p-4 text-sm dark:bg-gray-900">
              <h4 class="font-semibold text-stone-800 dark:text-gray-100">
                {getTranslation($selectedLanguage, 'learnPracticeSummary')}
              </h4>
              <p class="text-stone-600 dark:text-gray-300">{subject.practice?.summary}</p>
              <p class="text-xs text-stone-500 dark:text-gray-400">
                {getTranslation($selectedLanguage, 'learnPracticeMinWords').replace(
                  '{words}',
                  subject.practice?.minWords ?? '—'
                )}
              </p>
            </div>

            <div class="space-y-3 rounded-xl bg-stone-50 p-4 text-sm dark:bg-gray-900">
              <h4 class="font-semibold text-stone-800 dark:text-gray-100">
                {getTranslation($selectedLanguage, 'learnExamSummary')}
              </h4>
              <p class="text-stone-600 dark:text-gray-300">{subject.exam?.summary}</p>
              <p class="text-xs text-stone-500 dark:text-gray-400">
                {getTranslation($selectedLanguage, 'learnExamMinWords').replace(
                  '{words}',
                  subject.exam?.minWords ?? '—'
                )}
              </p>
            </div>

            {#if subject.settings?.navigation_codes?.quick_navigation}
              <div class="space-y-2 rounded-xl bg-stone-100 p-4 text-xs dark:bg-gray-900/70">
                <p class="font-semibold uppercase tracking-wide text-stone-600 dark:text-gray-200">
                  {getTranslation($selectedLanguage, 'learnNavigationCodesHeading')}
                </p>
                <p class="whitespace-pre-line text-stone-600 dark:text-gray-300">
                  {subject.settings.navigation_codes.quick_navigation}
                </p>
              </div>
            {/if}
          </div>

          <div class="mt-6 space-y-3">
            <!-- LLM Provider info -->
            {#if subject.llmSettings && !subject.llmSettings.allowOpenAI}
              <div class="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clip-rule="evenodd"
                  />
                </svg>
                Local LLM only (no external APIs)
              </div>
            {/if}

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button class="w-full" on:click={() => handleSelection(subject, 'practice')}>
                Start Learning
              </Button>
              <Button
                class="w-full"
                variant="secondary"
                on:click={() => handleSelection(subject, 'exam')}
              >
                Take Assessment
              </Button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<!-- Report Modal -->
{#if showReportModal && reportingSubject}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">Report Subject</h3>

      <p class="text-sm text-stone-600 dark:text-gray-300 mb-4">
        You are reporting: <strong>{reportingSubject.name}</strong>
      </p>

      <div class="space-y-4">
        <div>
          <label
            for="report-reason-selection"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Reason for reporting *
          </label>
          <select
            id="report-reason-selection"
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
            for="report-details-selection"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Additional details (optional)
          </label>
          <textarea
            id="report-details-selection"
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

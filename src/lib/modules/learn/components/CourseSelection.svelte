<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { user } from '$modules/auth/stores';
  import { activeEnrollments } from '$modules/courses/stores/enrollmentStore.js';
  import Button from '$shared/components/Button.svelte';

  import { debounce } from '$modules/courses/utils/performance.js';
  import { announceToScreenReader, generateId } from '$modules/courses/utils/accessibility.js';

  export let courses = [];
  export let showFilters = true;
  export let showReporting = true;
  export let allowCreateCourse = true;
  export let headerTitle = 'Course Catalog';
  export let headerSubtitle = 'Choose from available learning courses or create your own';

  const dispatch = createEventDispatcher();

  // Filter and search state
  let searchQuery = '';
  let selectedLanguageFilter = 'all';
  let selectedLevelFilter = 'all';
  let selectedCreatorFilter = 'all';
  let showReportModal = false;
  let reportingCourse = null;
  let reportReason = '';
  let reportDetails = '';

  // Performance and accessibility
  let searchInputId = generateId('search-input');
  let resultsAnnouncementId = generateId('results-announcement');
  let debouncedSearch = debounce((query) => {
    searchQuery = query;
    announceSearchResults();
  }, 300);

  // Get unique filter options from courses
  $: languages = [...new Set(courses.map((s) => s.language).filter(Boolean))];
  $: levels = [...new Set(courses.map((s) => s.level).filter(Boolean))];

  // Filter courses based on search and filters
  $: filteredCourses = courses.filter((course) => {
    const matchesSearch =
      !searchQuery ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.skills?.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLanguage =
      selectedLanguageFilter === 'all' || course.language === selectedLanguageFilter;
    const matchesLevel = selectedLevelFilter === 'all' || course.level === selectedLevelFilter;
    const matchesCreator =
      selectedCreatorFilter === 'all' || course.creatorRole === selectedCreatorFilter;

    return matchesSearch && matchesLanguage && matchesLevel && matchesCreator;
  });

  $: enrolledCourseIds = new Set(
    ($activeEnrollments ?? []).map((enrollment) => enrollment.courseId)
  );

  const isCourseEnrolled = (course) => {
    if (!course?.id) {
      return false;
    }

    return enrolledCourseIds.has(course.id);
  };

  const handleJoinCourse = (course) => {
    dispatch('join-course', { course });
  };

  const handleLearnCourse = (course) => {
    dispatch('learn-course', { course });
  };

  const handlePrimaryAction = (course) => {
    if (isCourseEnrolled(course)) {
      handleLearnCourse(course);
    } else {
      handleJoinCourse(course);
    }
  };

  const handleEditCourse = (course) => {
    dispatch('edit-course', { course });
  };

  const handleCreateCourse = () => {
    dispatch('create-course');
  };

  const handleReportCourse = (course) => {
    reportingCourse = course;
    showReportModal = true;
  };

  const submitReport = () => {
    if (reportingCourse && reportReason) {
      dispatch('report-course', {
        courseId: reportingCourse.id,
        reason: reportReason,
        details: reportDetails
      });

      // Reset form
      showReportModal = false;
      reportingCourse = null;
      reportReason = '';
      reportDetails = '';
    }
  };

  const cancelReport = () => {
    showReportModal = false;
    reportingCourse = null;
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

  const canUserEditCourse = (course) => {
    return $user && course.creatorId === $user.id;
  };

  // Accessibility functions
  function announceSearchResults() {
    const count = filteredCourses.length;
    const message = count === 1 ? `${count} course found` : `${count} courses found`;
    announceToScreenReader(message);
  }

  function handleSearchInput(event) {
    debouncedSearch(event.target.value);
  }

  onMount(() => {
    // Announce initial results
    announceSearchResults();
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">{headerTitle}</h2>
      <p class="mt-2 text-stone-600 dark:text-gray-300">{headerSubtitle}</p>
    </div>

    {#if $user && allowCreateCourse}
      <Button on:click={handleCreateCourse} variant="primary">Create Course</Button>
    {/if}
  </div>

  {#if showFilters}
    <!-- Search and Filters -->
    <div class="space-y-4 rounded-xl bg-stone-50 p-4 dark:bg-gray-900">
      <!-- Search -->
      <div>
        <label for={searchInputId} class="sr-only">Search courses</label>
        <input
          id={searchInputId}
          type="text"
          placeholder="Search courses..."
          on:input={handleSearchInput}
          class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
          aria-describedby={resultsAnnouncementId}
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
      <div
        id={resultsAnnouncementId}
        class="text-sm text-stone-600 dark:text-gray-400"
        aria-live="polite"
        aria-atomic="true"
      >
        Showing {filteredCourses.length} of {courses.length} courses
      </div>
    </div>
  {/if}

  {#if filteredCourses.length === 0}
    <div class="text-center py-12">
      {#if courses.length === 0}
        <p class="text-stone-500 dark:text-gray-400 mb-4">No courses available yet.</p>
        {#if $user}
          <Button on:click={handleCreateCourse} variant="primary">Create the First Course</Button>
        {/if}
      {:else}
        <p class="text-stone-500 dark:text-gray-400">No courses match your current filters.</p>
      {/if}
    </div>
  {:else}
    <div class="grid gap-6 md:grid-cols-2" role="list" aria-label="Course catalogue">
      {#each filteredCourses as course}
        <article
          class="flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md dark:border-gray-700 dark:bg-gray-800"
          role="listitem"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-lg font-semibold text-stone-900 dark:text-white">
                    {course.name}
                  </h3>
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getCreatorBadgeClass(
                      course.creatorRole
                    )}"
                  >
                    {getCreatorLabel(course.creatorRole)}
                  </span>
                  {#if isCourseEnrolled(course)}
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                    >
                      Enrolled
                    </span>
                  {/if}
                </div>
                <p class="text-sm uppercase tracking-wide text-amber-600 dark:text-amber-300">
                  {course.language}{course.level ? ` · ${course.level}` : ''}
                </p>
              </div>

              <div class="flex items-center gap-1">
                {#if canUserEditCourse(course)}
                  <button
                    on:click={() => handleEditCourse(course)}
                    class="text-stone-400 hover:text-amber-600 focus:text-amber-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    aria-label="Edit {course.name}"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                {/if}
                {#if showReporting && $user}
                  <button
                    on:click={() => handleReportCourse(course)}
                    class="text-stone-400 hover:text-red-500 focus:text-red-500 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label="Report {course.name} for inappropriate content"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
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

            <!-- Shortened description -->
            <p
              class="text-sm text-stone-600 dark:text-gray-300"
              style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
            >
              {course.description}
            </p>

            {#if course.skills?.length}
              <div class="flex flex-wrap gap-1">
                {#each course.skills.slice(0, 4) as skill}
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {skill}
                  </span>
                {/each}
                {#if course.skills.length > 4}
                  <span class="text-xs text-stone-500 dark:text-gray-400">
                    +{course.skills.length - 4} more
                  </span>
                {/if}
              </div>
            {/if}
          </div>

          <div class="mt-4 space-y-3">
            <!-- LLM Provider info -->
            {#if course.llmSettings && !course.llmSettings.allowOpenAI}
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

            <Button
              class="w-full"
              on:click={() => handlePrimaryAction(course)}
              aria-label={isCourseEnrolled(course)
                ? `Continue learning ${course.name}`
                : `Join ${course.name}`}
            >
              {isCourseEnrolled(course) ? 'Learn' : 'Join'}
            </Button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<!-- Report Modal -->
{#if showReportModal && reportingCourse}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">Report Course</h3>

      <p class="text-sm text-stone-600 dark:text-gray-300 mb-4">
        You are reporting: <strong>{reportingCourse.name}</strong>
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

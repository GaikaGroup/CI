<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import EnhancedChatInterface from '$modules/chat/components/EnhancedChatInterface.svelte';
  import { checkAuth } from '$modules/auth/stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import CourseSelection from '$modules/learn/components/CourseSelection.svelte';
  import Button from '$shared/components/Button.svelte';
  import { setMode } from '$lib/stores/mode';
  import { coursesStore } from '$lib/stores/coursesDB';
  import { user } from '$modules/auth/stores';
  import { examProfile, initialiseExamProfile, clearExamProfile } from '$lib/stores/examProfile';
  import { resetLearningSession, startLearningSession } from '$modules/learn/utils/session.js';
  import { getCourseUrl } from '$lib/utils/courseUrl.js';

  const buildCatalogueUrl = (course, action) => {
    if (!course) {
      return '/catalogue';
    }

    const slug = slugify(course.name, course.id);
    const params = new URLSearchParams({
      courseId: course.id,
      course: slug
    });

    if (action) {
      params.set('action', action);
    }

    return `/catalogue?${params.toString()}`;
  };

  const syncCatalogueUrl = (course, action) => {
    if (!course) {
      return;
    }

    goto(buildCatalogueUrl(course, action), {
      replaceState: true,
      keepfocus: true,
      noscroll: true
    });
  };

  const getVisibility = (course) => course?.visibility ?? 'draft';

  const getUpdatedMetadata = (course) => ({
    ...(course?.metadata ?? {}),
    updatedAt: new Date()
  });

  const updateCourseVisibility = (course, visibility) => {
    if (!course || getVisibility(course) === visibility) {
      return;
    }

    coursesStore.updateCourse(course.id, {
      visibility,
      metadata: getUpdatedMetadata(course)
    });
  };

  let lastHandledCourseAction = '';

  const handleCourseSelect = (event) => {
    const { course, mode } = event.detail;
    if (!course || !mode) {
      return;
    }

    // Navigate directly to the learn page
    goto(getCourseUrl(course));
  };

  const handleJoinCourse = async (event) => {
    const { course } = event.detail;
    if (!course) {
      console.error('No course provided to handleJoinCourse');
      return;
    }

    // Check if user is authenticated before allowing them to join
    if (!$user) {
      console.log('User not authenticated, redirecting to login');
      goto('/login?redirect=/catalogue');
      return;
    }

    console.log(
      'Attempting to join course:',
      course.name,
      'User:',
      $user.name,
      'User ID:',
      $user.id
    );

    // Import enrollment store dynamically to avoid circular dependencies
    try {
      const { enrollmentStore } = await import('$lib/stores/enrollmentDB.js');
      console.log('Enrollment store imported successfully');

      const result = await enrollmentStore.enrollInCourse(course.id);
      console.log('Enrollment result:', result);

      if (result.success) {
        console.log('Successfully enrolled, navigating to learn page');
        // Navigate directly to the learn page instead of staying in catalogue
        goto(getCourseUrl(course));
      } else {
        console.error('Failed to join course:', result.error);
        alert(`Failed to join course: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to import enrollment store:', error);
      alert(`Error joining course: ${error.message}`);
    }
  };

  const handleLearnCourse = (event) => {
    const { course } = event.detail;
    if (!course) {
      return;
    }

    // Navigate directly to the learn page instead of staying in catalogue
    goto(getCourseUrl(course));
  };

  const handleEditCourse = (event) => {
    const { course } = event.detail;
    console.log('Edit course event:', course);

    if (!course || !course.id) {
      console.error('Cannot edit course: missing course or course ID', course);
      return;
    }

    console.log('Course name:', course.name);
    const slug = course.name ? slugify(course.name, course.id) : course.id;
    console.log('Generated slug:', slug);
    goto(`/catalogue/edit?id=${course.id}&course=${slug}&action=edit`);
  };

  const handleCreateCourse = () => {
    goto('/catalogue/edit?new=true');
  };

  const handleChangeCourse = () => {
    clearExamProfile();
    resetLearningSession();
  };

  onMount(() => {
    checkAuth();
    coursesStore.initialize();
    initialiseExamProfile();
    setMode('catalogue');
  });

  $: {
    const currentUrl = $page?.url;
    const courseIdFromUrl = currentUrl?.searchParams?.get('courseId');
    const actionFromUrl = currentUrl?.searchParams?.get('action');

    if (!courseIdFromUrl || !actionFromUrl) {
      lastHandledCourseAction = '';
    } else if ($coursesStore.length) {
      const key = `${courseIdFromUrl}:${actionFromUrl}`;

      if (key !== lastHandledCourseAction) {
        const courseFromStore = $coursesStore.find((course) => course.id === courseIdFromUrl);

        if (courseFromStore) {
          if (actionFromUrl === 'open' || actionFromUrl === 'preview') {
            startLearningSession(courseFromStore, 'practice');
          } else if (actionFromUrl === 'publish') {
            updateCourseVisibility(courseFromStore, 'published');
          } else if (actionFromUrl === 'make-private') {
            updateCourseVisibility(courseFromStore, 'private');
          }

          lastHandledCourseAction = key;
        }
      }
    }
  }

  $: activeMode = $examProfile
    ? $examProfile.mode === 'exam'
      ? $examProfile.exam
      : $examProfile.practice
    : null;

  $: modeLabel = $examProfile
    ? getTranslation(
        $selectedLanguage,
        $examProfile.mode === 'exam' ? 'learnModeExamLabel' : 'learnModePracticeLabel'
      )
    : '';

  $: skillsLabel =
    activeMode && $examProfile?.skills?.length
      ? `${getTranslation($selectedLanguage, 'learnModeActiveSkills')}: ${$examProfile.skills.join(', ')}`
      : '';

  $: wordGoal = activeMode?.minWords
    ? getTranslation($selectedLanguage, 'learnModeActiveWordGoal').replace(
        '{words}',
        activeMode.minWords
      )
    : null;

  $: navigationSummary = $examProfile?.settings?.navigation_codes?.quick_navigation ?? '';
  $: navigationRules = $examProfile?.settings?.navigation_codes?.code_processing_rules ?? '';
</script>

<svelte:head>
  <title>Course Catalogue</title>
</svelte:head>

<div class="min-h-screen">
  <h1 class="sr-only">Course Catalogue</h1>
  <div class="mx-auto max-w-5xl px-4 py-8">
    {#if !$examProfile}
      <CourseSelection
        courses={$coursesStore}
        on:select={handleCourseSelect}
        on:join-course={handleJoinCourse}
        on:learn-course={handleLearnCourse}
        on:edit-course={handleEditCourse}
        on:create-course={handleCreateCourse}
      />
    {:else}
      <section
        class="mb-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="space-y-3">
            <div>
              <p
                class="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
              >
                {getTranslation($selectedLanguage, 'learnCurrentCourse')}
              </p>
              <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">
                {$examProfile.courseName}
              </h2>
            </div>
            <p class="text-sm text-stone-600 dark:text-gray-300">
              {$examProfile.description}
            </p>
            <div class="flex flex-wrap gap-3 text-sm font-medium text-stone-700 dark:text-gray-200">
              <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-gray-800/60">
                {modeLabel}
              </span>
              {#if $examProfile.level}
                <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-gray-800/60">
                  {$examProfile.level}
                </span>
              {/if}
              {#if $examProfile.language}
                <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-gray-800/60">
                  {$examProfile.language}
                </span>
              {/if}
            </div>
          </div>
          <div class="flex items-start gap-3">
            <Button variant="secondary" on:click={handleChangeCourse}>
              {getTranslation($selectedLanguage, 'learnChangeCourse')}
            </Button>
          </div>
        </div>

        {#if activeMode}
          <div class="mt-6 grid gap-4 md:grid-cols-2">
            <div class="space-y-2 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-gray-900/60">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
              >
                {getTranslation($selectedLanguage, 'learnModeActiveSummary')}
              </p>
              <p class="text-sm text-stone-700 dark:text-gray-200">{activeMode.summary}</p>
              {#if skillsLabel}
                <p class="text-xs text-stone-500 dark:text-gray-400">{skillsLabel}</p>
              {/if}
            </div>
            <div class="space-y-2 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-gray-900/60">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
              >
                {getTranslation($selectedLanguage, 'learnModeActiveInstructions')}
              </p>
              <p class="text-sm text-stone-700 dark:text-gray-200">{activeMode.instructions}</p>
              {#if wordGoal}
                <p class="text-xs text-stone-500 dark:text-gray-400">{wordGoal}</p>
              {/if}
            </div>
            {#if activeMode.followUp}
              <div
                class="space-y-2 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-gray-900/60 md:col-span-2"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
                >
                  {getTranslation($selectedLanguage, 'learnModeActiveFollowUp')}
                </p>
                <p class="text-sm text-stone-700 dark:text-gray-200">{activeMode.followUp}</p>
              </div>
            {/if}

            {#if navigationSummary}
              <div
                class="space-y-2 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-gray-900/60 md:col-span-2"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
                >
                  {getTranslation($selectedLanguage, 'learnNavigationCodesHeading')}
                </p>
                <p class="whitespace-pre-line text-sm text-stone-700 dark:text-gray-200">
                  {navigationSummary}
                </p>
                {#if navigationRules}
                  <p class="whitespace-pre-line text-xs text-stone-500 dark:text-gray-400">
                    {navigationRules}
                  </p>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </section>

      <EnhancedChatInterface />
    {/if}
  </div>
</div>

<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { activeEnrollments, enrollmentStats } from '$modules/courses/stores/enrollmentStore.js';
  import { coursesStore } from '$lib/stores/courses';
  import { user, checkAuth } from '$modules/auth/stores';
  import { initialiseExamProfile } from '$lib/stores/examProfile';
  import { startLearningSession } from '$modules/learn/utils/session.js';
  import { Award, BookOpen, GraduationCap, PenSquare, TrendingUp, Users } from 'lucide-svelte';

  const roleTabs = [
    {
      id: 'student',
      label: 'Student',
      icon: GraduationCap,
      subtitle: 'Track your learning progress and discover new courses'
    },
    {
      id: 'author',
      label: 'Author',
      icon: PenSquare,
      subtitle: 'Create and manage your educational content'
    }
  ];

  const studentTabs = [
    { id: 'my-courses', label: 'My Courses' },
    { id: 'enrolled', label: 'Enrolled' }
  ];

  const authorTabs = [
    { id: 'drafts', label: 'Drafts' },
    { id: 'published', label: 'Published' },
    { id: 'private', label: 'Private' }
  ];

  let activeRoleTab = 'student';
  let activeStudentTab = 'my-courses';
  let activeAuthorTab = 'drafts';
  let activeSubtitle = roleTabs[0].subtitle;

  const getVisibility = (course) => course?.visibility ?? 'draft';

  const visibilityLabels = {
    draft: '[Draft]',
    private: '[Private]',
    published: '[Published]'
  };

  const visibilityClasses = {
    draft: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    private: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
    published: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200'
  };

  const canPublish = (course) => {
    const visibility = getVisibility(course);
    return visibility === 'draft' || visibility === 'private';
  };

  const canMakePrivate = (course) => {
    const visibility = getVisibility(course);
    return visibility === 'draft' || visibility === 'published';
  };

  const getProgressPercentage = (enrollment) => {
    if (!enrollment) {
      return 0;
    }
    const lessonsCompleted = enrollment.progress?.lessonsCompleted ?? 0;
    const assessmentsTaken = enrollment.progress?.assessmentsTaken ?? 0;
    const total = lessonsCompleted + assessmentsTaken;
    return Math.min(Math.round(total * 10), 100);
  };

  const getEnrollmentCount = (course) => course?.metadata?.userCount ?? 0;

  const getUpdatedMetadata = (course) => ({
    ...(course?.metadata ?? {}),
    updatedAt: new Date()
  });

  const openCourse = (course) => {
    if (!course) {
      return;
    }
    startLearningSession(course, 'practice');
    goto('/catalogue');
  };

  const editCourse = (course) => {
    if (!course) {
      return;
    }
    goto(`/catalogue/edit?id=${course.id}`);
  };

  const previewCourse = (course) => {
    openCourse(course);
  };

  const updateCourseVisibility = (course, visibility) => {
    if (!course || getVisibility(course) === visibility) {
      return;
    }

    coursesStore.updateCourse(course.id, {
      visibility,
      metadata: getUpdatedMetadata(course)
    });
  };

  const publishCourse = (course) => updateCourseVisibility(course, 'published');
  const makePrivateCourse = (course) => updateCourseVisibility(course, 'private');

  onMount(() => {
    checkAuth();
    coursesStore.initialise();
    initialiseExamProfile();
  });

  $: activeSubtitle =
    roleTabs.find((tab) => tab.id === activeRoleTab)?.subtitle ?? roleTabs[0].subtitle;

  $: enrolledCourses = $activeEnrollments
    .map((enrollment) => {
      const course = $coursesStore.find((s) => s.id === enrollment.courseId);
      return course ? { ...course, enrollment } : null;
    })
    .filter(Boolean);

  $: studentMyCourses = enrolledCourses.filter((course) => $user && course.creatorId === $user.id);
  $: studentEnrolledCourses = enrolledCourses.filter(
    (course) => !$user || course.creatorId !== $user.id
  );

  $: authoredCourses = $coursesStore.filter((course) => $user && course.creatorId === $user.id);
  $: draftCourses = authoredCourses.filter((course) => getVisibility(course) === 'draft');
  $: publishedCourses = authoredCourses.filter((course) => getVisibility(course) === 'published');
  $: privateCourses = authoredCourses.filter((course) => getVisibility(course) === 'private');
</script>

<svelte:head>
  <title>My Courses</title>
</svelte:head>

<div class="bg-slate-50 py-12 dark:bg-slate-950">
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <div class="mb-10">
      <h1 class="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
        My Courses
      </h1>
      <p class="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{activeSubtitle}</p>
    </div>

    {#if $enrollmentStats}
      <div class="mb-10 grid gap-5 md:grid-cols-3">
        <div
          class="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
        >
          <div class="flex items-center justify-between">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Active Courses
              </p>
              <p class="mt-2 text-2xl font-bold text-amber-500">{$enrollmentStats.active}</p>
            </div>
            <BookOpen class="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div
          class="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
        >
          <div class="flex items-center justify-between">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Completed
              </p>
              <p class="mt-2 text-2xl font-bold text-emerald-500">{$enrollmentStats.completed}</p>
            </div>
            <Award class="h-8 w-8 text-emerald-500" />
          </div>
        </div>

        <div
          class="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
        >
          <div class="flex items-center justify-between">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Total Lessons
              </p>
              <p class="mt-2 text-2xl font-bold text-sky-500">{$enrollmentStats.totalLessons}</p>
            </div>
            <TrendingUp class="h-8 w-8 text-sky-500" />
          </div>
        </div>
      </div>
    {/if}

    <div
      class="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-amber-100/20 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
        <nav class="flex flex-wrap gap-8">
          {#each roleTabs as tab}
            <button
              type="button"
              class={`relative flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors focus:outline-none ${
                activeRoleTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              on:click={() => (activeRoleTab = tab.id)}
            >
              <svelte:component
                this={tab.icon}
                class={`h-4 w-4 ${activeRoleTab === tab.id ? 'text-amber-500' : 'text-slate-400'}`}
              />
              {tab.label}
            </button>
          {/each}
        </nav>
      </div>

      {#if activeRoleTab === 'student'}
        <section class="pt-8">
          <div class="mb-8">
            <div class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              {#each studentTabs as tab}
                <button
                  type="button"
                  class={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    activeStudentTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
                  }`}
                  on:click={() => (activeStudentTab = tab.id)}
                >
                  {tab.label}
                </button>
              {/each}
            </div>
          </div>

          {#if activeStudentTab === 'my-courses'}
            {#if studentMyCourses.length === 0}
              <div
                class="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div
                  class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"
                >
                  <PenSquare class="h-10 w-10" />
                </div>
                <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
                  You haven't created any courses yet. Switch to Author to get started!
                </h2>
                <p class="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Use the author tools to design your first learning experience and see it appear
                  here instantly.
                </p>
                <button
                  type="button"
                  class="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  on:click={() => {
                    activeRoleTab = 'author';
                    goto('/catalogue/edit?new=true');
                  }}
                >
                  <PenSquare class="h-4 w-4" />
                  Create Your First Course
                </button>
              </div>
            {:else}
              <div class="grid gap-6 lg:grid-cols-2">
                {#each studentMyCourses as course}
                  <article
                    class="group rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                          {course.name}
                        </h3>
                        <div
                          class="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-300"
                        >
                          <span
                            class={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              visibilityClasses[getVisibility(course)]
                            }`}>{visibilityLabels[getVisibility(course)]}</span
                          >
                          {#if course.language}
                            <span>{course.language}</span>
                          {/if}
                          {#if course.level}
                            <span>• {course.level}</span>
                          {/if}
                        </div>
                      </div>
                    </div>

                    <p class="mt-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                      {course.description}
                    </p>

                    <div class="mt-6">
                      <div
                        class="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-300"
                      >
                        <span>Progress</span>
                        <span class="text-slate-900 dark:text-white">
                          {getProgressPercentage(course.enrollment)}%
                        </span>
                      </div>
                      <div
                        class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                      >
                        <div
                          class="h-full rounded-full bg-amber-500 transition-all"
                          style={`width: ${getProgressPercentage(course.enrollment)}%`}
                        ></div>
                      </div>
                      <div
                        class="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500"
                      >
                        <span>Lessons {course.enrollment.progress?.lessonsCompleted ?? 0}</span>
                        <span>Assessments {course.enrollment.progress?.assessmentsTaken ?? 0}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      on:click={() => openCourse(course)}
                    >
                      Open Course
                    </button>
                  </article>
                {/each}
              </div>
            {/if}
          {:else if studentEnrolledCourses.length === 0}
            <div
              class="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div
                class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"
              >
                <GraduationCap class="h-10 w-10" />
              </div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
                You haven't enrolled in any courses yet. Browse the catalogue to find courses.
              </h2>
              <p class="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Explore our catalogue to join courses authored by other instructors and grow your
                skills.
              </p>
              <a
                href="/catalogue"
                class="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <BookOpen class="h-4 w-4" />
                Browse Catalogue
              </a>
            </div>
          {:else}
            <div class="grid gap-6 lg:grid-cols-2">
              {#each studentEnrolledCourses as course}
                <article
                  class="group rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                      {course.name}
                    </h3>
                    <div
                      class="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-300"
                    >
                      {#if course.language}
                        <span>{course.language}</span>
                      {/if}
                      {#if course.level}
                        <span>• {course.level}</span>
                      {/if}
                    </div>
                  </div>

                  <p class="mt-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                    {course.description}
                  </p>

                  <div class="mt-6">
                    <div
                      class="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-300"
                    >
                      <span>Progress</span>
                      <span class="text-slate-900 dark:text-white">
                        {getProgressPercentage(course.enrollment)}%
                      </span>
                    </div>
                    <div
                      class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                    >
                      <div
                        class="h-full rounded-full bg-amber-500 transition-all"
                        style={`width: ${getProgressPercentage(course.enrollment)}%`}
                      ></div>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    on:click={() => openCourse(course)}
                  >
                    Open Course
                  </button>
                </article>
              {/each}
            </div>
          {/if}
        </section>
      {:else}
        <section class="pt-8">
          <div class="mb-8">
            <div class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              {#each authorTabs as tab}
                <button
                  type="button"
                  class={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    activeAuthorTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
                  }`}
                  on:click={() => (activeAuthorTab = tab.id)}
                >
                  {tab.label}
                </button>
              {/each}
            </div>
          </div>

          {#if activeAuthorTab === 'drafts'}
            {#if draftCourses.length === 0}
              <div
                class="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div
                  class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"
                >
                  <PenSquare class="h-10 w-10" />
                </div>
                <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
                  You don't have any draft courses yet. Create your first course!
                </h2>
                <p class="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Draft courses are private until you publish them—perfect for experimenting and
                  iterating.
                </p>
                <button
                  type="button"
                  class="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  on:click={() => goto('/catalogue/edit?new=true')}
                >
                  <PenSquare class="h-4 w-4" />
                  Create New Course
                </button>
              </div>
            {:else}
              <div class="space-y-6">
                {#each draftCourses as course}
                  <article
                    class="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                          {course.name}
                        </h3>
                        <span
                          class={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            visibilityClasses[getVisibility(course)]
                          }`}>{visibilityLabels[getVisibility(course)]}</span
                        >
                      </div>
                    </div>

                    <p class="mt-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                      {course.description}
                    </p>

                    <div class="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        on:click={() => editCourse(course)}
                      >
                        Edit Course
                      </button>
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        on:click={() => previewCourse(course)}
                      >
                        Preview as Student
                      </button>
                      {#if canPublish(course)}
                        <button
                          type="button"
                          class="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200"
                          on:click={() => publishCourse(course)}
                        >
                          Publish
                        </button>
                      {/if}
                      {#if canMakePrivate(course)}
                        <button
                          type="button"
                          class="inline-flex items-center gap-2 rounded-xl bg-purple-100 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:bg-purple-900/40 dark:text-purple-200"
                          on:click={() => makePrivateCourse(course)}
                        >
                          Make Private
                        </button>
                      {/if}
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          {:else if activeAuthorTab === 'published'}
            {#if publishedCourses.length === 0}
              <div
                class="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div
                  class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"
                >
                  <Users class="h-10 w-10" />
                </div>
                <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
                  You haven't published any courses yet.
                </h2>
                <p class="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Publish a course to make it visible in the catalogue and start enrolling learners.
                </p>
              </div>
            {:else}
              <div class="space-y-6">
                {#each publishedCourses as course}
                  <article
                    class="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                          {course.name}
                        </h3>
                        <span
                          class={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            visibilityClasses[getVisibility(course)]
                          }`}>{visibilityLabels[getVisibility(course)]}</span
                        >
                      </div>
                      <div
                        class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Users class="h-3.5 w-3.5" />
                        {getEnrollmentCount(course)} enrolled
                      </div>
                    </div>

                    <p class="mt-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                      {course.description}
                    </p>

                    <div class="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        on:click={() => editCourse(course)}
                      >
                        Edit Course
                      </button>
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        on:click={() => previewCourse(course)}
                      >
                        Preview as Student
                      </button>
                      {#if canMakePrivate(course)}
                        <button
                          type="button"
                          class="inline-flex items-center gap-2 rounded-xl bg-purple-100 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:bg-purple-900/40 dark:text-purple-200"
                          on:click={() => makePrivateCourse(course)}
                        >
                          Make Private
                        </button>
                      {/if}
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          {:else if privateCourses.length === 0}
            <div
              class="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div
                class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"
              >
                <BookOpen class="h-10 w-10" />
              </div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-white">
                You don't have any private courses yet.
              </h2>
              <p class="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Private courses stay hidden from the catalogue while remaining accessible to invited
                learners.
              </p>
            </div>
          {:else}
            <div class="space-y-6">
              {#each privateCourses as course}
                <article
                  class="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                        {course.name}
                      </h3>
                      <span
                        class={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          visibilityClasses[getVisibility(course)]
                        }`}>{visibilityLabels[getVisibility(course)]}</span
                      >
                    </div>
                  </div>

                  <p class="mt-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                    {course.description}
                  </p>

                  <div class="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      on:click={() => editCourse(course)}
                    >
                      Edit Course
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      on:click={() => previewCourse(course)}
                    >
                      Preview as Student
                    </button>
                    {#if canPublish(course)}
                      <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200"
                        on:click={() => publishCourse(course)}
                      >
                        Publish
                      </button>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    </div>
  </div>
</div>

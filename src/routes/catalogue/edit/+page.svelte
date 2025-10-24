<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user } from '$modules/auth/stores';
  import { coursesStore } from '$lib/stores/coursesDB';
  import CourseEditMode from '$modules/courses/components/CourseEditMode.svelte';
  import { CourseService } from '$modules/courses/services/CourseService.js';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';

  let course = null;
  let isNew = false;
  let loading = true;
  let error = null;

  const courseService = new CourseService(coursesStore);

  onMount(async () => {
    const courseId = $page.url.searchParams.get('id');
    isNew = $page.url.searchParams.get('new') === 'true';

    if (!$user) {
      goto('/login?redirect=' + encodeURIComponent($page.url.pathname + $page.url.search));
      return;
    }

    if (isNew) {
      // Creating new course
      course = null;
      loading = false;
    } else if (courseId) {
      // Editing existing course
      try {
        const result = await courseService.getCourse(courseId);
        if (result.success) {
          course = result.course;

          // Check if user can edit this course
          const canEdit = courseService.canUserModifyCourse(course, $user.id, $user.type);
          if (!canEdit.allowed) {
            error = canEdit.reason;
            loading = false;
            return;
          }
        } else {
          error = result.error || 'Course not found';
        }
      } catch (err) {
        console.error('Error loading course:', err);
        error = 'Failed to load course';
      }
      loading = false;
    } else {
      error = 'No course ID provided';
      loading = false;
    }
  });

  async function handleSave(event) {
    const { course: courseData, isNew: creating } = event.detail;

    try {
      let result;
      if (creating) {
        result = await courseService.createCourse(courseData, $user.id, $user.type);
      } else {
        result = await courseService.updateCourse(courseData.id, courseData, $user.id, $user.type);
      }

      if (result.success) {
        // Navigate back to catalogue
        goto('/catalogue');
      } else {
        console.error('Failed to save course:', result.error);
        // Error will be handled by the CourseEditMode component
      }
    } catch (err) {
      console.error('Error saving course:', err);
    }
  }

  function handleCancel() {
    goto('/catalogue');
  }
</script>

<svelte:head>
  <title>{isNew ? getTranslation($selectedLanguage, 'createCourseTitle') : `${getTranslation($selectedLanguage, 'editCourseTitle')} ${course?.name || ''}`}</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
      <p class="text-stone-600 dark:text-gray-300">{getTranslation($selectedLanguage, 'loadingCourse')}</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md"
      >
        <h2 class="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">{getTranslation($selectedLanguage, 'error')}</h2>
        <p class="text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button
          on:click={() => goto('/catalogue')}
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          {getTranslation($selectedLanguage, 'backToCatalogue')}
        </button>
      </div>
    </div>
  </div>
{:else}
  <CourseEditMode {course} {isNew} on:save={handleSave} on:cancel={handleCancel} />
{/if}

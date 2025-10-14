<script>
  import { onMount } from 'svelte';
  import { coursesStore } from '$lib/stores/courses';
  import { user, checkAuth } from '$modules/auth/stores';
  import { activeEnrollments, enrollmentStats } from '$modules/courses/stores/enrollmentStore.js';

  onMount(async () => {
    await checkAuth();
    coursesStore.initialise();
  });
</script>

<svelte:head>
  <title>Debug Courses</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-6">Debug Information</h1>

  <div class="space-y-6">
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border">
      <h2 class="text-lg font-semibold mb-2">User Information</h2>
      <pre class="text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
{JSON.stringify($user, null, 2)}
      </pre>
    </div>

    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border">
      <h2 class="text-lg font-semibold mb-2">Available Courses ({$coursesStore.length})</h2>
      <pre class="text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
{JSON.stringify($coursesStore, null, 2)}
      </pre>
    </div>

    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border">
      <h2 class="text-lg font-semibold mb-2">Active Enrollments ({$activeEnrollments.length})</h2>
      <pre class="text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
{JSON.stringify($activeEnrollments, null, 2)}
      </pre>
    </div>

    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border">
      <h2 class="text-lg font-semibold mb-2">Enrollment Stats</h2>
      <pre class="text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
{JSON.stringify($enrollmentStats, null, 2)}
      </pre>
    </div>
  </div>
</div>

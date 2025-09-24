<script>
  import { onMount } from 'svelte';
  import {
    enrollmentStore,
    activeEnrollments,
    enrollmentStats
  } from '$modules/courses/stores/enrollmentStore.js';
  import { coursesStore } from '$lib/stores/courses';
  import { user } from '$modules/auth/stores';
  import { userEnrollmentService } from '$modules/courses/services/UserEnrollmentService.js';

  let debugInfo = {};

  onMount(() => {
    // Create some test enrollments if user exists
    if ($user) {
      console.log('Creating test enrollments for user:', $user.id);

      // Enroll in DELE B1
      const result1 = userEnrollmentService.enrollUser($user.id, 'dele-b1');
      console.log('DELE B1 enrollment result:', result1);

      // Enroll in DELE B2
      const result2 = userEnrollmentService.enrollUser($user.id, 'dele-b2');
      console.log('DELE B2 enrollment result:', result2);

      // Update progress for testing
      userEnrollmentService.updateProgress($user.id, 'dele-b1', {
        lessonsCompleted: 5,
        assessmentsTaken: 2
      });

      userEnrollmentService.updateProgress($user.id, 'dele-b2', {
        lessonsCompleted: 3,
        assessmentsTaken: 1
      });

      // Refresh the enrollment store
      enrollmentStore.refresh($user.id);
    }
  });

  $: debugInfo = {
    user: $user,
    enrollmentStore: $enrollmentStore,
    activeEnrollments: $activeEnrollments,
    enrollmentStats: $enrollmentStats,
    coursesStore: $coursesStore,
    userEnrollments: $user ? userEnrollmentService.getUserEnrollments($user.id) : [],
    userStats: $user ? userEnrollmentService.getUserStats($user.id) : null
  };

  function clearEnrollments() {
    userEnrollmentService.clearAllEnrollments();
    if ($user) {
      enrollmentStore.refresh($user.id);
    }
  }
</script>

<svelte:head>
  <title>Debug Enrollments</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold mb-4">Debug Enrollments</h1>

  <div class="mb-4">
    <button
      on:click={clearEnrollments}
      class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
    >
      Clear All Enrollments
    </button>
  </div>

  <div class="space-y-4">
    <div class="bg-gray-100 p-4 rounded">
      <h2 class="font-bold mb-2">Debug Information:</h2>
      <pre class="text-sm overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  </div>
</div>

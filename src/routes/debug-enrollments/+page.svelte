<script>
  import { onMount } from 'svelte';
  import { user, checkAuth } from '$modules/auth/stores';
  import { activeEnrollments, enrollmentStats } from '$lib/stores/enrollmentDB.js';

  onMount(async () => {
    await checkAuth();
  });

  let enrollmentData = [];
  let localStorageData = {};

  function loadDebugData() {
    // Load localStorage data
    localStorageData = {};
    const keys = ['userEnrollments', 'enrollmentStore', 'courseEnrollments', 'subjectEnrollments'];

    keys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          localStorageData[key] = JSON.parse(value);
        } catch (e) {
          localStorageData[key] = value;
        }
      }
    });

    // Check all localStorage keys for enrollment-related data
    Object.keys(localStorage).forEach((key) => {
      if (
        key.toLowerCase().includes('enrollment') ||
        key.toLowerCase().includes('course') ||
        key.toLowerCase().includes('subject')
      ) {
        if (!keys.includes(key)) {
          const value = localStorage.getItem(key);
          try {
            localStorageData[key] = JSON.parse(value);
          } catch (e) {
            localStorageData[key] = value;
          }
        }
      }
    });
  }

  function clearEnrollmentData() {
    const keys = Object.keys(localStorageData);
    keys.forEach((key) => {
      localStorage.removeItem(key);
    });

    localStorageData = {};
    alert('Enrollment data cleared! Please refresh the page.');
  }

  onMount(() => {
    loadDebugData();
  });

  $: if ($activeEnrollments) {
    enrollmentData = $activeEnrollments;
  }
</script>

<svelte:head>
  <title>Debug Enrollments - AI Tutor</title>
</svelte:head>

<div class="min-h-screen bg-stone-50 dark:bg-gray-900 p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-stone-900 dark:text-white mb-8">Debug Enrollments</h1>

    {#if $user}
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Current User</h2>
        <pre class="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">{JSON.stringify(
            $user,
            null,
            2
          )}</pre>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Active Enrollments ({enrollmentData.length})</h2>
        {#if enrollmentData.length > 0}
          <pre
            class="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">{JSON.stringify(
              enrollmentData,
              null,
              2
            )}</pre>
        {:else}
          <p class="text-gray-600 dark:text-gray-400">No active enrollments found</p>
        {/if}
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Enrollment Stats</h2>
        {#if $enrollmentStats}
          <pre
            class="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">{JSON.stringify(
              $enrollmentStats,
              null,
              2
            )}</pre>
        {:else}
          <p class="text-gray-600 dark:text-gray-400">No enrollment stats found</p>
        {/if}
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">LocalStorage Data</h2>
          <div class="space-x-2">
            <button
              on:click={loadDebugData}
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
            <button
              on:click={clearEnrollmentData}
              class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear All
            </button>
          </div>
        </div>

        {#if Object.keys(localStorageData).length > 0}
          {#each Object.entries(localStorageData) as [key, value]}
            <div class="mb-4">
              <h3 class="font-medium text-lg mb-2">{key}</h3>
              <pre
                class="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">{JSON.stringify(
                  value,
                  null,
                  2
                )}</pre>
            </div>
          {/each}
        {:else}
          <p class="text-gray-600 dark:text-gray-400">
            No enrollment-related data found in localStorage
          </p>
        {/if}
      </div>
    {:else}
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6">
        <p class="text-gray-600 dark:text-gray-400">
          Please log in to view enrollment debug information.
        </p>
      </div>
    {/if}
  </div>
</div>

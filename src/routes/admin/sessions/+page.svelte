<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/modules/auth/stores.js';
  import { isAdmin } from '$lib/modules/auth/utils/adminUtils.js';
  import AdminSessionManager from '$lib/modules/admin/components/AdminSessionManager.svelte';

  // Check admin access on mount
  onMount(() => {
    if (!$user || !isAdmin($user)) {
      goto('/login');
    }
  });

  $: hasAdminAccess = $user && isAdmin($user);
</script>

<svelte:head>
  <title>Admin - Session Management</title>
</svelte:head>

{#if hasAdminAccess}
  <div class="min-h-screen bg-gray-50 py-6">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Navigation breadcrumb -->
      <nav class="flex mb-6" aria-label="Breadcrumb">
        <ol class="flex items-center space-x-4">
          <li>
            <div>
              <a href="/admin" class="text-gray-400 hover:text-gray-500"> Admin </a>
            </div>
          </li>
          <li>
            <div class="flex items-center">
              <svg
                class="flex-shrink-0 h-5 w-5 text-gray-300"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
              </svg>
              <span class="ml-4 text-sm font-medium text-gray-500">Sessions</span>
            </div>
          </li>
        </ol>
      </nav>

      <!-- Main content -->
      <AdminSessionManager />
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="max-w-md w-full bg-white shadow rounded-lg p-6">
      <div class="text-center">
        <h2 class="text-lg font-medium text-gray-900">Access Denied</h2>
        <p class="mt-2 text-sm text-gray-600">You need admin privileges to access this page.</p>
        <div class="mt-4">
          <a
            href="/login"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Login
          </a>
        </div>
      </div>
    </div>
  </div>
{/if}

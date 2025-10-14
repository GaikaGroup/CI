<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/modules/auth/stores.js';
  import { isAdmin } from '$lib/modules/auth/utils/adminUtils.js';

  // Check admin access on mount
  onMount(() => {
    if (!$user || !isAdmin($user)) {
      goto('/login');
    }
  });

  $: hasAdminAccess = $user && isAdmin($user);

  const adminFeatures = [
    {
      title: 'Session Management',
      description: 'View and manage all user sessions, including hidden sessions. Restore deleted sessions.',
      href: '/admin/sessions',
      icon: '💬'
    },
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions.',
      href: '/admin/users',
      icon: '👥'
    },
    {
      title: 'System Statistics',
      description: 'View system-wide statistics and analytics.',
      href: '/admin/stats',
      icon: '📊'
    }
  ];
</script>

<svelte:head>
  <title>Admin Dashboard</title>
</svelte:head>

{#if hasAdminAccess}
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="md:flex md:items-center md:justify-between">
            <div class="flex-1 min-w-0">
              <h1 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Admin Dashboard
              </h1>
              <p class="mt-1 text-sm text-gray-500">
                Welcome back, {$user?.name || 'Admin'}. Manage your system from here.
              </p>
            </div>
            <div class="mt-4 flex md:mt-0 md:ml-4">
              <a
                href="/sessions"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to App
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Quick Stats -->
      <div class="mb-8">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Quick Overview</h2>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="text-2xl">👥</div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd class="text-lg font-medium text-gray-900">-</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="text-2xl">💬</div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Sessions</dt>
                    <dd class="text-lg font-medium text-gray-900">-</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="text-2xl">🗑️</div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Hidden Sessions</dt>
                    <dd class="text-lg font-medium text-gray-900">-</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="text-2xl">📈</div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Active Today</dt>
                    <dd class="text-lg font-medium text-gray-900">-</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Admin Features -->
      <div>
        <h2 class="text-lg font-medium text-gray-900 mb-4">Admin Features</h2>
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each adminFeatures as feature}
            <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div class="p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <div class="text-3xl">{feature.icon}</div>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <h3 class="text-lg font-medium text-gray-900">
                      {feature.title}
                    </h3>
                    <p class="mt-1 text-sm text-gray-500">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <div class="mt-4">
                  <a
                    href={feature.href}
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Access
                  </a>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="mt-8">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div class="bg-white shadow overflow-hidden sm:rounded-md">
          <div class="p-6 text-center text-gray-500">
            <p>Activity monitoring coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="max-w-md w-full bg-white shadow rounded-lg p-6">
      <div class="text-center">
        <h2 class="text-lg font-medium text-gray-900">Access Denied</h2>
        <p class="mt-2 text-sm text-gray-600">
          You need admin privileges to access this page.
        </p>
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
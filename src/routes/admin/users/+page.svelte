<script>
  import { onMount } from 'svelte';
  import { Search } from 'lucide-svelte';
  import { checkAuth } from '$modules/auth/stores';

  export let data;

  const users = data?.users ?? [];
  const statistics = data?.statistics ?? { totalUsers: 0, totalSessions: 0 };
  const error = data?.error;

  let searchQuery = '';

  // Filter users based on search query
  $: filteredUsers = searchQuery.trim()
    ? users.filter((user) => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : users;

  // Format date for display
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Initialize auth on mount
  onMount(async () => {
    await checkAuth();
  });

  // Format number with commas
  function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
  }
</script>

<svelte:head>
  <title>Admin • Users</title>
</svelte:head>

<main class="max-w-7xl mx-auto px-6 py-10 space-y-8">
  <header class="space-y-3">
    <p class="text-sm text-stone-500 dark:text-gray-400">Console</p>
    <h1 class="text-3xl font-bold text-stone-900 dark:text-white">Users</h1>
    <p class="text-stone-600 dark:text-gray-300 max-w-3xl">
      View and monitor user accounts in the system. Track user activity, sessions, and engagement.
    </p>
  </header>

  {#if error}
    <div
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-900/40 dark:text-red-200"
    >
      {error}
    </div>
  {/if}

  {#if data?.user}
    <p class="text-sm text-stone-500 dark:text-gray-400">
      Signed in as <span class="font-medium">{data.user.email}</span>
    </p>
  {/if}

  <!-- Statistics Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div
      class="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-sm p-6"
    >
      <p class="text-sm font-medium text-stone-500 dark:text-gray-400">Total Users</p>
      <p class="text-3xl font-bold text-stone-900 dark:text-white mt-2">
        {formatNumber(statistics.totalUsers)}
      </p>
    </div>
    <div
      class="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-sm p-6"
    >
      <p class="text-sm font-medium text-stone-500 dark:text-gray-400">Total Sessions</p>
      <p class="text-3xl font-bold text-stone-900 dark:text-white mt-2">
        {formatNumber(statistics.totalSessions)}
      </p>
    </div>
  </div>

  <!-- Users Table -->
  <section
    class="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden"
  >
    <div class="px-6 py-4 border-b border-stone-200 dark:border-gray-700">
      <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">User List</h2>
      <p class="text-sm text-stone-500 dark:text-gray-400 mt-1">
        All registered users and their activity statistics
      </p>
    </div>

    <!-- Search Bar -->
    <div class="px-6 py-4 border-b border-stone-200 dark:border-gray-700">
      <div class="relative">
        <Search
          class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-gray-500"
        />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search by name or email..."
          class="w-full pl-10 pr-4 py-2 border border-stone-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400"
        />
      </div>
    </div>

    {#if !error && users.length === 0}
      <p class="px-6 py-6 text-sm text-stone-500 dark:text-gray-400">No users found.</p>
    {:else if filteredUsers.length === 0}
      <p class="px-6 py-6 text-sm text-stone-500 dark:text-gray-400">
        No results found for "{searchQuery}"
      </p>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-stone-200 dark:divide-gray-700">
          <thead class="bg-stone-50 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                User
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Type & Roles
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Registration Date
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Sessions
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Messages
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-stone-200 dark:divide-gray-700">
            {#each filteredUsers as user (user.userId)}
              <tr class="hover:bg-stone-50 dark:hover:bg-gray-700/50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex flex-col">
                    <div class="text-sm font-medium text-stone-800 dark:text-gray-100">
                      {user.name || user.email}
                    </div>
                    <div class="text-xs text-stone-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex flex-col gap-1">
                    <!-- User Type Badge -->
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {user.type === 'admin'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200'}"
                    >
                      {user.type === 'admin' ? 'Admin' : 'Regular'}
                    </span>
                    <!-- User Roles -->
                    {#if user.roles && user.roles.length > 0}
                      <div class="flex gap-1 flex-wrap">
                        {#each user.roles as role}
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {role === 'Student'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                              : role === 'Tutor'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                              : 'bg-stone-100 text-stone-700 dark:bg-stone-900/40 dark:text-stone-200'}"
                          >
                            {role}
                          </span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-600 dark:text-gray-300">
                  {formatDate(user.registrationDate)}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-600 dark:text-gray-300"
                >
                  {formatNumber(user.sessionCount)}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-600 dark:text-gray-300"
                >
                  {formatNumber(user.messageCount)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</main>

<script>
  export let data;

  const models = data?.costs?.models ?? [];
  const costsError = data?.costsError;
</script>

<svelte:head>
  <title>Admin Finance</title>
</svelte:head>

<main class="max-w-6xl mx-auto px-6 py-10 space-y-8">
  <header>
    <h1 class="text-3xl font-bold text-stone-900 dark:text-white">Finance Overview</h1>
    <p class="mt-2 text-stone-600 dark:text-gray-300">
      Monitor usage costs across AI providers and track revenue performance.
    </p>
  </header>

  <section
    class="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden"
  >
    <div
      class="px-6 py-4 border-b border-stone-200 dark:border-gray-700 flex items-center justify-between"
    >
      <div>
        <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">Costs</h2>
        <p class="text-sm text-stone-500 dark:text-gray-400">
          Usage statistics per language model and how many calls are billable.
        </p>
      </div>
    </div>

    {#if costsError}
      <p class="px-6 py-6 text-sm text-red-600 dark:text-red-400">{costsError}</p>
    {:else if models.length === 0}
      <p class="px-6 py-6 text-sm text-stone-500 dark:text-gray-400">No data yet.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-stone-200 dark:divide-gray-700">
          <thead class="bg-stone-50 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Model
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Total Requests
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Paid Requests
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-stone-200 dark:divide-gray-700">
            {#each models as modelEntry (modelEntry.model)}
              <tr>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-800 dark:text-gray-100"
                >
                  {modelEntry.model}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-600 dark:text-gray-300">
                  {modelEntry.total}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-600 dark:text-gray-300">
                  {modelEntry.paid}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section
    class="bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-sm"
  >
    <div class="px-6 py-4 border-b border-stone-200 dark:border-gray-700">
      <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">Revenues</h2>
      <p class="text-sm text-stone-500 dark:text-gray-400">
        Revenue tracking and projections will appear here soon.
      </p>
    </div>
    <div class="px-6 py-6 text-sm text-stone-500 dark:text-gray-400">
      Revenue analytics are not yet available. Integrate billing data sources to populate this
      section.
    </div>
  </section>
</main>

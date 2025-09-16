<script>
  export let data;

  const models = data?.costs?.models ?? [];
  const costsError = data?.costsError;
  const totals = data?.costs?.totals ?? {
    totalRequests: 0,
    paidRequests: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    totalCost: 0
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 6,
    maximumFractionDigits: 8
  });
  const tokenFormatter = new Intl.NumberFormat('en-US');

  const sanitizeNumber = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const formatCurrency = (value) => currencyFormatter.format(sanitizeNumber(value));
  const formatTokens = (value) => tokenFormatter.format(Math.round(sanitizeNumber(value)));

  $: hasTotalsCost = typeof totals?.totalCost === 'number' && Number.isFinite(totals.totalCost);
  $: computedTotalCost = hasTotalsCost
    ? totals.totalCost
    : Number(models.reduce((sum, entry) => sum + sanitizeNumber(entry.totalCost), 0).toFixed(8));
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
          Usage statistics per language model, token consumption, and how many calls are billable.
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
              <th
                scope="col"
                class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Prompt Tokens
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Completion Tokens
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-gray-400"
              >
                Total Cost (USD)
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-stone-200 dark:divide-gray-700">
            {#each models as modelEntry (`${modelEntry.provider}::${modelEntry.model}`)}
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
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-600 dark:text-gray-300"
                >
                  {formatTokens(modelEntry.promptTokens)}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-600 dark:text-gray-300"
                >
                  {formatTokens(modelEntry.completionTokens)}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-right text-stone-600 dark:text-gray-300"
                >
                  {formatCurrency(modelEntry.totalCost)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="px-6 py-4 border-t border-stone-200 dark:border-gray-700 flex justify-end">
        <span class="text-sm font-semibold text-stone-700 dark:text-gray-200">
          Total cost: {formatCurrency(computedTotalCost)}
        </span>
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

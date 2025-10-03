<script>
  import { createEventDispatcher } from 'svelte';
  import Button from '$shared/components/Button.svelte';
  import { Bot, Sparkles, RefreshCw, X, AlertTriangle } from 'lucide-svelte';

  export let open = false;
  export let courseName = '';
  export let languageHint = '';
  export let levelHint = '';
  export let prefetchedAgents = [];
  export let allowOpenAI = true;

  const dispatch = createEventDispatcher();

  let form = {
    roleFocus: '',
    interactionStyle: '',
    additionalNotes: ''
  };
  let loading = false;
  let error = null;
  let usage = null;
  let agentSuggestions = [];
  let confirmMultiple = false;
  let seededFromPrefetch = false;
  let lastPrefetchedReference = null;

  $: if (prefetchedAgents !== lastPrefetchedReference) {
    lastPrefetchedReference = prefetchedAgents;
    if (Array.isArray(prefetchedAgents) && prefetchedAgents.length > 0) {
      seedSuggestionsFrom(prefetchedAgents);
      seededFromPrefetch = true;
    } else if (seededFromPrefetch && !loading) {
      agentSuggestions = [];
      seededFromPrefetch = false;
    }
  }

  $: if (!open) {
    loading = false;
    error = null;
    usage = null;
    confirmMultiple = false;
  }

  function seedSuggestionsFrom(agents) {
    agentSuggestions = agents.map((agent) => ({
      ...agent,
      selected: true
    }));
    usage = null;
    confirmMultiple = false;
  }

  function close() {
    dispatch('close');
  }

  function buildPayload() {
    const topic = (courseName || form.roleFocus || '').trim();
    if (!topic) {
      return { error: 'Provide a course name or role focus so AI can generate agents.' };
    }

    const contextParts = [];
    if (form.roleFocus?.trim()) {
      contextParts.push(`Role focus: ${form.roleFocus.trim()}`);
    }
    if (form.interactionStyle?.trim()) {
      contextParts.push(`Interaction style: ${form.interactionStyle.trim()}`);
    }
    if (form.additionalNotes?.trim()) {
      contextParts.push(form.additionalNotes.trim());
    }

    return {
      payload: {
        topic,
        audience: '',
        languageHint: languageHint?.trim() || '',
        levelHint: levelHint?.trim() || '',
        notes: contextParts.join('\n'),
        agentContext: contextParts.join('\n'),
        allowOpenAI
      }
    };
  }

  async function requestAgents() {
    const { payload, error: payloadError } = buildPayload();
    if (payloadError) {
      error = payloadError;
      return;
    }

    loading = true;
    error = null;
    confirmMultiple = false;

    try {
      const response = await fetch('/api/courses/ai-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const details = await safeParse(response);
        throw new Error(
          details?.message || details?.error || 'Failed to generate agent blueprints'
        );
      }

      const data = await response.json();
      const agents = Array.isArray(data.agents) ? data.agents : [];
      if (agents.length === 0) {
        error = 'The AI did not return any agent suggestions. Adjust the guidance and try again.';
        agentSuggestions = [];
        usage = data.usage || null;
        dispatch('error', { message: error });
        return;
      }

      agentSuggestions = agents.map((agent) => ({
        ...agent,
        selected: true
      }));
      usage = data.usage || null;
      seededFromPrefetch = false;
      dispatch('generated', { usage });
    } catch (err) {
      console.error('Agent blueprint generation failed', err);
      error = err.message || 'Unable to generate agent blueprints. Please try again.';
      dispatch('error', { message: error });
    } finally {
      loading = false;
    }
  }

  async function safeParse(response) {
    try {
      return await response.json();
    } catch (err) {
      return null;
    }
  }

  function toggleAgentSelection(index) {
    agentSuggestions = agentSuggestions.map((entry, idx) =>
      idx === index ? { ...entry, selected: !entry.selected } : entry
    );
    if (confirmMultiple) {
      confirmMultiple = false;
    }
  }

  function applyAgents() {
    const selected = agentSuggestions
      .filter((agent) => agent.selected)
      .map((agent) => {
        const rest = { ...agent };
        delete rest.selected;
        return rest;
      });

    if (selected.length === 0) {
      error = 'Select at least one agent to continue.';
      return;
    }

    if (selected.length > 1 && !confirmMultiple) {
      confirmMultiple = true;
      return;
    }

    confirmMultiple = false;
    dispatch('apply', { agents: selected, usage });
    close();
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div
      class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-gray-700"
      >
        <div class="flex items-center gap-3">
          <div
            class="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200"
          >
            <Sparkles class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-stone-900 dark:text-white">
              AI Agent Blueprints
            </h2>
            <p class="text-sm text-stone-500 dark:text-gray-300">
              Describe the agents you need and let AI propose ready-to-edit blueprints.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" on:click={close}>
          <X class="w-4 h-4" />
        </Button>
      </div>

      <div class="p-6 space-y-6">
        <section class="space-y-4">
          <h3 class="text-base font-semibold text-stone-900 dark:text-white">Guidance</h3>
          <div class="space-y-4">
            <div>
              <label
                for="agent-role-focus"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Agent role focus
              </label>
              <input
                id="agent-role-focus"
                type="text"
                bind:value={form.roleFocus}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Conversation coach for Spanish support calls"
              />
            </div>
            <div>
              <label
                for="agent-interaction-style"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Preferred interaction style
              </label>
              <input
                id="agent-interaction-style"
                type="text"
                bind:value={form.interactionStyle}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Empathetic, structured feedback"
              />
            </div>
            <div>
              <label
                for="agent-additional-notes"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Additional notes
              </label>
              <textarea
                id="agent-additional-notes"
                rows="3"
                bind:value={form.additionalNotes}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Mention data sources, tone guidelines, or sequencing preferences"
              ></textarea>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <div>
              {#if error}
                <p class="text-sm text-red-600 dark:text-red-300">{error}</p>
              {:else if usage}
                <p class="text-xs text-stone-500 dark:text-gray-400">
                  Model: {usage.model} · Tokens: {usage.totalTokens}
                </p>
              {/if}
            </div>
            <div class="flex items-center gap-3">
              {#if agentSuggestions.length > 0}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  on:click={requestAgents}
                >
                  <RefreshCw class="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              {/if}
              <Button type="button" size="sm" disabled={loading} on:click={requestAgents}>
                {#if loading}
                  Generating...
                {:else}
                  Generate agents
                {/if}
              </Button>
            </div>
          </div>
        </section>

        {#if agentSuggestions.length > 0}
          <section class="space-y-4">
            <h3 class="text-base font-semibold text-stone-900 dark:text-white">Suggested agents</h3>
            <div class="space-y-3">
              {#each agentSuggestions as agent, index}
                <div class="border border-stone-200 dark:border-gray-700 rounded-xl p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 space-y-2">
                      <div class="flex items-center gap-2">
                        <Bot class="w-4 h-4 text-amber-600 dark:text-amber-300" />
                        <h4 class="font-semibold text-stone-900 dark:text-white">{agent.name}</h4>
                      </div>
                      <p class="text-sm text-stone-600 dark:text-gray-300">{agent.description}</p>
                      <p class="text-xs text-stone-500 dark:text-gray-400">
                        <strong>Instructions:</strong>
                        {agent.instructions}
                      </p>
                      <p class="text-xs text-stone-500 dark:text-gray-400">
                        <strong>System prompt:</strong>
                        {agent.systemPrompt}
                      </p>
                    </div>
                    <label
                      class="flex items-center gap-2 text-sm text-stone-700 dark:text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={agent.selected}
                        on:change={() => toggleAgentSelection(index)}
                      />
                      Include
                    </label>
                  </div>
                </div>
              {/each}
            </div>

            {#if confirmMultiple}
              <div
                class="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 flex items-start gap-3"
              >
                <AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-300 mt-1" />
                <div class="text-sm text-amber-800 dark:text-amber-100">
                  <p class="font-semibold mb-1">Confirm multiple agents</p>
                  <p>
                    You are about to add {agentSuggestions.filter((agent) => agent.selected).length}
                    agents. Confirm to apply them all.
                  </p>
                </div>
              </div>
            {/if}
          </section>
        {:else}
          <div
            class="border border-dashed border-stone-300 dark:border-gray-600 rounded-xl p-6 text-center text-sm text-stone-500 dark:text-gray-400"
          >
            Provide guidance and generate to see AI-suggested agents.
          </div>
        {/if}

        <div class="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-gray-700">
          <Button type="button" variant="secondary" on:click={close}>Cancel</Button>
          <Button
            type="button"
            on:click={applyAgents}
            disabled={loading || agentSuggestions.length === 0}
          >
            Apply selected
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

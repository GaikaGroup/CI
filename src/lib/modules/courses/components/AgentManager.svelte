<script>
  import { createEventDispatcher } from 'svelte';
  import Button from '$shared/components/Button.svelte';
  import { AGENT_TYPES } from '$modules/courses/agents.js';
  import { Plus, Edit, Trash2, Save, X, Bot } from 'lucide-svelte';

  export let agents = [];
  export let orchestrationAgent = null;

  const dispatch = createEventDispatcher();

  // Agent editing state
  let editingAgent = null;
  let showAddForm = false;
  let agentForm = {
    name: '',
    description: '',
    instructions: '',
    systemPrompt: '',
    ragEnabled: true,
    communicationStyle: {
      tone: 'professional',
      formality: 'adaptive',
      responseLength: 'adaptive'
    }
  };

  // Orchestration agent editing
  let editingOrchestration = false;
  let orchestrationForm = {
    name: 'Orchestration',
    description: '',
    pipelineDescription: '',
    agentCoordination: {
      workflow: '',
      communication: '',
      behavior: ''
    },
    routingRules: {
      messageTypes: {},
      fallbackAgent: '',
      escalationRules: ''
    }
  };

  // Form validation
  let errors = {};

  // Initialize orchestration form when orchestration agent changes
  $: if (orchestrationAgent) {
    orchestrationForm = {
      name: orchestrationAgent.name || 'Orchestration',
      description: orchestrationAgent.description || '',
      pipelineDescription: orchestrationAgent.pipelineDescription || '',
      agentCoordination: {
        workflow: orchestrationAgent.agentCoordination?.workflow || '',
        communication: orchestrationAgent.agentCoordination?.communication || '',
        behavior: orchestrationAgent.agentCoordination?.behavior || ''
      },
      routingRules: {
        messageTypes: orchestrationAgent.routingRules?.messageTypes || {},
        fallbackAgent: orchestrationAgent.routingRules?.fallbackAgent || '',
        escalationRules: orchestrationAgent.routingRules?.escalationRules || ''
      }
    };
  }

  function resetAgentForm() {
    agentForm = {
      name: '',
      description: '',
      instructions: '',
      systemPrompt: '',
      ragEnabled: true,
      communicationStyle: {
        tone: 'professional',
        formality: 'adaptive',
        responseLength: 'adaptive'
      }
    };
    errors = {};
  }

  function validateAgentForm() {
    errors = {};

    if (!agentForm.name.trim()) {
      errors.name = 'Agent name is required';
    }

    if (!agentForm.description.trim()) {
      errors.description = 'Agent description is required';
    }

    if (!agentForm.instructions.trim()) {
      errors.instructions = 'Agent instructions are required';
    }

    if (!agentForm.systemPrompt.trim()) {
      errors.systemPrompt = 'System prompt is required';
    }

    return Object.keys(errors).length === 0;
  }

  function startAddAgent() {
    resetAgentForm();
    showAddForm = true;
    editingAgent = null;
  }

  function startEditAgent(agent) {
    agentForm = {
      name: agent.name,
      description: agent.description,
      instructions: agent.instructions || '',
      systemPrompt: agent.systemPrompt || '',
      ragEnabled: agent.ragEnabled ?? true,
      communicationStyle: {
        tone: agent.communicationStyle?.tone || 'professional',
        formality: agent.communicationStyle?.formality || 'adaptive',
        responseLength: agent.communicationStyle?.responseLength || 'adaptive'
      }
    };
    editingAgent = agent;
    showAddForm = true;
    errors = {};
  }

  function cancelAgentEdit() {
    showAddForm = false;
    editingAgent = null;
    resetAgentForm();
  }

  function saveAgent() {
    if (!validateAgentForm()) {
      return;
    }

    const agentData = {
      id: editingAgent?.id || crypto.randomUUID(),
      name: agentForm.name.trim(),
      description: agentForm.description.trim(),
      instructions: agentForm.instructions.trim(),
      systemPrompt: agentForm.systemPrompt.trim(),
      type:
        editingAgent?.type === AGENT_TYPES.ORCHESTRATION
          ? AGENT_TYPES.ORCHESTRATION
          : AGENT_TYPES.COURSE,
      ragEnabled: agentForm.ragEnabled,
      communicationStyle: { ...agentForm.communicationStyle },
      configuration: {},
      createdAt: editingAgent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingAgent) {
      dispatch('update-agent', { agent: agentData });
    } else {
      dispatch('add-agent', { agent: agentData });
    }

    cancelAgentEdit();
  }

  function deleteAgent(agent) {
    if (confirm(`Are you sure you want to delete the "${agent.name}" agent?`)) {
      dispatch('delete-agent', { agentId: agent.id });
    }
  }

  function startEditOrchestration() {
    editingOrchestration = true;
  }

  function cancelOrchestrationEdit() {
    editingOrchestration = false;
    // Reset form to current orchestration agent data
    if (orchestrationAgent) {
      orchestrationForm = {
        name: orchestrationAgent.name || 'Orchestration',
        description: orchestrationAgent.description || '',
        pipelineDescription: orchestrationAgent.pipelineDescription || '',
        agentCoordination: {
          workflow: orchestrationAgent.agentCoordination?.workflow || '',
          communication: orchestrationAgent.agentCoordination?.communication || '',
          behavior: orchestrationAgent.agentCoordination?.behavior || ''
        },
        routingRules: {
          messageTypes: orchestrationAgent.routingRules?.messageTypes || {},
          fallbackAgent: orchestrationAgent.routingRules?.fallbackAgent || '',
          escalationRules: orchestrationAgent.routingRules?.escalationRules || ''
        }
      };
    }
  }

  function saveOrchestration() {
    const orchestrationData = {
      id: orchestrationAgent?.id || crypto.randomUUID(),
      name: orchestrationForm.name,
      description: orchestrationForm.description,
      type: 'orchestration',
      instructions: 'Orchestrate communication between multiple agents',
      systemPrompt:
        'You are an orchestration agent responsible for coordinating multiple specialized agents.',
      pipelineDescription: orchestrationForm.pipelineDescription,
      agentCoordination: { ...orchestrationForm.agentCoordination },
      routingRules: { ...orchestrationForm.routingRules },
      ragEnabled: true,
      communicationStyle: {
        tone: 'professional',
        formality: 'adaptive',
        responseLength: 'adaptive'
      },
      configuration: {},
      createdAt: orchestrationAgent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dispatch('update-orchestration', { orchestrationAgent: orchestrationData });
    editingOrchestration = false;
  }

  // Check if orchestration is needed
  $: needsOrchestration = agents.length >= 2;
  $: showOrchestrationSection = needsOrchestration || orchestrationAgent;
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-xl font-semibold text-stone-900 dark:text-white">Agent Management</h2>
      <p class="text-sm text-stone-600 dark:text-gray-300 mt-1">
        Configure AI agents that will interact with students
      </p>
    </div>
    <Button on:click={startAddAgent}>
      <Plus class="w-4 h-4 mr-2" />
      Add Agent
    </Button>
  </div>

  <!-- Agent List -->
  <div class="space-y-4 mb-6">
    {#if agents.length === 0}
      <div
        class="text-center py-8 border-2 border-dashed border-stone-300 dark:border-gray-600 rounded-lg"
      >
        <Bot class="w-12 h-12 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
        <p class="text-stone-500 dark:text-gray-400 mb-2">No agents configured yet</p>
        <p class="text-sm text-stone-400 dark:text-gray-500">Add your first agent to get started</p>
      </div>
    {:else}
      {#each agents as agent}
        <div class="border border-stone-200 dark:border-gray-700 rounded-lg p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <Bot class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 class="font-semibold text-stone-900 dark:text-white">{agent.name}</h3>
                {#if agent.ragEnabled}
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    RAG Enabled
                  </span>
                {/if}
              </div>
              <p class="text-sm text-stone-600 dark:text-gray-300 mb-2">{agent.description}</p>
              {#if agent.instructions}
                <p class="text-xs text-stone-500 dark:text-gray-400 mb-2">
                  <strong>Instructions:</strong>
                  {agent.instructions.substring(0, 100)}{agent.instructions.length > 100
                    ? '...'
                    : ''}
                </p>
              {/if}
              <div class="flex items-center gap-4 text-xs text-stone-500 dark:text-gray-400">
                <span>Tone: {agent.communicationStyle?.tone || 'professional'}</span>
                <span>Formality: {agent.communicationStyle?.formality || 'adaptive'}</span>
                <span>Length: {agent.communicationStyle?.responseLength || 'adaptive'}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 ml-4">
              <Button variant="secondary" size="sm" on:click={() => startEditAgent(agent)}>
                <Edit class="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="sm" on:click={() => deleteAgent(agent)}>
                <Trash2 class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Orchestration Agent Section -->
  {#if showOrchestrationSection}
    <div class="border-t border-stone-200 dark:border-gray-700 pt-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-stone-900 dark:text-white">Orchestration Agent</h3>
          <p class="text-sm text-stone-600 dark:text-gray-300">
            {needsOrchestration
              ? 'Automatically created for multi-agent coordination'
              : 'No longer needed (less than 2 agents)'}
          </p>
        </div>
        {#if orchestrationAgent}
          <Button variant="secondary" on:click={startEditOrchestration}>
            <Edit class="w-4 h-4 mr-2" />
            Configure
          </Button>
        {/if}
      </div>

      {#if orchestrationAgent}
        <div
          class="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4"
        >
          <div class="flex items-center gap-2 mb-2">
            <Bot class="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h4 class="font-semibold text-amber-900 dark:text-amber-100">
              {orchestrationAgent.name}
            </h4>
          </div>
          <p class="text-sm text-amber-800 dark:text-amber-200 mb-2">
            {orchestrationAgent.description}
          </p>
          {#if orchestrationAgent.pipelineDescription}
            <p class="text-xs text-amber-700 dark:text-amber-300">
              <strong>Pipeline:</strong>
              {orchestrationAgent.pipelineDescription.substring(0, 100)}{orchestrationAgent
                .pipelineDescription.length > 100
                ? '...'
                : ''}
            </p>
          {/if}
        </div>
      {:else if needsOrchestration}
        <div
          class="border border-stone-200 dark:border-gray-700 rounded-lg p-4 bg-stone-50 dark:bg-gray-700/50"
        >
          <p class="text-sm text-stone-600 dark:text-gray-300">
            An orchestration agent will be automatically created when you save this subject.
          </p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Agent Form Modal -->
  {#if showAddForm}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        class="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-white">
            {editingAgent ? 'Edit Agent' : 'Add New Agent'}
          </h3>
          <Button variant="secondary" size="sm" on:click={cancelAgentEdit}>
            <X class="w-4 h-4" />
          </Button>
        </div>

        <form on:submit|preventDefault={saveAgent} class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="agentName"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Agent Name *
              </label>
              <input
                id="agentName"
                type="text"
                bind:value={agentForm.name}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
                class:border-red-500={errors.name}
                placeholder="e.g., Grammar Tutor"
              />
              {#if errors.name}
                <p class="text-red-500 text-sm mt-1">{errors.name}</p>
              {/if}
            </div>

            <div>
              <span class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2">
                RAG Enabled
              </span>
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={agentForm.ragEnabled}
                  class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span class="ml-2 text-sm text-stone-700 dark:text-gray-300"
                  >Use uploaded materials</span
                >
              </label>
            </div>
          </div>

          <div>
            <label
              for="agentDescription"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Description *
            </label>
            <textarea
              id="agentDescription"
              bind:value={agentForm.description}
              rows="2"
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              class:border-red-500={errors.description}
              placeholder="Brief description of what this agent does"
            ></textarea>
            {#if errors.description}
              <p class="text-red-500 text-sm mt-1">{errors.description}</p>
            {/if}
          </div>

          <div>
            <label
              for="agentInstructions"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Instructions *
            </label>
            <textarea
              id="agentInstructions"
              bind:value={agentForm.instructions}
              rows="3"
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              class:border-red-500={errors.instructions}
              placeholder="Detailed instructions for how this agent should behave and respond"
            ></textarea>
            {#if errors.instructions}
              <p class="text-red-500 text-sm mt-1">{errors.instructions}</p>
            {/if}
          </div>

          <div>
            <label
              for="agentSystemPrompt"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              System Prompt *
            </label>
            <textarea
              id="agentSystemPrompt"
              bind:value={agentForm.systemPrompt}
              rows="3"
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              class:border-red-500={errors.systemPrompt}
              placeholder="System prompt that defines the agent's role and behavior for the LLM"
            ></textarea>
            {#if errors.systemPrompt}
              <p class="text-red-500 text-sm mt-1">{errors.systemPrompt}</p>
            {/if}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                for="agentTone"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Tone
              </label>
              <select
                id="agentTone"
                bind:value={agentForm.communicationStyle.tone}
                class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="encouraging">Encouraging</option>
                <option value="strict">Strict</option>
              </select>
            </div>

            <div>
              <label
                for="agentFormality"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Formality
              </label>
              <select
                id="agentFormality"
                bind:value={agentForm.communicationStyle.formality}
                class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              >
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
                <option value="adaptive">Adaptive</option>
              </select>
            </div>

            <div>
              <label
                for="agentResponseLength"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Response Length
              </label>
              <select
                id="agentResponseLength"
                bind:value={agentForm.communicationStyle.responseLength}
                class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              >
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
                <option value="adaptive">Adaptive</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" on:click={cancelAgentEdit}>Cancel</Button>
            <Button type="submit">
              <Save class="w-4 h-4 mr-2" />
              {editingAgent ? 'Update Agent' : 'Add Agent'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Orchestration Edit Modal -->
  {#if editingOrchestration}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        class="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-white">
            Configure Orchestration Agent
          </h3>
          <Button variant="secondary" size="sm" on:click={cancelOrchestrationEdit}>
            <X class="w-4 h-4" />
          </Button>
        </div>

        <form on:submit|preventDefault={saveOrchestration} class="space-y-4">
          <div>
            <label
              for="orchestrationDescription"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Description
            </label>
            <textarea
              id="orchestrationDescription"
              bind:value={orchestrationForm.description}
              rows="2"
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              placeholder="Description of the orchestration agent's role"
            ></textarea>
          </div>

          <div>
            <label
              for="pipelineDescription"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Pipeline Description
            </label>
            <textarea
              id="pipelineDescription"
              bind:value={orchestrationForm.pipelineDescription}
              rows="3"
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              placeholder="Describe how agents work together and the overall pipeline"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                for="workflow"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Workflow
              </label>
              <textarea
                id="workflow"
                bind:value={orchestrationForm.agentCoordination.workflow}
                rows="3"
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
                placeholder="Agent selection and routing logic"
              ></textarea>
            </div>

            <div>
              <label
                for="communication"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Communication
              </label>
              <textarea
                id="communication"
                bind:value={orchestrationForm.agentCoordination.communication}
                rows="3"
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
                placeholder="How agents communicate with each other"
              ></textarea>
            </div>

            <div>
              <label
                for="behavior"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Behavior
              </label>
              <textarea
                id="behavior"
                bind:value={orchestrationForm.agentCoordination.behavior}
                rows="3"
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
                placeholder="Overall system behavior"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" on:click={cancelOrchestrationEdit}>
              Cancel
            </Button>
            <Button type="submit">
              <Save class="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

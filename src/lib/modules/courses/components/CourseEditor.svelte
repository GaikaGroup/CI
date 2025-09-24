<script>
  import { createEventDispatcher } from 'svelte';
  import { user } from '$modules/auth/stores';
  import Button from '$shared/components/Button.svelte';
  import { validateCourse, createDefaultCourse } from '../types.js';
  import {
    validateAgentConfiguration,
    AGENT_TYPES,
    createOrchestrationInstructions
  } from '../agents.js';

  export let course = null;
  export let isEditing = false;

  const dispatch = createEventDispatcher();

  // Form state
  let formData = course
    ? { ...course }
    : createDefaultCourse({
        creatorId: $user?.id,
        creatorRole: $user?.role || 'user'
      });

  let validationErrors = [];
  let isSubmitting = false;
  let activeTab = 'basic';

  // Agent management
  let showAgentModal = false;
  let editingAgent = null;
  let agentForm = {
    name: '',
    type: AGENT_TYPES.COURSE,
    instructions: ''
  };

  // Material management
  let showMaterialModal = false;
  let materialFiles = [];
  let materialAssignment = {
    allAgents: true,
    specificAgents: []
  };

  // Removed unused variable canAddOrchestrationAgent
  $: needsOrchestrationAgent =
    formData.agents?.filter((a) => a.type === AGENT_TYPES.COURSE).length > 1;

  const handleSubmit = async () => {
    isSubmitting = true;
    validationErrors = [];

    try {
      // Validate form data
      const validation = validateCourse(formData);
      if (!validation.isValid) {
        validationErrors = validation.errors;
        return;
      }

      // Validate agent configuration
      const agentValidation = validateAgentConfiguration(
        formData.agents,
        formData.orchestrationAgent
      );
      if (!agentValidation.isValid) {
        validationErrors = [...validationErrors, ...agentValidation.errors];
        return;
      }

      // Dispatch save event
      dispatch('save', {
        course: formData,
        isEditing
      });
    } catch (error) {
      validationErrors = [error.message];
    } finally {
      isSubmitting = false;
    }
  };

  const handleCancel = () => {
    dispatch('cancel');
  };

  const addAgent = () => {
    agentForm = {
      name: '',
      type: AGENT_TYPES.COURSE,
      instructions: ''
    };
    editingAgent = null;
    showAgentModal = true;
  };

  const editAgent = (agent, index) => {
    agentForm = { ...agent };
    editingAgent = index;
    showAgentModal = true;
  };

  const saveAgent = () => {
    if (!agentForm.name || !agentForm.instructions) {
      return;
    }

    const newAgent = {
      id: agentForm.id || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...agentForm,
      courseId: formData.id,
      assignedMaterials: agentForm.assignedMaterials || [],
      configuration: agentForm.configuration || {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000
      },
      metadata: {
        createdAt: agentForm.metadata?.createdAt || new Date(),
        updatedAt: new Date()
      }
    };

    if (editingAgent !== null) {
      formData.agents[editingAgent] = newAgent;
    } else {
      formData.agents = [...(formData.agents || []), newAgent];
    }

    formData = { ...formData };
    closeAgentModal();
  };

  const removeAgent = (index) => {
    formData.agents = formData.agents.filter((_, i) => i !== index);
    formData = { ...formData };
  };

  const addOrchestrationAgent = () => {
    const courseAgents = formData.agents?.filter((a) => a.type === AGENT_TYPES.COURSE) || [];
    const instructions = createOrchestrationInstructions(courseAgents);

    formData.orchestrationAgent = {
      id: `orchestration_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: `${formData.name} Orchestrator`,
      type: AGENT_TYPES.ORCHESTRATION,
      instructions,
      courseId: formData.id,
      assignedMaterials: [],
      configuration: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    formData = { ...formData };
  };

  const removeOrchestrationAgent = () => {
    formData.orchestrationAgent = null;
    formData = { ...formData };
  };

  const closeAgentModal = () => {
    showAgentModal = false;
    editingAgent = null;
    agentForm = {
      name: '',
      type: AGENT_TYPES.COURSE,
      instructions: ''
    };
  };

  const handleMaterialUpload = () => {
    showMaterialModal = true;
  };

  const saveMaterials = () => {
    // This would integrate with MaterialService in a real implementation
    // For now, we'll just simulate adding materials
    const newMaterials = Array.from(materialFiles).map((file) => ({
      id: `material_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fileName: file.name,
      fileType: file.type,
      courseId: formData.id,
      uploaderId: $user?.id,
      content: '',
      assignments: { ...materialAssignment },
      status: 'processing',
      metadata: {
        uploadedAt: new Date(),
        fileSize: file.size
      }
    }));

    formData.materials = [...(formData.materials || []), ...newMaterials];
    formData = { ...formData };
    closeMaterialModal();
  };

  const removeMaterial = (index) => {
    formData.materials = formData.materials.filter((_, i) => i !== index);
    formData = { ...formData };
  };

  const closeMaterialModal = () => {
    showMaterialModal = false;
    materialFiles = [];
    materialAssignment = {
      allAgents: true,
      specificAgents: []
    };
  };

  const addSkill = () => {
    const skillInput = document.getElementById('new-skill');
    const skill = skillInput.value.trim();
    if (skill && !formData.skills.includes(skill)) {
      formData.skills = [...formData.skills, skill];
      skillInput.value = '';
      formData = { ...formData };
    }
  };

  const removeSkill = (index) => {
    formData.skills = formData.skills.filter((_, i) => i !== index);
    formData = { ...formData };
  };
</script>

<div class="max-w-4xl mx-auto space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-stone-900 dark:text-white">
      {isEditing ? 'Edit Course' : 'Create New Course'}
    </h1>

    <div class="flex gap-3">
      <Button variant="secondary" on:click={handleCancel}>Cancel</Button>
      <Button variant="primary" on:click={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
      </Button>
    </div>
  </div>

  <!-- Validation Errors -->
  {#if validationErrors.length > 0}
    <div
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <h3 class="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
        Please fix the following errors:
      </h3>
      <ul class="text-sm text-red-700 dark:text-red-300 space-y-1">
        {#each validationErrors as error}
          <li>• {error}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Tabs -->
  <div class="border-b border-stone-200 dark:border-gray-700">
    <nav class="-mb-px flex space-x-8">
      <button
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'basic'
          ? 'border-amber-500 text-amber-600 dark:text-amber-400'
          : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        on:click={() => (activeTab = 'basic')}
      >
        Basic Info
      </button>
      <button
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'agents'
          ? 'border-amber-500 text-amber-600 dark:text-amber-400'
          : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        on:click={() => (activeTab = 'agents')}
      >
        AI Agents ({(formData.agents?.length || 0) + (formData.orchestrationAgent ? 1 : 0)})
      </button>
      <button
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'materials'
          ? 'border-amber-500 text-amber-600 dark:text-amber-400'
          : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        on:click={() => (activeTab = 'materials')}
      >
        Materials ({formData.materials?.length || 0})
      </button>
      <button
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'settings'
          ? 'border-amber-500 text-amber-600 dark:text-amber-400'
          : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-gray-400 dark:hover:text-gray-300'}"
        on:click={() => (activeTab = 'settings')}
      >
        Settings
      </button>
    </nav>
  </div>

  <!-- Tab Content -->
  <div
    class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
  >
    {#if activeTab === 'basic'}
      <!-- Basic Information -->
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              for="course-name"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Course Name *
            </label>
            <input
              id="course-name"
              type="text"
              bind:value={formData.name}
              placeholder="Enter course name..."
              class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label
              for="course-language"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Language
            </label>
            <input
              id="course-language"
              type="text"
              bind:value={formData.language}
              placeholder="e.g., Spanish, English..."
              class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
            />
          </div>
        </div>

        <div>
          <label
            for="course-description"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Description *
          </label>
          <textarea
            id="course-description"
            bind:value={formData.description}
            placeholder="Describe what this course covers and what learners will gain..."
            rows="4"
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
            required
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              for="course-level"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Level
            </label>
            <input
              id="course-level"
              type="text"
              bind:value={formData.level}
              placeholder="e.g., Beginner, B1, Advanced..."
              class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
            />
          </div>

          <div>
            <label
              for="new-skill"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Skills
            </label>
            <div class="flex gap-2">
              <input
                id="new-skill"
                type="text"
                placeholder="Add a skill..."
                class="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
                on:keypress={(e) => e.key === 'Enter' && addSkill()}
              />
              <Button variant="secondary" on:click={addSkill}>Add</Button>
            </div>

            {#if formData.skills?.length}
              <div class="flex flex-wrap gap-2 mt-2">
                {#each formData.skills as skill, index}
                  <span
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  >
                    {skill}
                    <button
                      on:click={() => removeSkill(index)}
                      class="text-amber-600 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-100"
                    >
                      ×
                    </button>
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {:else if activeTab === 'agents'}
      <!-- AI Agents -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-white">AI Agents</h3>
          <Button on:click={addAgent}>Add Agent</Button>
        </div>

        {#if needsOrchestrationAgent && !formData.orchestrationAgent}
          <div
            class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Orchestration Agent Required
                </h4>
                <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Courses with multiple agents need an orchestration agent to coordinate responses.
                </p>
              </div>
              <Button variant="secondary" on:click={addOrchestrationAgent}>
                Add Orchestration Agent
              </Button>
            </div>
          </div>
        {/if}

        <!-- Course Agents -->
        {#if formData.agents?.length}
          <div class="space-y-4">
            <h4 class="font-medium text-stone-900 dark:text-white">Specialist Agents</h4>
            {#each formData.agents as agent, index}
              <div class="border border-stone-200 dark:border-gray-600 rounded-lg p-4">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h5 class="font-medium text-stone-900 dark:text-white">
                      {agent.name}
                    </h5>
                    <p class="text-sm text-stone-600 dark:text-gray-300 mt-1">
                      {agent.instructions.substring(0, 100)}...
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      on:click={() => editAgent(agent, index)}
                      class="text-stone-400 hover:text-amber-500 transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      on:click={() => removeAgent(index)}
                      class="text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Orchestration Agent -->
        {#if formData.orchestrationAgent}
          <div class="space-y-4">
            <h4 class="font-medium text-stone-900 dark:text-white">Orchestration Agent</h4>
            <div
              class="border border-purple-200 dark:border-purple-600 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h5 class="font-medium text-stone-900 dark:text-white">
                    {formData.orchestrationAgent.name}
                  </h5>
                  <p class="text-sm text-stone-600 dark:text-gray-300 mt-1">
                    Coordinates responses between {formData.agents?.length || 0} specialist agents
                  </p>
                </div>
                <button
                  on:click={removeOrchestrationAgent}
                  class="text-stone-400 hover:text-red-500 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        {/if}

        {#if !formData.agents?.length}
          <div class="text-center py-8 text-stone-500 dark:text-gray-400">
            No agents added yet. Add at least one agent to handle user interactions.
          </div>
        {/if}
      </div>
    {:else if activeTab === 'materials'}
      <!-- Reference Materials -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-white">Reference Materials</h3>
          <Button on:click={handleMaterialUpload}>Upload Materials</Button>
        </div>

        {#if formData.materials?.length}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each formData.materials as material, index}
              <div class="border border-stone-200 dark:border-gray-600 rounded-lg p-4">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <svg
                        class="w-4 h-4 text-stone-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <h5 class="font-medium text-stone-900 dark:text-white text-sm">
                        {material.fileName}
                      </h5>
                    </div>
                    <div class="text-xs text-stone-500 dark:text-gray-400 space-y-1">
                      <div>Status: {material.status}</div>
                      {#if material.assignments?.allAgents}
                        <div>Available to all agents</div>
                      {:else if material.assignments?.specificAgents?.length}
                        <div>Available to {material.assignments.specificAgents.length} agents</div>
                      {/if}
                    </div>
                  </div>
                  <button
                    on:click={() => removeMaterial(index)}
                    class="text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8 text-stone-500 dark:text-gray-400">
            No materials uploaded yet. Add reference materials to enhance agent knowledge.
          </div>
        {/if}
      </div>
    {:else if activeTab === 'settings'}
      <!-- LLM Settings -->
      <div class="space-y-6">
        <h3 class="text-lg font-semibold text-stone-900 dark:text-white">AI Provider Settings</h3>

        <div class="space-y-4">
          <div class="flex items-center">
            <input
              type="checkbox"
              id="allowOpenAI"
              bind:checked={formData.llmSettings.allowOpenAI}
              class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label for="allowOpenAI" class="ml-2 text-sm text-stone-700 dark:text-gray-300">
              Allow OpenAI API usage
            </label>
          </div>

          <div>
            <label
              for="preferred-provider-editor"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Preferred Provider
            </label>
            <select
              id="preferred-provider-editor"
              bind:value={formData.llmSettings.preferredProvider}
              class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
            >
              <option value="ollama">Local LLM (Ollama)</option>
              {#if formData.llmSettings.allowOpenAI}
                <option value="openai">OpenAI</option>
              {/if}
            </select>
          </div>

          <div class="flex items-center">
            <input
              type="checkbox"
              id="fallbackEnabled"
              bind:checked={formData.llmSettings.fallbackEnabled}
              class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label for="fallbackEnabled" class="ml-2 text-sm text-stone-700 dark:text-gray-300">
              Enable fallback to other providers
            </label>
          </div>

          {#if !formData.llmSettings.allowOpenAI}
            <div
              class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4 text-blue-600 dark:text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clip-rule="evenodd"
                  />
                </svg>
                <div class="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Privacy Mode:</strong> This course will only use local LLM providers. No data
                  will be sent to external APIs.
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Agent Modal -->
{#if showAgentModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">
        {editingAgent !== null ? 'Edit Agent' : 'Add New Agent'}
      </h3>

      <div class="space-y-4">
        <div>
          <label
            for="agent-name"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Agent Name *
          </label>
          <input
            id="agent-name"
            type="text"
            bind:value={agentForm.name}
            placeholder="e.g., Grammar Specialist, Conversation Partner..."
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
            required
          />
        </div>

        <div>
          <label
            for="agent-type"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Agent Type
          </label>
          <select
            id="agent-type"
            bind:value={agentForm.type}
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
          >
            <option value={AGENT_TYPES.COURSE}>Specialist Agent</option>
          </select>
        </div>

        <div>
          <label
            for="agent-instructions"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Instructions *
          </label>
          <textarea
            id="agent-instructions"
            bind:value={agentForm.instructions}
            placeholder="Describe how this agent should behave, what it specializes in, and how it should interact with users..."
            rows="6"
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-amber-400"
            required
          ></textarea>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <Button variant="secondary" class="flex-1" on:click={closeAgentModal}>Cancel</Button>
        <Button
          variant="primary"
          class="flex-1"
          on:click={saveAgent}
          disabled={!agentForm.name || !agentForm.instructions}
        >
          {editingAgent !== null ? 'Update Agent' : 'Add Agent'}
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Material Modal -->
{#if showMaterialModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">
        Upload Reference Materials
      </h3>

      <div class="space-y-4">
        <div>
          <label
            for="material-files"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Select Files
          </label>
          <input
            id="material-files"
            type="file"
            multiple
            accept=".pdf,.txt,.md,.doc,.docx"
            bind:files={materialFiles}
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
          />
          <p class="text-xs text-stone-500 dark:text-gray-400 mt-1">
            Supported formats: PDF, TXT, MD, DOC, DOCX
          </p>
        </div>

        <div>
          <fieldset>
            <legend class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2">
              Assignment
            </legend>
            <div class="space-y-2">
              <div class="flex items-center">
                <input
                  type="radio"
                  id="allAgents"
                  bind:group={materialAssignment.allAgents}
                  value={true}
                  class="text-amber-600 focus:ring-amber-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <label for="allAgents" class="ml-2 text-sm text-stone-700 dark:text-gray-300">
                  Available to all agents
                </label>
              </div>
              <div class="flex items-center">
                <input
                  type="radio"
                  id="specificAgents"
                  bind:group={materialAssignment.allAgents}
                  value={false}
                  class="text-amber-600 focus:ring-amber-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <label for="specificAgents" class="ml-2 text-sm text-stone-700 dark:text-gray-300">
                  Available to specific agents
                </label>
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <Button variant="secondary" class="flex-1" on:click={closeMaterialModal}>Cancel</Button>
        <Button
          variant="primary"
          class="flex-1"
          on:click={saveMaterials}
          disabled={!materialFiles || materialFiles.length === 0}
        >
          Upload Materials
        </Button>
      </div>
    </div>
  </div>
{/if}

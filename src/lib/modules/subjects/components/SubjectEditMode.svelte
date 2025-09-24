<script>
  import { createEventDispatcher } from 'svelte';
  import { user } from '$modules/auth/stores';
  import Button from '$shared/components/Button.svelte';
  import AgentManager from './AgentManager.svelte';
  import DocumentUploader from './DocumentUploader.svelte';
  import { ArrowLeft, Save, X } from 'lucide-svelte';

  export let subject = null;
  export let isNew = false;

  const dispatch = createEventDispatcher();

  // Form data
  let formData = {
    name: '',
    description: '',
    shortDescription: '',
    language: '',
    level: '',
    skills: [],
    settings: {
      navigation_codes: {
        quick_navigation: '',
        code_processing_rules: ''
      }
    },
    llmSettings: {
      allowOpenAI: true
    }
  };

  // Form validation
  let errors = {};
  let isSubmitting = false;

  // Skill management
  let newSkill = '';

  // Agent management
  let agents = [];
  let orchestrationAgent = null;

  // Material management
  let materials = [];

  // Initialize form data
  $: if (subject && !isNew) {
    formData = {
      name: subject.name || '',
      description: subject.description || '',
      shortDescription: subject.shortDescription || subject.description?.substring(0, 100) || '',
      language: subject.language || '',
      level: subject.level || '',
      skills: [...(subject.skills || [])],
      settings: {
        navigation_codes: {
          quick_navigation: subject.settings?.navigation_codes?.quick_navigation || '',
          code_processing_rules: subject.settings?.navigation_codes?.code_processing_rules || ''
        }
      },
      llmSettings: {
        allowOpenAI: subject.llmSettings?.allowOpenAI ?? true
      }
    };

    // Initialize agents
    agents = [...(subject.agents || [])];
    orchestrationAgent = subject.orchestrationAgent || null;

    // Initialize materials
    materials = [...(subject.materials || [])];
  }

  function validateForm() {
    errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Subject name is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!formData.language.trim()) {
      errors.language = 'Language is required';
    }

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    isSubmitting = true;

    try {
      // Generate short description if not provided
      if (!formData.shortDescription.trim()) {
        formData.shortDescription = formData.description.substring(0, 100);
        if (formData.description.length > 100) {
          formData.shortDescription += '...';
        }
      }

      // Auto-create orchestration agent if needed
      let finalOrchestrationAgent = orchestrationAgent;
      if (agents.length >= 2 && !orchestrationAgent) {
        finalOrchestrationAgent = {
          id: crypto.randomUUID(),
          name: 'Orchestration',
          description: 'Coordinates communication between multiple agents',
          type: 'orchestration',
          instructions: 'Orchestrate communication between multiple agents',
          systemPrompt:
            'You are an orchestration agent responsible for coordinating multiple specialized agents.',
          pipelineDescription:
            'Automatically created orchestration agent for multi-agent coordination',
          agentCoordination: {
            workflow: 'Route messages to appropriate agents based on content and context',
            communication: 'Facilitate communication between agents and synthesize responses',
            behavior: 'Ensure coherent and coordinated responses from the agent system'
          },
          routingRules: {
            messageTypes: {},
            fallbackAgent: agents[0]?.id || '',
            escalationRules: 'Escalate complex queries to multiple agents when needed'
          },
          ragEnabled: true,
          communicationStyle: {
            tone: 'professional',
            formality: 'adaptive',
            responseLength: 'adaptive'
          },
          configuration: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else if (agents.length < 2) {
        finalOrchestrationAgent = null;
      }

      const subjectData = {
        ...formData,
        creatorId: $user.id,
        creatorRole: $user.role,
        status: 'active',
        agents: [...agents],
        orchestrationAgent: finalOrchestrationAgent,
        materials: [...materials],
        enrolledUsers: subject?.enrolledUsers || [],
        metadata: {
          createdAt: subject?.metadata?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      if (!isNew && subject) {
        if ('practice' in subject) {
          subjectData.practice = subject.practice;
        }
        if ('exam' in subject) {
          subjectData.exam = subject.exam;
        }
      }

      if (isNew) {
        subjectData.id = crypto.randomUUID();
      } else {
        subjectData.id = subject.id;
      }

      dispatch('save', { subject: subjectData, isNew });
    } catch (error) {
      console.error('Error saving subject:', error);
      errors.submit = 'Failed to save subject. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }

  function addSkill() {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      formData.skills = [...formData.skills, newSkill.trim()];
      newSkill = '';
    }
  }

  function removeSkill(skillToRemove) {
    formData.skills = formData.skills.filter((skill) => skill !== skillToRemove);
  }

  function handleSkillKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSkill();
    }
  }

  // Agent management handlers
  function handleAddAgent(event) {
    const { agent } = event.detail;
    agents = [...agents, agent];
  }

  function handleUpdateAgent(event) {
    const { agent } = event.detail;
    agents = agents.map((a) => (a.id === agent.id ? agent : a));
  }

  function handleDeleteAgent(event) {
    const { agentId } = event.detail;
    agents = agents.filter((a) => a.id !== agentId);

    // Remove orchestration agent if less than 2 agents remain
    if (agents.length < 2) {
      orchestrationAgent = null;
    }
  }

  function handleUpdateOrchestration(event) {
    const { orchestrationAgent: updatedOrchestration } = event.detail;
    orchestrationAgent = updatedOrchestration;
  }

  // Material management handlers
  function handleUploadComplete(event) {
    const { material } = event.detail;
    materials = [...materials, material];
  }

  function handleEmbeddingComplete(event) {
    const { material: updatedMaterial } = event.detail;
    materials = materials.map((m) => (m.id === updatedMaterial.id ? updatedMaterial : m));
  }

  function handleDeleteMaterial(event) {
    const { materialId } = event.detail;
    materials = materials.filter((m) => m.id !== materialId);
  }

  function handleUploadError(event) {
    const { message } = event.detail;
    errors.upload = message;
    // Clear error after 5 seconds
    setTimeout(() => {
      if (errors.upload === message) {
        delete errors.upload;
        errors = { ...errors };
      }
    }, 5000);
  }
</script>

<div class="min-h-screen bg-stone-50 dark:bg-gray-900">
  <div class="mx-auto max-w-4xl px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-4 mb-4">
        <Button variant="secondary" on:click={handleCancel}>
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Catalogue
        </Button>
      </div>
      <h1 class="text-3xl font-bold text-stone-900 dark:text-white">
        {isNew ? 'Create New Subject' : `Edit ${subject?.name || 'Subject'}`}
      </h1>
      <p class="text-stone-600 dark:text-gray-300 mt-2">
        {isNew
          ? 'Create a new learning subject with custom agents and materials'
          : 'Modify your subject settings, agents, and materials'}
      </p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-8">
      <!-- Basic Information -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-6">Basic Information</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              for="name"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Subject Name *
            </label>
            <input
              id="name"
              type="text"
              bind:value={formData.name}
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              class:border-red-500={errors.name}
              placeholder="e.g., Spanish B2 Conversation"
            />
            {#if errors.name}
              <p class="text-red-500 text-sm mt-1">{errors.name}</p>
            {/if}
          </div>

          <div>
            <label
              for="language"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Language *
            </label>
            <input
              id="language"
              type="text"
              bind:value={formData.language}
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              class:border-red-500={errors.language}
              placeholder="e.g., Spanish"
            />
            {#if errors.language}
              <p class="text-red-500 text-sm mt-1">{errors.language}</p>
            {/if}
          </div>

          <div>
            <label
              for="level"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Level
            </label>
            <input
              id="level"
              type="text"
              bind:value={formData.level}
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              placeholder="e.g., B2, Intermediate"
            />
          </div>

          <div>
            <span class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2">
              LLM Settings
            </span>
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={formData.llmSettings.allowOpenAI}
                class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span class="ml-2 text-sm text-stone-700 dark:text-gray-300">Allow OpenAI API</span>
            </label>
          </div>
        </div>

        <div class="mt-6">
          <label
            for="description"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Description *
          </label>
          <textarea
            id="description"
            bind:value={formData.description}
            rows="3"
            class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
            class:border-red-500={errors.description}
            placeholder="Detailed description of the subject and what students will learn"
          ></textarea>
          {#if errors.description}
            <p class="text-red-500 text-sm mt-1">{errors.description}</p>
          {/if}
        </div>

        <div class="mt-6">
          <label
            for="shortDescription"
            class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
          >
            Short Description (for tiles)
          </label>
          <textarea
            id="shortDescription"
            bind:value={formData.shortDescription}
            rows="2"
            class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
            placeholder="Brief description for catalogue tiles (auto-generated if empty)"
          ></textarea>
          <p class="text-xs text-stone-500 dark:text-gray-400 mt-1">
            Leave empty to auto-generate from main description
          </p>
        </div>
      </div>

      <!-- Skills -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-6">Skills Covered</h2>

        <div class="flex gap-2 mb-4">
          <input
            type="text"
            bind:value={newSkill}
            on:keydown={handleSkillKeydown}
            placeholder="Add a skill..."
            class="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
          />
          <Button type="button" on:click={addSkill}>Add</Button>
        </div>

        {#if formData.skills.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each formData.skills as skill}
              <span
                class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
              >
                {skill}
                <button
                  type="button"
                  on:click={() => removeSkill(skill)}
                  class="hover:text-amber-600 dark:hover:text-amber-300"
                >
                  <X class="w-3 h-3" />
                </button>
              </span>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Agent Management -->
      <AgentManager
        {agents}
        {orchestrationAgent}
        on:add-agent={handleAddAgent}
        on:update-agent={handleUpdateAgent}
        on:delete-agent={handleDeleteAgent}
        on:update-orchestration={handleUpdateOrchestration}
      />

      <!-- Document Upload -->
      <DocumentUploader
        {materials}
        on:upload-complete={handleUploadComplete}
        on:embedding-complete={handleEmbeddingComplete}
        on:delete-material={handleDeleteMaterial}
        on:error={handleUploadError}
      />

      <!-- Navigation Codes -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 class="text-xl font-semibold text-stone-900 dark:text-white mb-6">Navigation Codes</h2>

        <div class="space-y-4">
          <div>
            <label
              for="quickNavigation"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Quick Navigation
            </label>
            <textarea
              id="quickNavigation"
              bind:value={formData.settings.navigation_codes.quick_navigation}
              rows="3"
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              placeholder="Quick navigation instructions for students"
            ></textarea>
          </div>

          <div>
            <label
              for="codeProcessingRules"
              class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
            >
              Code Processing Rules
            </label>
            <textarea
              id="codeProcessingRules"
              bind:value={formData.settings.navigation_codes.code_processing_rules}
              rows="3"
              class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-amber-400"
              placeholder="Rules for processing navigation codes"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Submit Buttons -->
      <div class="flex justify-end gap-4 pt-6">
        <Button type="button" variant="secondary" on:click={handleCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save class="w-4 h-4 mr-2" />
          {isSubmitting ? 'Saving...' : isNew ? 'Create Subject' : 'Save Changes'}
        </Button>
      </div>

      {#if errors.submit}
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <p class="text-red-700 dark:text-red-300">{errors.submit}</p>
        </div>
      {/if}

      {#if errors.upload}
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <p class="text-red-700 dark:text-red-300">{errors.upload}</p>
        </div>
      {/if}
    </form>
  </div>
</div>

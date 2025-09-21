<script>
  import { createEventDispatcher } from 'svelte';
  import Button from '$shared/components/Button.svelte';
  import { validateSubject } from '../types.js';
  import { validateAgentConfiguration } from '../agents.js';

  export let subject;
  export let showValidation = true;
  export let allowEdit = true;

  const dispatch = createEventDispatcher();

  let validation = { isValid: true, errors: [] };
  let agentValidation = { isValid: true, errors: [] };

  $: {
    if (subject && showValidation) {
      validation = validateSubject(subject);
      agentValidation = validateAgentConfiguration(subject.agents, subject.orchestrationAgent);
    }
  }

  $: allErrors = [...validation.errors, ...agentValidation.errors];
  $: isValid = validation.isValid && agentValidation.isValid;

  const handleEdit = () => {
    dispatch('edit');
  };

  const handlePublish = () => {
    dispatch('publish');
  };

  const getCreatorLabel = (creatorRole) => {
    return creatorRole === 'admin' ? 'Official' : 'Community';
  };

  const getCreatorBadgeClass = (creatorRole) => {
    return creatorRole === 'admin'
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const getAgentTypeLabel = (type) => {
    return type === 'orchestration' ? 'Orchestration' : 'Specialist';
  };

  const getAgentTypeBadge = (type) => {
    return type === 'orchestration'
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  };

  const getValidationIcon = (isValid) => {
    return isValid ? '✅' : '❌';
  };

  const getValidationColor = (isValid) => {
    return isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };
</script>

<div class="max-w-4xl mx-auto space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-stone-900 dark:text-white">Subject Preview</h1>
      <p class="text-sm text-stone-600 dark:text-gray-400 mt-1">
        Review your subject configuration before publishing
      </p>
    </div>

    <div class="flex gap-3">
      {#if allowEdit}
        <Button variant="secondary" on:click={handleEdit}>Edit Subject</Button>
      {/if}
      <Button variant="primary" on:click={handlePublish} disabled={!isValid}>
        {isValid ? 'Publish Subject' : 'Fix Errors First'}
      </Button>
    </div>
  </div>

  <!-- Validation Status -->
  {#if showValidation}
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">{getValidationIcon(isValid)}</span>
        <div>
          <h2 class="text-lg font-semibold {getValidationColor(isValid)}">
            {isValid ? 'Configuration Valid' : 'Configuration Issues Found'}
          </h2>
          <p class="text-sm text-stone-600 dark:text-gray-400">
            {isValid
              ? 'Your subject is ready to be published'
              : `${allErrors.length} issue${allErrors.length === 1 ? '' : 's'} need to be resolved`}
          </p>
        </div>
      </div>

      {#if !isValid}
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Issues to Fix:</h3>
          <ul class="text-sm text-red-700 dark:text-red-300 space-y-1">
            {#each allErrors as error}
              <li>• {error}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Subject Overview -->
  <div
    class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
  >
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-2">
          <h2 class="text-xl font-bold text-stone-900 dark:text-white">
            {subject.name}
          </h2>
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getCreatorBadgeClass(
              subject.creatorRole
            )}"
          >
            {getCreatorLabel(subject.creatorRole)}
          </span>
        </div>

        <div class="flex items-center gap-4 text-sm text-stone-600 dark:text-gray-400 mb-3">
          {#if subject.language}
            <span class="font-medium text-amber-600 dark:text-amber-400">
              {subject.language}
              {#if subject.level}· {subject.level}{/if}
            </span>
          {/if}
        </div>

        <p class="text-stone-600 dark:text-gray-300 leading-relaxed">
          {subject.description}
        </p>
      </div>
    </div>

    <!-- Skills -->
    {#if subject.skills?.length}
      <div class="mt-4">
        <h3 class="text-sm font-medium text-stone-700 dark:text-gray-300 mb-2">Skills Covered</h3>
        <div class="flex flex-wrap gap-2">
          {#each subject.skills as skill}
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
            >
              {skill}
            </span>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Configuration Summary -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Agents Summary -->
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2 mb-3">
        <svg
          class="w-5 h-5 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h3 class="font-semibold text-stone-900 dark:text-white">AI Agents</h3>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-stone-600 dark:text-gray-400">Specialist Agents:</span>
          <span class="font-medium text-stone-900 dark:text-white">
            {subject.agents?.length || 0}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-stone-600 dark:text-gray-400">Orchestration:</span>
          <span class="font-medium text-stone-900 dark:text-white">
            {subject.orchestrationAgent ? 'Yes' : 'No'}
          </span>
        </div>
        {#if subject.agents?.length > 1 && !subject.orchestrationAgent}
          <div class="text-xs text-red-600 dark:text-red-400 mt-2">
            ⚠️ Orchestration agent required for multiple agents
          </div>
        {/if}
      </div>
    </div>

    <!-- Materials Summary -->
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2 mb-3">
        <svg
          class="w-5 h-5 text-blue-600 dark:text-blue-400"
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
        <h3 class="font-semibold text-stone-900 dark:text-white">Materials</h3>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-stone-600 dark:text-gray-400">Documents:</span>
          <span class="font-medium text-stone-900 dark:text-white">
            {subject.materials?.length || 0}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-stone-600 dark:text-gray-400">GraphRAG:</span>
          <span class="font-medium text-stone-900 dark:text-white">
            {subject.materials?.length ? 'Enabled' : 'N/A'}
          </span>
        </div>
      </div>
    </div>

    <!-- LLM Settings Summary -->
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2 mb-3">
        <svg
          class="w-5 h-5 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h3 class="font-semibold text-stone-900 dark:text-white">AI Settings</h3>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-stone-600 dark:text-gray-400">Provider:</span>
          <span class="font-medium text-stone-900 dark:text-white">
            {subject.llmSettings?.preferredProvider || 'Default'}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-stone-600 dark:text-gray-400">External APIs:</span>
          <span
            class="font-medium {subject.llmSettings?.allowOpenAI
              ? 'text-green-600 dark:text-green-400'
              : 'text-blue-600 dark:text-blue-400'}"
          >
            {subject.llmSettings?.allowOpenAI ? 'Allowed' : 'Local Only'}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-stone-600 dark:text-gray-400">Fallback:</span>
          <span class="font-medium text-stone-900 dark:text-white">
            {subject.llmSettings?.fallbackEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Detailed Agent Information -->
  {#if subject.agents?.length || subject.orchestrationAgent}
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
    >
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">Agent Configuration</h3>

      <div class="space-y-4">
        <!-- Subject Agents -->
        {#if subject.agents?.length}
          <div>
            <h4 class="font-medium text-stone-900 dark:text-white mb-3">
              Specialist Agents ({subject.agents.length})
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each subject.agents as agent}
                <div class="border border-stone-200 dark:border-gray-600 rounded-lg p-4">
                  <div class="flex items-center gap-2 mb-2">
                    <h5 class="font-medium text-stone-900 dark:text-white text-sm">
                      {agent.name}
                    </h5>
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getAgentTypeBadge(
                        agent.type
                      )}"
                    >
                      {getAgentTypeLabel(agent.type)}
                    </span>
                  </div>
                  <p class="text-xs text-stone-600 dark:text-gray-300 mb-2">
                    {agent.instructions.substring(0, 120)}...
                  </p>
                  {#if agent.assignedMaterials?.length}
                    <div class="text-xs text-stone-500 dark:text-gray-400">
                      📄 {agent.assignedMaterials.length} materials assigned
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Orchestration Agent -->
        {#if subject.orchestrationAgent}
          <div>
            <h4 class="font-medium text-stone-900 dark:text-white mb-3">Orchestration Agent</h4>
            <div
              class="border border-purple-200 dark:border-purple-600 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20"
            >
              <div class="flex items-center gap-2 mb-2">
                <h5 class="font-medium text-stone-900 dark:text-white text-sm">
                  {subject.orchestrationAgent.name}
                </h5>
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  Orchestration
                </span>
              </div>
              <p class="text-xs text-stone-600 dark:text-gray-300">
                Coordinates responses between {subject.agents?.length || 0} specialist agents
              </p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Materials Preview -->
  {#if subject.materials?.length}
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
    >
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white mb-4">
        Reference Materials ({subject.materials.length})
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each subject.materials as material}
          <div class="border border-stone-200 dark:border-gray-600 rounded-lg p-3">
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
              <h5 class="font-medium text-stone-900 dark:text-white text-sm truncate">
                {material.fileName}
              </h5>
            </div>

            <div class="text-xs text-stone-500 dark:text-gray-400 space-y-1">
              <div>Status: {material.status}</div>
              {#if material.assignments?.allAgents}
                <div>📤 Available to all agents</div>
              {:else if material.assignments?.specificAgents?.length}
                <div>📤 Available to {material.assignments.specificAgents.length} agents</div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Publishing Actions -->
  <div
    class="bg-stone-50 dark:bg-gray-900 rounded-xl p-6 border border-stone-200 dark:border-gray-700"
  >
    <div class="flex items-center justify-between">
      <div>
        <h3 class="font-semibold text-stone-900 dark:text-white">Ready to Publish?</h3>
        <p class="text-sm text-stone-600 dark:text-gray-400 mt-1">
          {#if isValid}
            Your subject configuration looks good and is ready to be published.
          {:else}
            Please fix the validation errors before publishing.
          {/if}
        </p>
      </div>

      <div class="flex gap-3">
        {#if allowEdit}
          <Button variant="secondary" on:click={handleEdit}>Make Changes</Button>
        {/if}
        <Button variant="primary" on:click={handlePublish} disabled={!isValid}>
          {isValid ? 'Publish Subject' : 'Fix Errors First'}
        </Button>
      </div>
    </div>
  </div>
</div>

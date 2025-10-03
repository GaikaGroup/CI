<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import Button from '$shared/components/Button.svelte';
  import { Sparkles, X, RefreshCw } from 'lucide-svelte';

  export let courseName = '';
  export let existingValues = {
    language: '',
    level: '',
    description: '',
    shortDescription: '',
    skills: []
  };
  export let fieldDirty = {
    language: false,
    level: false,
    description: false,
    shortDescription: false,
    skills: false
  };
  export let open = false;
  export let allowOpenAI = true;

  const dispatch = createEventDispatcher();

  const DEFAULT_FORM = () => ({
    topic: '',
    audience: '',
    languageHint: '',
    levelHint: '',
    notes: '',
    agentContext: ''
  });

  let form = DEFAULT_FORM();
  let loading = false;
  let error = null;
  let suggestions = null;
  let usage = null;
  let selectionsInitialised = false;
  let selectedFields = {
    language: false,
    level: false,
    description: false,
    shortDescription: false
  };
  let skillSelections = [];
  let agentSelections = [];

  onMount(() => {
    if (courseName && !form.topic) {
      form.topic = courseName;
    }
    if (existingValues.language && !form.languageHint) {
      form.languageHint = existingValues.language;
    }
    if (existingValues.level && !form.levelHint) {
      form.levelHint = existingValues.level;
    }
  });

  $: if (open) {
    // Reset error state when opening
    error = null;
  }

  $: if (!open) {
    // Reset suggestions when modal is closed to allow a fresh start next time
    suggestions = null;
    usage = null;
    selectionsInitialised = false;
  }

  $: if (suggestions && !selectionsInitialised) {
    initialiseSelections();
    selectionsInitialised = true;
  }

  $: if (!form.topic && courseName) {
    form.topic = courseName;
  }

  $: if (!form.languageHint && existingValues.language) {
    form.languageHint = existingValues.language;
  }

  $: if (!form.levelHint && existingValues.level) {
    form.levelHint = existingValues.level;
  }

  function close() {
    dispatch('close');
  }

  function initialiseSelections() {
    selectedFields = {
      language: shouldDefaultSelect(
        existingValues.language,
        fieldDirty.language,
        suggestions.course.language
      ),
      level: shouldDefaultSelect(existingValues.level, fieldDirty.level, suggestions.course.level),
      description: shouldDefaultSelect(
        existingValues.description,
        fieldDirty.description,
        suggestions.course.description
      ),
      shortDescription: shouldDefaultSelect(
        existingValues.shortDescription,
        fieldDirty.shortDescription,
        suggestions.course.shortDescription
      )
    };

    const existingSkillSet = new Set(
      (existingValues.skills || []).map((skill) => normaliseSkill(skill)).filter(Boolean)
    );

    skillSelections = (suggestions.course.skills || []).map((skill) => {
      const normalised = normaliseSkill(skill);
      return {
        value: skill,
        selected: !existingSkillSet.has(normalised) && !fieldDirty.skills
      };
    });

    agentSelections = (suggestions.agents || []).map((agent) => ({
      ...agent,
      selected: true
    }));
  }

  function shouldDefaultSelect(currentValue, dirty, suggestionValue) {
    if (!suggestionValue) {
      return false;
    }
    if (dirty) {
      return false;
    }
    if (!currentValue) {
      return true;
    }
    return currentValue.trim().length === 0;
  }

  function normaliseSkill(skill) {
    return typeof skill === 'string' ? skill.trim().toLowerCase() : '';
  }

  function clampWords(text, limit) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    const words = text.trim().split(/\s+/);
    if (words.length <= limit) {
      return words.join(' ');
    }
    return words.slice(0, limit).join(' ');
  }

  async function requestDraft(regenerate = false) {
    if (!form.topic.trim()) {
      error = 'Please provide a course topic before requesting AI assistance.';
      return;
    }

    loading = true;
    error = null;

    try {
      const response = await fetch('/api/courses/ai-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          allowOpenAI,
          topic: form.topic.trim()
        })
      });

      if (!response.ok) {
        const payload = await safeParse(response);
        throw new Error(payload?.message || payload?.error || 'Failed to generate AI draft');
      }

      const data = await response.json();
      suggestions = {
        course: {
          language: data.course?.language?.trim() || '',
          level: data.course?.level?.trim() || '',
          description: clampWords(data.course?.description || '', 250),
          shortDescription: clampWords(data.course?.shortDescription || '', 50),
          skills: Array.isArray(data.course?.skills) ? data.course.skills.slice(0, 5) : []
        },
        agents: Array.isArray(data.agents) ? data.agents : []
      };
      usage = data.usage || null;
      selectionsInitialised = false;
      if (!regenerate) {
        // Preserve prompt fields for potential regeneration
        form.notes = data.lastNotes ?? form.notes;
      }
      dispatch('generated', { usage });
    } catch (err) {
      console.error('AI draft generation failed', err);
      error = err.message || 'Unable to generate draft. Please try again.';
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

  function toggleSkillSelection(index) {
    skillSelections = skillSelections.map((entry, idx) =>
      idx === index ? { ...entry, selected: !entry.selected } : entry
    );
  }

  function toggleAgentSelection(index) {
    agentSelections = agentSelections.map((entry, idx) =>
      idx === index ? { ...entry, selected: !entry.selected } : entry
    );
  }

  function applySuggestions() {
    if (!suggestions) {
      return;
    }

    const coursePayload = {};

    if (selectedFields.language && suggestions.course.language) {
      coursePayload.language = suggestions.course.language;
    }
    if (selectedFields.level && suggestions.course.level) {
      coursePayload.level = suggestions.course.level;
    }
    if (selectedFields.description && suggestions.course.description) {
      coursePayload.description = clampWords(suggestions.course.description, 250);
    }
    if (selectedFields.shortDescription && suggestions.course.shortDescription) {
      coursePayload.shortDescription = clampWords(suggestions.course.shortDescription, 50);
    }

    const selectedSkills = skillSelections
      .filter((entry) => entry.selected && entry.value)
      .map((entry) => entry.value);
    if (selectedSkills.length > 0) {
      coursePayload.skills = selectedSkills;
    }

    const selectedAgents = agentSelections
      .filter((entry) => entry.selected)
      .map((entry) => {
        const agent = { ...entry };
        delete agent.selected;
        return agent;
      });

    dispatch('apply', {
      course: coursePayload,
      agents: selectedAgents,
      usage
    });
    close();
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div
      class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
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
            <h2 class="text-lg font-semibold text-stone-900 dark:text-white">AI Course Draft</h2>
            <p class="text-sm text-stone-500 dark:text-gray-300">
              Provide a few hints and let AI propose course details and supporting agents.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" on:click={close}>
          <X class="w-4 h-4" />
        </Button>
      </div>

      <div class="p-6 space-y-6">
        <section class="space-y-4">
          <h3 class="text-base font-semibold text-stone-900 dark:text-white">Prompt</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label
                for="course-topic"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Course topic *
              </label>
              <input
                id="course-topic"
                type="text"
                bind:value={form.topic}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Spanish for Remote Customer Support"
              />
            </div>
            <div>
              <label
                for="course-audience"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Target audience
              </label>
              <input
                id="course-audience"
                type="text"
                bind:value={form.audience}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., English-speaking support agents"
              />
            </div>
            <div>
              <label
                for="course-language-hint"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Preferred language
              </label>
              <input
                id="course-language-hint"
                type="text"
                bind:value={form.languageHint}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Spanish"
              />
            </div>
            <div>
              <label
                for="course-level-hint"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Level guidance
              </label>
              <input
                id="course-level-hint"
                type="text"
                bind:value={form.levelHint}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., B2"
              />
            </div>
            <div class="md:col-span-2">
              <label
                for="course-notes"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Additional notes
              </label>
              <textarea
                id="course-notes"
                rows="2"
                bind:value={form.notes}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Highlight tone, focus areas, or special requirements"
              ></textarea>
            </div>
            <div class="md:col-span-2">
              <label
                for="course-agent-context"
                class="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-2"
              >
                Agent assistance context
              </label>
              <textarea
                id="course-agent-context"
                rows="2"
                bind:value={form.agentContext}
                class="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Describe the types of agents or scenarios you'd like support for"
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
              {#if suggestions}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  on:click={() => requestDraft(true)}
                >
                  <RefreshCw class="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              {/if}
              <Button
                type="button"
                size="sm"
                disabled={loading}
                on:click={() => requestDraft(false)}
              >
                {#if loading}
                  Generating...
                {:else}
                  Generate draft
                {/if}
              </Button>
            </div>
          </div>
        </section>

        {#if suggestions}
          <section class="space-y-4">
            <h3 class="text-base font-semibold text-stone-900 dark:text-white">
              Review suggestions
            </h3>
            <div class="space-y-4">
              <div class="border border-stone-200 dark:border-gray-700 rounded-xl p-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 space-y-2">
                    <h4 class="font-semibold text-stone-900 dark:text-white">Language</h4>
                    <p class="text-sm text-stone-500 dark:text-gray-400">
                      Current: {existingValues.language || '—'}
                    </p>
                    <p class="text-sm text-stone-700 dark:text-gray-200">
                      Suggestion: {suggestions.course.language || '—'}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-stone-700 dark:text-gray-200">
                    <input
                      id="course-language-apply"
                      type="checkbox"
                      bind:checked={selectedFields.language}
                    />
                    <label for="course-language-apply" class="cursor-pointer">Apply</label>
                  </div>
                </div>
              </div>

              <div class="border border-stone-200 dark:border-gray-700 rounded-xl p-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 space-y-2">
                    <h4 class="font-semibold text-stone-900 dark:text-white">Level</h4>
                    <p class="text-sm text-stone-500 dark:text-gray-400">
                      Current: {existingValues.level || '—'}
                    </p>
                    <p class="text-sm text-stone-700 dark:text-gray-200">
                      Suggestion: {suggestions.course.level || '—'}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-stone-700 dark:text-gray-200">
                    <input
                      id="course-level-apply"
                      type="checkbox"
                      bind:checked={selectedFields.level}
                    />
                    <label for="course-level-apply" class="cursor-pointer">Apply</label>
                  </div>
                </div>
              </div>

              <div class="border border-stone-200 dark:border-gray-700 rounded-xl p-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 space-y-2">
                    <h4 class="font-semibold text-stone-900 dark:text-white">
                      Description (≤250 words)
                    </h4>
                    <p class="text-sm text-stone-500 dark:text-gray-400 whitespace-pre-line">
                      Current: {existingValues.description || '—'}
                    </p>
                    <p class="text-sm text-stone-700 dark:text-gray-200 whitespace-pre-line">
                      Suggestion: {suggestions.course.description || '—'}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-stone-700 dark:text-gray-200">
                    <input
                      id="course-description-apply"
                      type="checkbox"
                      bind:checked={selectedFields.description}
                    />
                    <label for="course-description-apply" class="cursor-pointer">Apply</label>
                  </div>
                </div>
              </div>

              <div class="border border-stone-200 dark:border-gray-700 rounded-xl p-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 space-y-2">
                    <h4 class="font-semibold text-stone-900 dark:text-white">
                      Short description (≤50 words)
                    </h4>
                    <p class="text-sm text-stone-500 dark:text-gray-400 whitespace-pre-line">
                      Current: {existingValues.shortDescription || '—'}
                    </p>
                    <p class="text-sm text-stone-700 dark:text-gray-200 whitespace-pre-line">
                      Suggestion: {suggestions.course.shortDescription || '—'}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-stone-700 dark:text-gray-200">
                    <input
                      id="course-short-description-apply"
                      type="checkbox"
                      bind:checked={selectedFields.shortDescription}
                    />
                    <label for="course-short-description-apply" class="cursor-pointer">Apply</label>
                  </div>
                </div>
              </div>

              <div class="border border-stone-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <h4 class="font-semibold text-stone-900 dark:text-white">Skills (max 5)</h4>
                    <p class="text-sm text-stone-500 dark:text-gray-400">
                      Current: {(existingValues.skills || []).length > 0
                        ? existingValues.skills.join(', ')
                        : '—'}
                    </p>
                  </div>
                </div>
                {#if skillSelections.length > 0}
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {#each skillSelections as skill, index}
                      <label
                        class="flex items-center gap-2 text-sm text-stone-700 dark:text-gray-200 border border-stone-200 dark:border-gray-700 rounded-lg px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={skill.selected}
                          on:change={() => toggleSkillSelection(index)}
                        />
                        {skill.value}
                      </label>
                    {/each}
                  </div>
                {:else}
                  <p class="text-sm text-stone-500 dark:text-gray-400">
                    No skill suggestions returned.
                  </p>
                {/if}
              </div>

              {#if agentSelections.length > 0}
                <div
                  class="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 space-y-3"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1">
                      <h4 class="font-semibold text-amber-900 dark:text-amber-200">
                        Suggested agents ({agentSelections.length})
                      </h4>
                      <p class="text-sm text-amber-800 dark:text-amber-100">
                        Select agents to pass into the agent manager for review.
                      </p>
                    </div>
                  </div>
                  <div class="space-y-3">
                    {#each agentSelections as agent, index}
                      <div class="border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                        <div class="flex items-start justify-between gap-3">
                          <div class="flex-1">
                            <h5 class="font-semibold text-amber-900 dark:text-amber-100">
                              {agent.name}
                            </h5>
                            <p class="text-sm text-amber-800 dark:text-amber-100 mb-2">
                              {agent.description}
                            </p>
                            <p class="text-xs text-amber-700 dark:text-amber-200 mb-1">
                              <strong>Instructions:</strong>
                              {agent.instructions}
                            </p>
                            <p class="text-xs text-amber-700 dark:text-amber-200">
                              <strong>System prompt:</strong>
                              {agent.systemPrompt}
                            </p>
                          </div>
                          <label
                            class="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200"
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
                </div>
              {/if}
            </div>
          </section>

          <div class="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-gray-700">
            <Button type="button" variant="secondary" on:click={close}>Cancel</Button>
            <Button type="button" on:click={applySuggestions} disabled={loading || !suggestions}>
              Apply selected
            </Button>
          </div>
        {/if}

        {#if !suggestions}
          <div
            class="border border-dashed border-stone-300 dark:border-gray-600 rounded-xl p-6 text-center text-sm text-stone-500 dark:text-gray-400"
          >
            Provide a topic and optional guidance, then generate a draft to review AI suggestions.
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

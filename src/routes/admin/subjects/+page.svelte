<script>
  import { onMount } from 'svelte';
  import Button from '$shared/components/Button.svelte';
  import { subjectsStore } from '$lib/stores/subjects';

  const emptyForm = () => ({
    id: null,
    name: '',
    description: '',
    language: '',
    level: '',
    skillsText: '',
    practiceSummary: '',
    practiceInstructions: '',
    practiceFollowUp: '',
    practiceMinWords: '',
    practiceMaxTokens: '',
    examSummary: '',
    examInstructions: '',
    examFollowUp: '',
    examMinWords: '',
    examMaxTokens: '',
    settingsText: ''
  });

  let subjects = [];
  let form = emptyForm();
  let editingId = null;
  let showResetConfirm = false;
  let formError = '';

  const parseList = (value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  // --- Normalization helpers (keep stricter branch) ---
  const normaliseText = (value) => (typeof value === 'string' ? value.trim() : '');

  const buildManualMode = (summary, instructions, followUp, minWordsValue, maxTokensValue) => {
    const trimmedSummary = normaliseText(summary);
    const trimmedInstructions = normaliseText(instructions);
    const trimmedFollowUp = normaliseText(followUp);

    const hasContent =
      trimmedSummary.length > 0 ||
      trimmedInstructions.length > 0 ||
      trimmedFollowUp.length > 0 ||
      minWordsValue !== null ||
      maxTokensValue !== null;

    if (!hasContent) {
      return null;
    }

    return {
      summary: trimmedSummary,
      instructions: trimmedInstructions,
      followUp: trimmedFollowUp,
      minWords: minWordsValue,
      maxTokens: maxTokensValue
    };
  };

  const resetForm = () => {
    form = emptyForm();
    editingId = null;
    formError = '';
  };

  const cancelEdit = () => {
    resetForm();
  };

  const unsubscribe = subjectsStore.subscribe((value) => {
    subjects = value;
    if (editingId) {
      const current = value.find((subject) => subject.id === editingId);
      if (!current) {
        cancelEdit();
      }
    }
  });

  onMount(() => {
    subjectsStore.initialise();
    return () => {
      unsubscribe();
    };
  });

  const buildPayload = () => {
    formError = '';

    const name = normaliseText(form.name);
    const description = normaliseText(form.description);
    const language = normaliseText(form.language);
    const level = normaliseText(form.level);
    const skills = parseList(form.skillsText);
    let settings = null;

    if (form.settingsText && form.settingsText.trim().length > 0) {
      try {
        settings = JSON.parse(form.settingsText);
      } catch (error) {
        formError = 'Subject settings JSON is invalid. Please correct the syntax and try again.';
        console.warn('[Admin/Subjects] Failed to parse subject settings JSON', error);
        return null;
      }
    }

    if (!name) {
      formError = 'Please provide a subject name.';
      return null;
    }

    if (!description) {
      formError = 'Please provide a short description for this subject.';
      return null;
    }

    const manualPractice = buildManualMode(
      form.practiceSummary,
      form.practiceInstructions,
      form.practiceFollowUp,
      toNumber(form.practiceMinWords),
      toNumber(form.practiceMaxTokens)
    );

    const manualExam = buildManualMode(
      form.examSummary,
      form.examInstructions,
      form.examFollowUp,
      toNumber(form.examMinWords),
      toNumber(form.examMaxTokens)
    );

    const practice = settings?.practice_mode ?? manualPractice;
    const exam = settings?.exam_mode ?? manualExam;

    return {
      id: editingId || undefined,
      name,
      description,
      language,
      level,
      skills,
      practice: practice ?? null,
      exam: exam ?? null,
      settings: settings ?? null
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = buildPayload();

    if (!payload) {
      return;
    }

    if (editingId) {
      subjectsStore.updateSubject(editingId, payload);
    } else {
      subjectsStore.addSubject(payload);
    }

    resetForm();
  };

  const editSubject = (subject) => {
    editingId = subject.id;
    form = {
      id: subject.id,
      name: subject.name,
      description: subject.description,
      language: subject.language,
      level: subject.level,
      skillsText: subject.skills?.join(', ') ?? '',
      practiceSummary: subject.practice?.summary ?? '',
      practiceInstructions: subject.practice?.instructions ?? '',
      practiceFollowUp: subject.practice?.followUp ?? '',
      practiceMinWords: subject.practice?.minWords ?? '',
      practiceMaxTokens: subject.practice?.maxTokens ?? '',
      examSummary: subject.exam?.summary ?? '',
      examInstructions: subject.exam?.instructions ?? '',
      examFollowUp: subject.exam?.followUp ?? '',
      examMinWords: subject.exam?.minWords ?? '',
      examMaxTokens: subject.exam?.maxTokens ?? '',
      settingsText: subject.settings ? JSON.stringify(subject.settings, null, 2) : ''
    };
    formError = '';
  };

  const removeSubject = (id) => {
    if (editingId === id) {
      resetForm();
    }
    subjectsStore.removeSubject(id);
  };

  const resetToDefaults = () => {
    subjectsStore.resetToDefault();
    resetForm();
    showResetConfirm = false;
  };
</script>

<svelte:head>
  <title>Admin · Subjects</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-6 py-10 space-y-10">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-stone-900 dark:text-white">Subject management</h1>
      <p class="mt-2 text-sm text-stone-600 dark:text-gray-300">
        Curate subjects and guidance for Learn mode. These settings shape prompts and rubrics for
        learners.
      </p>
    </div>
    <div class="flex items-center gap-3">
      {#if showResetConfirm}
        <Button variant="secondary" on:click={() => (showResetConfirm = false)}>Cancel</Button>
        <Button on:click={resetToDefaults}>Restore defaults</Button>
      {:else}
        <Button variant="secondary" on:click={() => (showResetConfirm = true)}>
          Reset to defaults
        </Button>
      {/if}
    </div>
  </header>

  <section class="space-y-6">
    <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">Existing subjects</h2>
    {#if subjects.length === 0}
      <p class="text-sm text-stone-500 dark:text-gray-400">
        No subjects have been created yet. Use the form below to add your first subject.
      </p>
    {:else}
      <div class="grid gap-5 md:grid-cols-2">
        {#each subjects as subject (subject.id)}
          <article
            class="flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="space-y-3">
              <div>
                <h3 class="text-xl font-semibold text-stone-900 dark:text-white">{subject.name}</h3>
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
                >
                  {subject.language}{subject.level ? ` · ${subject.level}` : ''}
                </p>
              </div>
              <p class="text-sm text-stone-600 dark:text-gray-300">{subject.description}</p>
              {#if subject.skills?.length}
                <p class="text-xs text-stone-500 dark:text-gray-400">
                  Focus skills: {subject.skills.join(', ')}
                </p>
              {/if}
              <div class="rounded-xl bg-stone-50 p-4 text-sm dark:bg-gray-900">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-gray-400"
                >
                  Practice mode
                </p>
                {#if subject.practice}
                  <p class="mt-1 text-stone-700 dark:text-gray-200">
                    {subject.practice.summary}
                  </p>
                  {#if subject.practice.minWords}
                    <p class="mt-1 text-xs text-stone-500 dark:text-gray-400">
                      Target length: {subject.practice.minWords} words
                    </p>
                  {/if}
                {:else}
                  <p class="mt-1 text-xs text-stone-500 dark:text-gray-400">
                    No practice guidance configured yet.
                  </p>
                {/if}
              </div>
              <div class="rounded-xl bg-stone-50 p-4 text-sm dark:bg-gray-900">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-gray-400"
                >
                  Exam mode
                </p>
                {#if subject.exam}
                  <p class="mt-1 text-stone-700 dark:text-gray-200">{subject.exam.summary}</p>
                  {#if subject.exam.minWords}
                    <p class="mt-1 text-xs text-stone-500 dark:text-gray-400">
                      Target length: {subject.exam.minWords} words
                    </p>
                  {/if}
                {:else}
                  <p class="mt-1 text-xs text-stone-500 dark:text-gray-400">
                    No exam simulation guidance configured yet.
                  </p>
                {/if}
              </div>
            </div>
            <div class="mt-6 flex flex-wrap gap-3">
              <Button on:click={() => editSubject(subject)}>Edit</Button>
              <Button variant="secondary" on:click={() => removeSubject(subject.id)}>Delete</Button>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>

  <section
    class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
  >
    <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">
      {editingId ? 'Edit subject' : 'Create new subject'}
    </h2>
    <p class="mt-2 text-sm text-stone-600 dark:text-gray-300">
      Define the learner experience for each subject. Practice mode should feel like supportive
      coaching, while exam mode should mirror scoring conditions.
    </p>

    <form class="mt-6 space-y-6" on:submit|preventDefault={handleSubmit}>
      {#if formError}
        <div
          class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
        >
          {formError}
        </div>
      {/if}

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="text-sm font-medium text-stone-700 dark:text-gray-200" for="name"
            >Name</label
          >
          <input
            id="name"
            class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            bind:value={form.name}
            placeholder="e.g. DELE B2 Spanish"
            required
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-stone-700 dark:text-gray-200" for="language"
            >Language</label
          >
          <input
            id="language"
            class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            bind:value={form.language}
            placeholder="Spanish"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-stone-700 dark:text-gray-200" for="level"
            >Level</label
          >
          <input
            id="level"
            class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            bind:value={form.level}
            placeholder="B2"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-stone-700 dark:text-gray-200" for="skills"
            >Focus skills</label
          >
          <input
            id="skills"
            class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            bind:value={form.skillsText}
            placeholder="Reading, Listening, Writing"
          />
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-stone-900 dark:text-white">Practice mode</h3>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2 md:col-span-2">
            <label
              class="text-sm font-medium text-stone-700 dark:text-gray-200"
              for="practiceSummary">Summary</label
            >
            <textarea
              id="practiceSummary"
              rows="2"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.practiceSummary}
            />
          </div>
          <div class="space-y-2 md:col-span-2">
            <label
              class="text-sm font-medium text-stone-700 dark:text-gray-200"
              for="practiceInstructions">Instructions</label
            >
            <textarea
              id="practiceInstructions"
              rows="3"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.practiceInstructions}
            />
          </div>
          <div class="space-y-2 md:col-span-2">
            <label
              class="text-sm font-medium text-stone-700 dark:text-gray-200"
              for="practiceFollowUp">Follow-up guidance</label
            >
            <textarea
              id="practiceFollowUp"
              rows="2"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.practiceFollowUp}
            />
          </div>
          <div class="space-y-2">
            <label
              class="text-sm font-medium text-stone-700 dark:text-gray-200"
              for="practiceMinWords">Minimum words</label
            >
            <input
              id="practiceMinWords"
              type="number"
              min="0"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.practiceMinWords}
            />
          </div>
          <div class="space-y-2">
            <label
              class="text-sm font-medium text-stone-700 dark:text-gray-200"
              for="practiceMaxTokens">Max tokens</label
            >
            <input
              id="practiceMaxTokens"
              type="number"
              min="0"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.practiceMaxTokens}
            />
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-stone-900 dark:text-white">Exam mode</h3>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-medium text-stone-700 dark:text-gray-200" for="examSummary"
              >Summary</label
            >
            <textarea
              id="examSummary"
              rows="2"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.examSummary}
            />
          </div>
          <div class="space-y-2 md:col-span-2">
            <label
              class="text-sm font-medium text-stone-700 dark:text-gray-200"
              for="examInstructions">Instructions</label
            >
            <textarea
              id="examInstructions"
              rows="3"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.examInstructions}
            />
          </div>
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-medium text-stone-700 dark:text-gray-200" for="examFollowUp"
              >Follow-up guidance</label
            >
            <textarea
              id="examFollowUp"
              rows="2"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.examFollowUp}
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-stone-700 dark:text-gray-200" for="examMinWords"
              >Minimum words</label
            >
            <input
              id="examMinWords"
              type="number"
              min="0"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.examMinWords}
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-stone-700 dark:text-gray-200" for="examMaxTokens"
              >Max tokens</label
            >
            <input
              id="examMaxTokens"
              type="number"
              min="0"
              class="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              bind:value={form.examMaxTokens}
            />
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-stone-700 dark:text-gray-200" for="settingsJson"
          >Advanced subject settings (JSON)</label
        >
        <textarea
          id="settingsJson"
          class="h-64 w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          bind:value={form.settingsText}
          placeholder="Paste subject settings JSON that follows the universal exam schema"
        />
        <p class="text-xs text-stone-500 dark:text-gray-400">
          Optional: provide the complete universal exam configuration to control navigation codes,
          consent flows, menus, and compliance prompts. When supplied, these settings take
          precedence over the quick summaries above.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <Button type="submit">{editingId ? 'Update subject' : 'Create subject'}</Button>
        {#if editingId}
          <Button variant="secondary" type="button" on:click={cancelEdit}>Cancel</Button>
        {/if}
      </div>
    </form>
  </section>
</main>

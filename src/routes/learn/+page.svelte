<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import ChatInterface from '$modules/chat/components/ChatInterface.svelte';
  import { checkAuth, isAuthenticated } from '$modules/auth/stores';
  import { messages } from '$modules/chat/stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';
  import SubjectSelection from '$modules/learn/components/SubjectSelection.svelte';
  import Button from '$shared/components/Button.svelte';
  import { container } from '$lib/shared/di/container';
  import { setMode } from '$lib/stores/mode';
  import { subjectsStore } from '$lib/stores/subjects';
  import {
    examProfile,
    initialiseExamProfile,
    setExamProfile,
    clearExamProfile
  } from '$lib/stores/examProfile';

  let redirecting = false;

  const buildExamProfile = (subject, mode) => {
    const activeMode = mode === 'exam' ? subject.exam : subject.practice;
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      description: subject.description,
      language: subject.language,
      level: subject.level,
      skills: subject.skills ?? [],
      mode,
      practice: subject.practice,
      exam: subject.exam,
      activeMode,
      settings: subject.settings ?? null
    };
  };

  const resetSession = () => {
    if (!browser) {
      return;
    }

    const previousSessionId = localStorage.getItem('sessionId');
    localStorage.removeItem('sessionId');

    if (previousSessionId && container.has('sessionFactory')) {
      try {
        const sessionFactory = container.resolve('sessionFactory');
        sessionFactory.removeSession(previousSessionId);
      } catch (error) {
        console.warn('[Learn] Failed to clear previous session', error);
      }
    }

    messages.set([]);
  };

  const handleSubjectSelect = (event) => {
    const { subject, mode } = event.detail;
    if (!subject || !mode) {
      return;
    }

    const profile = buildExamProfile(subject, mode);
    setExamProfile(profile);
    resetSession();
  };

  const handleChangeSubject = () => {
    clearExamProfile();
    resetSession();
  };

  onMount(() => {
    checkAuth();
    subjectsStore.initialise();
    initialiseExamProfile();

    const unsubscribe = isAuthenticated.subscribe((authed) => {
      if (!authed && !redirecting) {
        redirecting = true;
        goto('/login?redirect=/learn');
      } else if (authed) {
        setMode('learn');
      }
    });
    return () => {
      unsubscribe();
    };
  });

  $: activeMode = $examProfile
    ? $examProfile.mode === 'exam'
      ? $examProfile.exam
      : $examProfile.practice
    : null;

  $: modeLabel = $examProfile
    ? getTranslation(
        $selectedLanguage,
        $examProfile.mode === 'exam' ? 'learnModeExamLabel' : 'learnModePracticeLabel'
      )
    : '';

  $: skillsLabel =
    activeMode && $examProfile?.skills?.length
      ? `${getTranslation($selectedLanguage, 'learnModeActiveSkills')}: ${$examProfile.skills.join(', ')}`
      : '';

  $: wordGoal = activeMode?.minWords
    ? getTranslation($selectedLanguage, 'learnModeActiveWordGoal').replace(
        '{words}',
        activeMode.minWords
      )
    : null;

  $: navigationSummary = $examProfile?.settings?.navigation_codes?.quick_navigation ?? '';
  $: navigationRules = $examProfile?.settings?.navigation_codes?.code_processing_rules ?? '';
</script>

<div class="min-h-screen">
  <h1 class="sr-only">Learn Mode</h1>
  <div class="mx-auto max-w-5xl px-4 py-8">
    {#if !$examProfile}
      <SubjectSelection subjects={$subjectsStore} on:select={handleSubjectSelect} />
    {:else}
      <section
        class="mb-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="space-y-3">
            <div>
              <p
                class="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
              >
                {getTranslation($selectedLanguage, 'learnCurrentSubject')}
              </p>
              <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">
                {$examProfile.subjectName}
              </h2>
            </div>
            <p class="text-sm text-stone-600 dark:text-gray-300">
              {$examProfile.description}
            </p>
            <div class="flex flex-wrap gap-3 text-sm font-medium text-stone-700 dark:text-gray-200">
              <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-gray-800/60">
                {modeLabel}
              </span>
              {#if $examProfile.level}
                <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-gray-800/60">
                  {$examProfile.level}
                </span>
              {/if}
              {#if $examProfile.language}
                <span class="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-gray-800/60">
                  {$examProfile.language}
                </span>
              {/if}
            </div>
          </div>
          <div class="flex items-start gap-3">
            <Button variant="secondary" on:click={handleChangeSubject}>
              {getTranslation($selectedLanguage, 'learnChangeSubject')}
            </Button>
          </div>
        </div>

        {#if activeMode}
          <div class="mt-6 grid gap-4 md:grid-cols-2">
            <div class="space-y-2 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-gray-900/60">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
              >
                {getTranslation($selectedLanguage, 'learnModeActiveSummary')}
              </p>
              <p class="text-sm text-stone-700 dark:text-gray-200">{activeMode.summary}</p>
              {#if skillsLabel}
                <p class="text-xs text-stone-500 dark:text-gray-400">{skillsLabel}</p>
              {/if}
            </div>
            <div class="space-y-2 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-gray-900/60">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
              >
                {getTranslation($selectedLanguage, 'learnModeActiveInstructions')}
              </p>
              <p class="text-sm text-stone-700 dark:text-gray-200">{activeMode.instructions}</p>
              {#if wordGoal}
                <p class="text-xs text-stone-500 dark:text-gray-400">{wordGoal}</p>
              {/if}
            </div>
            {#if activeMode.followUp}
              <div
                class="space-y-2 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-gray-900/60 md:col-span-2"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
                >
                  {getTranslation($selectedLanguage, 'learnModeActiveFollowUp')}
                </p>
                <p class="text-sm text-stone-700 dark:text-gray-200">{activeMode.followUp}</p>
              </div>
            {/if}

            {#if navigationSummary}
              <div
                class="space-y-2 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-gray-900/60 md:col-span-2"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300"
                >
                  {getTranslation($selectedLanguage, 'learnNavigationCodesHeading')}
                </p>
                <p class="whitespace-pre-line text-sm text-stone-700 dark:text-gray-200">
                  {navigationSummary}
                </p>
                {#if navigationRules}
                  <p class="whitespace-pre-line text-xs text-stone-500 dark:text-gray-400">
                    {navigationRules}
                  </p>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </section>

      <ChatInterface />
    {/if}
  </div>
</div>

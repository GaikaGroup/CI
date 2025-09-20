<script>
  import { createEventDispatcher } from 'svelte';
  import Button from '$shared/components/Button.svelte';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { getTranslation } from '$modules/i18n/translations';

  export let subjects = [];

  const dispatch = createEventDispatcher();

  const handleSelection = (subject, mode) => {
    dispatch('select', { subject, mode });
  };
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-semibold text-stone-900 dark:text-white">
      {getTranslation($selectedLanguage, 'learnSelectSubjectHeading')}
    </h2>
    <p class="mt-2 text-stone-600 dark:text-gray-300">
      {getTranslation($selectedLanguage, 'learnSelectSubjectDescription')}
    </p>
  </div>

  {#if subjects.length === 0}
    <p class="text-stone-500 dark:text-gray-400">
      {getTranslation($selectedLanguage, 'learnNoSubjects')}
    </p>
  {:else}
    <div class="grid gap-6 md:grid-cols-2">
      {#each subjects as subject}
        <article
          class="flex h-full flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="space-y-3">
            <div>
              <h3 class="text-xl font-semibold text-stone-900 dark:text-white">{subject.name}</h3>
              <p class="mt-1 text-sm uppercase tracking-wide text-amber-600 dark:text-amber-300">
                {subject.language}{subject.level ? ` · ${subject.level}` : ''}
              </p>
            </div>
            <p class="text-sm text-stone-600 dark:text-gray-300">{subject.description}</p>

            {#if subject.skills?.length}
              <div
                class="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-gray-400"
              >
                {getTranslation($selectedLanguage, 'learnFocusSkills')}: {subject.skills.join(', ')}
              </div>
            {/if}

            <div class="mt-4 space-y-3 rounded-xl bg-stone-50 p-4 text-sm dark:bg-gray-900">
              <h4 class="font-semibold text-stone-800 dark:text-gray-100">
                {getTranslation($selectedLanguage, 'learnPracticeSummary')}
              </h4>
              <p class="text-stone-600 dark:text-gray-300">
                {subject.practice?.summary ||
                  getTranslation($selectedLanguage, 'learnPracticeNoSummary')}
              </p>
              <p class="text-xs text-stone-500 dark:text-gray-400">
                {getTranslation($selectedLanguage, 'learnPracticeMinWords').replace(
                  '{words}',
                  subject.practice?.minWords ?? '—'
                )}
              </p>
            </div>

            <div class="space-y-3 rounded-xl bg-stone-50 p-4 text-sm dark:bg-gray-900">
              <h4 class="font-semibold text-stone-800 dark:text-gray-100">
                {getTranslation($selectedLanguage, 'learnExamSummary')}
              </h4>
              <p class="text-stone-600 dark:text-gray-300">
                {subject.exam?.summary || getTranslation($selectedLanguage, 'learnExamNoSummary')}
              </p>
              <p class="text-xs text-stone-500 dark:text-gray-400">
                {getTranslation($selectedLanguage, 'learnExamMinWords').replace(
                  '{words}',
                  subject.exam?.minWords ?? '—'
                )}
              </p>
            </div>

            {#if subject.settings?.navigation_codes?.quick_navigation}
              <div class="space-y-2 rounded-xl bg-stone-100 p-4 text-xs dark:bg-gray-900/70">
                <p class="font-semibold uppercase tracking-wide text-stone-600 dark:text-gray-200">
                  {getTranslation($selectedLanguage, 'learnNavigationCodesHeading')}
                </p>
                <p class="whitespace-pre-line text-stone-600 dark:text-gray-300">
                  {subject.settings.navigation_codes.quick_navigation}
                </p>
              </div>
            {/if}
          </div>

          <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button class="w-full" on:click={() => handleSelection(subject, 'practice')}>
              {getTranslation($selectedLanguage, 'learnStartPractice')}
            </Button>
            <Button
              class="w-full"
              variant="secondary"
              on:click={() => handleSelection(subject, 'exam')}
            >
              {getTranslation($selectedLanguage, 'learnStartExam')}
            </Button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

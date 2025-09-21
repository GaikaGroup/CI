<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user } from '$modules/auth/stores';
  import { subjectsStore } from '$lib/stores/subjects';
  import SubjectEditMode from '$modules/subjects/components/SubjectEditMode.svelte';
  import { SubjectService } from '$modules/subjects/services/SubjectService.js';

  let subject = null;
  let isNew = false;
  let loading = true;
  let error = null;

  const subjectService = new SubjectService(subjectsStore);

  onMount(async () => {
    const subjectId = $page.url.searchParams.get('id');
    isNew = $page.url.searchParams.get('new') === 'true';

    if (!$user) {
      goto('/login?redirect=' + encodeURIComponent($page.url.pathname + $page.url.search));
      return;
    }

    if (isNew) {
      // Creating new subject
      subject = null;
      loading = false;
    } else if (subjectId) {
      // Editing existing subject
      try {
        const result = await subjectService.getSubject(subjectId);
        if (result.success) {
          subject = result.subject;

          // Check if user can edit this subject
          const canEdit = subjectService.canUserModifySubject(subject, $user.id, $user.role);
          if (!canEdit.allowed) {
            error = canEdit.reason;
            loading = false;
            return;
          }
        } else {
          error = result.error || 'Subject not found';
        }
      } catch (err) {
        console.error('Error loading subject:', err);
        error = 'Failed to load subject';
      }
      loading = false;
    } else {
      error = 'No subject ID provided';
      loading = false;
    }
  });

  async function handleSave(event) {
    const { subject: subjectData, isNew: creating } = event.detail;

    try {
      let result;
      if (creating) {
        result = await subjectService.createSubject(subjectData, $user.id, $user.role);
      } else {
        result = await subjectService.updateSubject(
          subjectData.id,
          subjectData,
          $user.id,
          $user.role
        );
      }

      if (result.success) {
        // Navigate back to catalogue
        goto('/catalogue');
      } else {
        console.error('Failed to save subject:', result.error);
        // Error will be handled by the SubjectEditMode component
      }
    } catch (err) {
      console.error('Error saving subject:', err);
    }
  }

  function handleCancel() {
    goto('/catalogue');
  }
</script>

<svelte:head>
  <title>{isNew ? 'Create Subject' : `Edit ${subject?.name || 'Subject'}`}</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
      <p class="text-stone-600 dark:text-gray-300">Loading subject...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md"
      >
        <h2 class="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h2>
        <p class="text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button
          on:click={() => goto('/catalogue')}
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Back to Catalogue
        </button>
      </div>
    </div>
  </div>
{:else}
  <SubjectEditMode {subject} {isNew} on:save={handleSave} on:cancel={handleCancel} />
{/if}

<script>
  import { X } from 'lucide-svelte';
  import { onMount, createEventDispatcher } from 'svelte';

  export let title = '';
  export let open = false;
  export let showCloseButton = true;
  export let closeOnEscape = true;
  export let closeOnOutsideClick = true;
  export let width = 'max-w-md';

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function handleKeydown(e) {
    if (closeOnEscape && e.key === 'Escape' && open) {
      close();
    }
  }

  function handleOutsideClick(e) {
    if (closeOnOutsideClick && e.target === e.currentTarget && open) {
      close();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    on:click={handleOutsideClick}
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl {width} w-full max-h-[90vh] overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {#if title || showCloseButton}
        <div
          class="flex justify-between items-center p-4 border-b dark:border-gray-700 border-stone-200"
        >
          {#if title}
            <h2 id="modal-title" class="text-lg font-semibold dark:text-white text-stone-900">
              {title}
            </h2>
          {:else}
            <div></div>
          {/if}

          {#if showCloseButton}
            <button
              on:click={close}
              class="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-500 dark:text-gray-400"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          {/if}
        </div>
      {/if}

      <div class="p-4">
        <slot />
      </div>

      {#if $$slots.footer}
        <div
          class="p-4 border-t dark:border-gray-700 border-stone-200 bg-stone-50 dark:bg-gray-750 rounded-b-lg"
        >
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}

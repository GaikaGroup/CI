<script>
  import { onMount, afterUpdate } from 'svelte';
  import { messages } from '../stores';
  import { selectedLanguage } from '$modules/i18n/stores';
  import { darkMode } from '$modules/theme/stores';
  import { MESSAGE_TYPES } from '$shared/utils/constants';
  
  let messagesContainer;
  
  // Scroll to bottom when messages change
  afterUpdate(() => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
</script>

<div 
  class="h-96 overflow-y-auto p-6 space-y-4"
  bind:this={messagesContainer}
>
  {#if $messages.length === 0}
    <div class="flex justify-center items-center h-full">
      <p class="text-stone-500 dark:text-gray-400 text-center">
        {#if $selectedLanguage === 'ru'}
          Начните разговор с вашим ИИ-преподавателем
        {:else if $selectedLanguage === 'es'}
          Comienza una conversación con tu tutor de IA
        {:else}
          Start a conversation with your AI tutor
        {/if}
      </p>
    </div>
  {:else}
    {#each $messages as message (message.id)}
      <div
        class="flex {message.type === MESSAGE_TYPES.USER ? 'justify-end' : message.type === MESSAGE_TYPES.SYSTEM ? 'justify-center' : 'justify-start'}"
      >
        <div
          class="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl {
            message.type === MESSAGE_TYPES.USER
              ? 'bg-amber-600 text-white'
              : message.type === MESSAGE_TYPES.SYSTEM
                ? $darkMode 
                  ? 'bg-blue-900 text-blue-200 border border-blue-700' 
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                : $darkMode 
                  ? 'bg-gray-700 text-gray-100'
                  : 'bg-stone-100 text-stone-800'
          }"
        >
          {#if message.images && message.images.length > 0}
            <div class="mb-2 grid grid-cols-2 gap-2">
              {#each message.images as img, index}
                <img
                  src={img}
                  alt="Uploaded"
                  class="w-full h-20 object-cover rounded-lg"
                />
              {/each}
            </div>
          {/if}
          <p class="text-sm">{message.content}</p>
          <p class="text-xs mt-1 {
            message.type === MESSAGE_TYPES.USER 
              ? 'text-amber-200' 
              : message.type === MESSAGE_TYPES.SYSTEM
                ? $darkMode ? 'text-blue-300' : 'text-blue-600'
                : $darkMode ? 'text-gray-400' : 'text-stone-500'
          }">
            {message.timestamp}
          </p>
        </div>
      </div>
    {/each}
  {/if}
</div>
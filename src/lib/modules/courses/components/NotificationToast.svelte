<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fly } from 'svelte/transition';

  export let notification = {
    id: '',
    type: 'info', // success, error, warning, info
    title: '',
    message: '',
    duration: 5000,
    persistent: false,
    actions: []
  };

  const dispatch = createEventDispatcher();
  let timeoutId;
  let progress = 100;
  let progressInterval;

  $: iconPath = getIconPath(notification.type);
  $: colorClasses = getColorClasses(notification.type);

  onMount(() => {
    if (!notification.persistent && notification.duration > 0) {
      // Start progress countdown
      const startTime = Date.now();
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        progress = Math.max(0, 100 - (elapsed / notification.duration) * 100);

        if (progress <= 0) {
          clearInterval(progressInterval);
        }
      }, 50);

      // Auto dismiss
      timeoutId = setTimeout(() => {
        handleDismiss();
      }, notification.duration);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (progressInterval) clearInterval(progressInterval);
    };
  });

  const handleDismiss = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (progressInterval) clearInterval(progressInterval);
    dispatch('dismiss', notification.id);
  };

  const handleAction = (action) => {
    dispatch('action', { notificationId: notification.id, action });
    if (action.dismissOnClick !== false) {
      handleDismiss();
    }
  };

  const getIconPath = (type) => {
    const icons = {
      success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      warning:
        'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return icons[type] || icons.info;
  };

  const getColorClasses = (type) => {
    const colors = {
      success: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-400 dark:text-green-300',
        title: 'text-green-800 dark:text-green-200',
        message: 'text-green-700 dark:text-green-300',
        progress: 'bg-green-500'
      },
      error: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-400 dark:text-red-300',
        title: 'text-red-800 dark:text-red-200',
        message: 'text-red-700 dark:text-red-300',
        progress: 'bg-red-500'
      },
      warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-400 dark:text-amber-300',
        title: 'text-amber-800 dark:text-amber-200',
        message: 'text-amber-700 dark:text-amber-300',
        progress: 'bg-amber-500'
      },
      info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        icon: 'text-blue-400 dark:text-blue-300',
        title: 'text-blue-800 dark:text-blue-200',
        message: 'text-blue-700 dark:text-blue-300',
        progress: 'bg-blue-500'
      }
    };
    return colors[type] || colors.info;
  };

  const pauseTimer = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  };

  const resumeTimer = () => {
    if (!notification.persistent && notification.duration > 0 && !timeoutId) {
      const remainingTime = (progress / 100) * notification.duration;

      if (remainingTime > 0) {
        const startTime = Date.now();
        progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          progress = Math.max(0, ((remainingTime - elapsed) / notification.duration) * 100);

          if (progress <= 0) {
            clearInterval(progressInterval);
          }
        }, 50);

        timeoutId = setTimeout(() => {
          handleDismiss();
        }, remainingTime);
      }
    }
  };
</script>

<div
  class="max-w-sm w-full {colorClasses.bg} {colorClasses.border} border rounded-lg shadow-lg pointer-events-auto overflow-hidden"
  transition:fly={{ y: -50, duration: 300 }}
  on:mouseenter={pauseTimer}
  on:mouseleave={resumeTimer}
  role="alert"
  aria-live="polite"
>
  <!-- Progress bar -->
  {#if !notification.persistent && notification.duration > 0}
    <div class="h-1 bg-stone-200 dark:bg-gray-700">
      <div
        class="h-full transition-all duration-75 {colorClasses.progress}"
        style="width: {progress}%"
      ></div>
    </div>
  {/if}

  <div class="p-4">
    <div class="flex items-start">
      <!-- Icon -->
      <div class="flex-shrink-0">
        <svg
          class="w-5 h-5 {colorClasses.icon}"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath} />
        </svg>
      </div>

      <!-- Content -->
      <div class="ml-3 w-0 flex-1">
        {#if notification.title}
          <p class="text-sm font-medium {colorClasses.title}">
            {notification.title}
          </p>
        {/if}

        {#if notification.message}
          <p class="text-sm {colorClasses.message} {notification.title ? 'mt-1' : ''}">
            {notification.message}
          </p>
        {/if}

        <!-- Actions -->
        {#if notification.actions && notification.actions.length > 0}
          <div class="mt-3 flex space-x-2">
            {#each notification.actions as action}
              <button
                on:click={() => handleAction(action)}
                class="text-sm font-medium {colorClasses.title} hover:opacity-75 transition-opacity"
              >
                {action.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Dismiss button -->
      <div class="ml-4 flex-shrink-0 flex">
        <button
          on:click={handleDismiss}
          class="inline-flex text-stone-400 hover:text-stone-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
          aria-label="Dismiss notification"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</div>

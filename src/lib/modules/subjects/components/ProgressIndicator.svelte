<script>
  import { createEventDispatcher } from 'svelte';

  export let progress = 0; // 0-100
  export let status = 'idle'; // idle, loading, success, error
  export let message = '';
  export let showPercentage = true;
  export let showCancel = false;
  export let size = 'medium'; // small, medium, large
  export let variant = 'default'; // default, minimal, circular

  const dispatch = createEventDispatcher();

  $: progressClamped = Math.max(0, Math.min(100, progress));
  $: isActive = status === 'loading';
  $: isComplete = status === 'success';
  $: hasError = status === 'error';

  const handleCancel = () => {
    dispatch('cancel');
  };

  const getSizeClasses = () => {
    const sizes = {
      small: 'h-2',
      medium: 'h-3',
      large: 'h-4'
    };
    return sizes[size] || sizes.medium;
  };

  const getStatusColor = () => {
    if (hasError) return 'bg-red-500';
    if (isComplete) return 'bg-green-500';
    return 'bg-amber-500';
  };

  const getStatusIcon = () => {
    if (hasError) return '❌';
    if (isComplete) return '✅';
    if (isActive) return '⏳';
    return '';
  };
</script>

{#if variant === 'circular'}
  <!-- Circular Progress -->
  <div class="flex items-center gap-3">
    <div
      class="relative {size === 'small' ? 'w-8 h-8' : size === 'large' ? 'w-12 h-12' : 'w-10 h-10'}"
    >
      <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <!-- Background circle -->
        <path
          class="stroke-stone-200 dark:stroke-gray-700"
          stroke-width="3"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <!-- Progress circle -->
        <path
          class="stroke-current {getStatusColor()} transition-all duration-300"
          stroke-width="3"
          fill="none"
          stroke-linecap="round"
          stroke-dasharray="{progressClamped}, 100"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>

      <!-- Center content -->
      <div class="absolute inset-0 flex items-center justify-center">
        {#if isActive}
          <div class="animate-spin text-amber-500">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        {:else if showPercentage && !hasError && !isComplete}
          <span class="text-xs font-medium text-stone-600 dark:text-gray-400">
            {Math.round(progressClamped)}%
          </span>
        {:else}
          <span class="text-sm">{getStatusIcon()}</span>
        {/if}
      </div>
    </div>

    {#if message}
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-stone-900 dark:text-white truncate">
          {message}
        </p>
        {#if showPercentage && isActive}
          <p class="text-xs text-stone-500 dark:text-gray-400">
            {Math.round(progressClamped)}% complete
          </p>
        {/if}
      </div>
    {/if}

    {#if showCancel && isActive}
      <button
        on:click={handleCancel}
        class="p-1 text-stone-400 hover:text-stone-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        title="Cancel"
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
    {/if}
  </div>
{:else if variant === 'minimal'}
  <!-- Minimal Progress -->
  <div class="space-y-1">
    {#if message}
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-stone-700 dark:text-gray-300">
          {message}
        </span>
        {#if showPercentage}
          <span class="text-sm text-stone-500 dark:text-gray-400">
            {Math.round(progressClamped)}%
          </span>
        {/if}
      </div>
    {/if}

    <div class="w-full bg-stone-200 dark:bg-gray-700 rounded-full {getSizeClasses()}">
      <div
        class="h-full rounded-full transition-all duration-300 {getStatusColor()}"
        style="width: {progressClamped}%"
      ></div>
    </div>
  </div>
{:else}
  <!-- Default Progress -->
  <div class="space-y-3">
    {#if message || showCancel}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          {#if isActive}
            <div class="animate-spin text-amber-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          {:else}
            <span class="text-lg">{getStatusIcon()}</span>
          {/if}

          {#if message}
            <span class="text-sm font-medium text-stone-900 dark:text-white">
              {message}
            </span>
          {/if}
        </div>

        <div class="flex items-center gap-3">
          {#if showPercentage}
            <span class="text-sm text-stone-500 dark:text-gray-400">
              {Math.round(progressClamped)}%
            </span>
          {/if}

          {#if showCancel && isActive}
            <button
              on:click={handleCancel}
              class="px-3 py-1 text-sm text-stone-600 hover:text-stone-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Progress Bar -->
    <div
      class="w-full bg-stone-200 dark:bg-gray-700 rounded-full {getSizeClasses()} overflow-hidden"
    >
      <div
        class="h-full rounded-full transition-all duration-300 {getStatusColor()} {isActive
          ? 'animate-pulse'
          : ''}"
        style="width: {progressClamped}%"
      ></div>
    </div>

    <!-- Status Message -->
    {#if hasError}
      <p class="text-sm text-red-600 dark:text-red-400">Operation failed. Please try again.</p>
    {:else if isComplete}
      <p class="text-sm text-green-600 dark:text-green-400">Operation completed successfully.</p>
    {/if}
  </div>
{/if}

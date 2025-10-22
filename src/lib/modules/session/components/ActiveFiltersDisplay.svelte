<script>
  import { createEventDispatcher } from 'svelte';
  import { COMMAND_TYPES } from '../utils/commandTypes.js';

  export let filters = {
    search: '',
    dateRange: 'all',
    commandTypes: []
  };

  const dispatch = createEventDispatcher();

  $: hasSearch = filters.search && filters.search.trim().length > 0;
  $: hasDateRange = filters.dateRange && filters.dateRange !== 'all';
  $: hasCommands = filters.commandTypes && filters.commandTypes.length > 0;
  $: hasAnyFilters = hasSearch || hasDateRange || hasCommands;
  $: hasMultipleFilters =
    [hasSearch, hasDateRange, hasCommands].filter(Boolean).length > 1 ||
    (hasCommands && filters.commandTypes.length > 1);

  const dateRangeLabels = {
    hour: 'Last Hour',
    day: 'Last Day',
    week: 'Last Week',
    month: 'Last Month',
    year: 'Last Year'
  };

  function removeSearch() {
    dispatch('removeFilter', { type: 'search' });
  }

  function removeDateRange() {
    dispatch('removeFilter', { type: 'dateRange' });
  }

  function removeCommand(commandType) {
    dispatch('removeFilter', { type: 'command', value: commandType });
  }

  function clearAll() {
    dispatch('clearAll');
  }

  function handleKeydown(event, action) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      action();
    }
  }
</script>

{#if hasAnyFilters}
  <div class="active-filters" role="region" aria-label="Active filters">
    <div class="filters-list">
      <!-- Search Filter -->
      {#if hasSearch}
        <div
          class="filter-tag"
          role="button"
          tabindex="0"
          aria-label="Remove search filter: {filters.search}"
          on:click={removeSearch}
          on:keydown={(e) => handleKeydown(e, removeSearch)}
        >
          <span class="filter-icon">🔍</span>
          <span class="filter-text">"{filters.search}"</span>
          <span class="remove-icon" aria-hidden="true">✕</span>
        </div>
      {/if}

      <!-- Date Range Filter -->
      {#if hasDateRange}
        <div
          class="filter-tag"
          role="button"
          tabindex="0"
          aria-label="Remove date range filter: {dateRangeLabels[filters.dateRange]}"
          on:click={removeDateRange}
          on:keydown={(e) => handleKeydown(e, removeDateRange)}
        >
          <span class="filter-icon">📅</span>
          <span class="filter-text">{dateRangeLabels[filters.dateRange]}</span>
          <span class="remove-icon" aria-hidden="true">✕</span>
        </div>
      {/if}

      <!-- Command Filters -->
      {#if hasCommands}
        {#each filters.commandTypes as commandType}
          {@const commandDef = COMMAND_TYPES[commandType]}
          <div
            class="filter-tag command-tag"
            style="--tag-color: {commandDef?.color || '#9E9E9E'}"
            role="button"
            tabindex="0"
            aria-label="Remove {commandType} command filter"
            on:click={() => removeCommand(commandType)}
            on:keydown={(e) => handleKeydown(e, () => removeCommand(commandType))}
          >
            <span class="filter-icon">{commandDef?.emoji || '📝'}</span>
            <span class="filter-text">{commandType}</span>
            <span class="remove-icon" aria-hidden="true">✕</span>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Clear All Button -->
    {#if hasMultipleFilters}
      <button class="clear-all-button" on:click={clearAll} aria-label="Clear all filters">
        Clear all
      </button>
    {/if}
  </div>
{/if}

<style>
  .active-filters {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    flex-wrap: wrap;
  }

  .filters-list {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    flex: 1;
  }

  .filter-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #f5f5f5;
    border: 1px solid #e5e5e5;
    border-radius: 16px;
    font-size: 13px;
    color: #333;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }

  .filter-tag:hover {
    background: #e5e5e5;
    border-color: #ccc;
  }

  .filter-tag:focus-visible {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  .filter-tag.command-tag {
    background: var(--tag-color);
    border-color: var(--tag-color);
    color: white;
  }

  .filter-tag.command-tag:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .filter-icon {
    font-size: 14px;
    line-height: 1;
  }

  .filter-text {
    font-weight: 500;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-icon {
    font-size: 12px;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  .filter-tag:hover .remove-icon {
    opacity: 1;
  }

  .clear-all-button {
    padding: 6px 16px;
    background: none;
    border: 1px solid #e5e5e5;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .clear-all-button:hover {
    background: #f5f5f5;
    border-color: #ccc;
    color: #333;
  }

  .clear-all-button:focus-visible {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  /* Screen reader announcements */
  @media (prefers-reduced-motion: no-preference) {
    .filter-tag {
      animation: slideIn 0.2s ease;
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .active-filters {
      padding: 8px 0;
      gap: 8px;
    }

    .filters-list {
      gap: 6px;
    }

    .filter-tag {
      padding: 5px 10px;
      font-size: 12px;
    }

    .filter-text {
      max-width: 150px;
    }

    .clear-all-button {
      padding: 5px 12px;
      font-size: 12px;
    }
  }
</style>

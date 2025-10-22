<script>
  import { createEventDispatcher } from 'svelte';
  import SearchInput from './SearchInput.svelte';
  import DateRangeFilter from './DateRangeFilter.svelte';
  import CommandFilterPanel from './CommandFilterPanel.svelte';
  import { filterStore, activeFilterCount } from '../stores/filterStore.js';

  const dispatch = createEventDispatcher();
  let isFilterPanelOpen = false;
  let selectedCommands = [];

  $: filterCount = $activeFilterCount;

  function handleSearch(event) {
    filterStore.setSearch(event.detail);
    dispatch('filterChange');
  }

  function handleDateRangeChange(event) {
    filterStore.setDateRange(event.detail);
    dispatch('filterChange');
  }

  function toggleFilterPanel() {
    isFilterPanelOpen = !isFilterPanelOpen;
  }

  function handleApplyCommands(event) {
    selectedCommands = event.detail;
    filterStore.setCommandTypes(selectedCommands);
    dispatch('filterChange');
  }

  function handleClosePanel() {
    isFilterPanelOpen = false;
  }

  // Sync selected commands with store
  $: selectedCommands = $filterStore.commandTypes || [];
</script>

<div class="session-toolbar">
  <div class="toolbar-main">
    <SearchInput
      value={$filterStore.search}
      placeholder="Search sessions..."
      on:search={handleSearch}
    />

    <DateRangeFilter selectedRange={$filterStore.dateRange} on:change={handleDateRangeChange} />

    <div class="filter-button-wrapper">
      <button
        class="filters-button"
        class:active={filterCount > 0}
        on:click={toggleFilterPanel}
        aria-label="Filter by commands"
        aria-expanded={isFilterPanelOpen}
      >
        <span class="icon">⚡</span>
        <span class="label">Commands</span>
        {#if filterCount > 0}
          <span class="badge">{filterCount}</span>
        {/if}
      </button>

      <CommandFilterPanel
        bind:isOpen={isFilterPanelOpen}
        bind:selectedCommands
        on:apply={handleApplyCommands}
        on:close={handleClosePanel}
      />
    </div>
  </div>
</div>

<style>
  .session-toolbar {
    margin-bottom: 20px;
  }

  .toolbar-main {
    display: flex;
    gap: 12px;
    align-items: stretch;
  }

  .toolbar-main > :first-child {
    flex: 1;
    max-width: 600px;
  }

  .filter-button-wrapper {
    position: relative;
  }

  .filters-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px;
    height: 44px;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    position: relative;
  }

  .filters-button:hover {
    border-color: #ccc;
    background: #fafafa;
  }

  .filters-button:focus-visible {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  .filters-button.active {
    border-color: #ff9800;
    background: #fff3e0;
    color: #ff9800;
  }

  .icon {
    font-size: 16px;
  }

  .badge {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: #ff9800;
    color: white;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
  }

  .filters-button.active .badge {
    background: white;
    color: #ff9800;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .toolbar-main {
      flex-direction: column;
      gap: 10px;
    }

    .toolbar-main > :first-child {
      max-width: none;
    }

    .filters-button {
      width: 100%;
      justify-content: center;
      padding: 0 16px;
      height: 40px;
    }
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    .toolbar-main > :first-child {
      max-width: 400px;
    }
  }
</style>

<script>
  import { createEventDispatcher } from 'svelte';

  export let selectedRange = 'all';

  const dispatch = createEventDispatcher();
  let isOpen = false;

  const ranges = [
    { value: 'hour', label: 'Last Hour' },
    { value: 'day', label: 'Last Day' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'year', label: 'Last Year' },
    { value: 'all', label: 'All Time' }
  ];

  $: selectedLabel = ranges.find((r) => r.value === selectedRange)?.label || 'All Time';

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function selectRange(value) {
    selectedRange = value;
    isOpen = false;
    dispatch('change', value);
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      isOpen = false;
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const currentIndex = ranges.findIndex((r) => r.value === selectedRange);
      const nextIndex = (currentIndex + 1) % ranges.length;
      selectRange(ranges[nextIndex].value);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = ranges.findIndex((r) => r.value === selectedRange);
      const prevIndex = (currentIndex - 1 + ranges.length) % ranges.length;
      selectRange(ranges[prevIndex].value);
    }
  }

  function handleClickOutside(event) {
    if (isOpen && !event.target.closest('.date-range-filter')) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="date-range-filter" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
  <button
    class="filter-button"
    on:click={toggleDropdown}
    on:keydown={handleKeydown}
    aria-label="Filter by date range: {selectedLabel}"
  >
    <span class="icon">📅</span>
    <span class="label">{selectedLabel}</span>
    <span class="arrow" class:open={isOpen}>▼</span>
  </button>

  {#if isOpen}
    <div class="dropdown" role="listbox" aria-label="Date range options">
      {#each ranges as range}
        <button
          class="dropdown-item"
          class:selected={range.value === selectedRange}
          on:click={() => selectRange(range.value)}
          role="option"
          aria-selected={range.value === selectedRange}
        >
          {range.label}
          {#if range.value === selectedRange}
            <span class="check">✓</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .date-range-filter {
    position: relative;
    display: inline-block;
  }

  .filter-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px;
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
  }

  .filter-button:hover {
    border-color: #ccc;
    background: #fafafa;
  }

  .filter-button:focus-visible {
    outline: 2px solid #ff9800;
    outline-offset: 2px;
  }

  .icon {
    font-size: 16px;
  }

  .arrow {
    font-size: 10px;
    transition: transform 0.2s ease;
    color: #999;
  }

  .arrow.open {
    transform: rotate(180deg);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 160px;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 100;
    overflow: hidden;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    font-size: 14px;
    color: #333;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .dropdown-item:hover {
    background: #f5f5f5;
  }

  .dropdown-item.selected {
    background: #fff3e0;
    color: #ff9800;
    font-weight: 600;
  }

  .dropdown-item:focus-visible {
    outline: 2px solid #ff9800;
    outline-offset: -2px;
  }

  .check {
    font-size: 14px;
    color: #ff9800;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .filter-button {
      padding: 0 12px;
      height: 40px;
      font-size: 13px;
    }

    .dropdown {
      min-width: 140px;
    }

    .dropdown-item {
      padding: 10px 12px;
      font-size: 13px;
    }
  }
</style>

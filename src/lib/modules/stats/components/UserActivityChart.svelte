<script>
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';

  export let timeRange = '30d';

  let loading = true;
  let error = null;
  let chartCanvas;
  let chartInstance = null;

  async function fetchData() {
    loading = true;
    error = null;
    
    try {
      const response = await fetch(`/api/stats/users?range=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user activity data');
      }
      
      const data = await response.json();
      
      if (data.dailyActivity && data.dailyActivity.length > 0) {
        // Check if data is hourly (for 1h or 1d ranges)
        const isHourly = timeRange === '1h' || timeRange === '1d';
        
        const labels = data.dailyActivity.map(day => {
          const date = new Date(day.date);
          if (isHourly) {
            // Show hour format for hourly data
            return date.toLocaleTimeString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
          } else {
            // Show date format for daily data
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
        });
        
        const activeUsers = data.dailyActivity.map(day => day.activeUsers);
        const newUsers = data.dailyActivity.map(day => day.newUsers);
        
        renderChart(labels, activeUsers, newUsers);
      } else {
        renderChart([], [], []);
      }
    } catch (err) {
      console.error('Error fetching user activity:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function renderChart(labels, activeUsers, newUsers) {
    if (chartInstance) {
      chartInstance.destroy();
    }

    if (!chartCanvas) return;

    const ctx = chartCanvas.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Active Users',
            data: activeUsers,
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'New Users',
            data: newUsers,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  let previousTimeRange = timeRange;

  onMount(() => {
    fetchData();
  });

  onDestroy(() => {
    if (chartInstance) {
      chartInstance.destroy();
    }
  });

  // Only fetch when timeRange actually changes
  $: if (timeRange !== previousTimeRange && chartCanvas) {
    previousTimeRange = timeRange;
    fetchData();
  }
</script>

<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
  <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">User Activity</h3>
  
  {#if loading}
    <div class="h-64 flex items-center justify-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  {:else if error}
    <div class="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded">
      <div class="text-center">
        <p class="text-red-500 dark:text-red-400 mb-2">{error}</p>
        <button 
          on:click={fetchData}
          class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    </div>
  {:else}
    <div class="h-64">
      <canvas bind:this={chartCanvas}></canvas>
    </div>
  {/if}
</div>

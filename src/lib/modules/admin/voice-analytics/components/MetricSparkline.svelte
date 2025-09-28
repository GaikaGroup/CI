<script>
  export let points = [];
  export let stroke = 'currentColor';
  export let label = '';
  export let value = null;
  export let valueFormatter = (val) => (typeof val === 'number' ? val.toFixed(0) : val);

  const width = 160;
  const height = 56;
  const padding = 6;

  const componentId = `spark-${Math.random().toString(36).slice(2)}`;

  const sanitizePoints = (input) =>
    (input ?? []).filter(
      (point) => point && typeof point.value === 'number' && Number.isFinite(point.value)
    );

  $: sanitized = sanitizePoints(points);
  $: values = sanitized.map((point) => point.value);
  $: min = values.length > 0 ? Math.min(...values) : 0;
  $: max = values.length > 0 ? Math.max(...values) : 0;
  $: range = max - min || 1;
  $: pathD =
    sanitized.length > 1
      ? sanitized
          .map((point, index) => {
            const x = (index / (sanitized.length - 1)) * (width - padding * 2) + padding;
            const normalized = (point.value - min) / range;
            const y = height - padding - normalized * (height - padding * 2);
            return `${index === 0 ? 'M' : 'L'}${x},${y}`;
          })
          .join(' ')
      : '';
  $: areaD =
    sanitized.length > 1
      ? `${pathD} L${width - padding},${height - padding} L${padding},${height - padding} Z`
      : '';
  $: latestValue = sanitized.length ? sanitized[sanitized.length - 1].value : value;
</script>

<div class="space-y-2">
  {#if label}
    <div class="flex items-center justify-between">
      <p class="text-sm font-medium text-stone-600 dark:text-gray-300">{label}</p>
      {#if latestValue !== undefined && latestValue !== null}
        <span class="text-sm font-semibold text-stone-900 dark:text-white">
          {valueFormatter(latestValue)}
        </span>
      {/if}
    </div>
  {/if}
  <svg
    viewBox={`0 0 ${width} ${height}`}
    class="w-full h-16"
    role="img"
    aria-label={label ? `${label} trend sparkline` : 'Metric trend sparkline'}
  >
    <defs>
      <linearGradient id={`${componentId}-gradient`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect
      x="0"
      y="0"
      {width}
      {height}
      fill={`url(#${componentId}-gradient)`}
      opacity={sanitized.length > 1 ? 1 : 0}
      class="transition-opacity duration-200"
    />
    {#if sanitized.length > 1}
      <path d={areaD} fill={`url(#${componentId}-gradient)`} class="opacity-70" />
      <path
        d={pathD}
        fill="none"
        {stroke}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    {:else}
      <line
        x1={padding}
        y1={height / 2}
        x2={width - padding}
        y2={height / 2}
        {stroke}
        stroke-width="2"
        stroke-linecap="round"
        class="opacity-50"
      />
    {/if}
  </svg>
</div>

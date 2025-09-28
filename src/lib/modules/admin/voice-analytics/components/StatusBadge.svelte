<script>
  export let status = 'unknown';
  export let label = '';

  const STATUS_STYLES = {
    healthy: {
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
      dot: 'bg-emerald-500'
    },
    degraded: {
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
      dot: 'bg-amber-500'
    },
    warning: {
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
      dot: 'bg-amber-500'
    },
    critical: {
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
      dot: 'bg-red-500'
    },
    error: {
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
      dot: 'bg-red-500'
    },
    inactive: {
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
      dot: 'bg-slate-400'
    },
    unknown: {
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
      dot: 'bg-slate-400'
    }
  };

  $: normalizedStatus = (status || 'unknown').toString().toLowerCase();
  $: style = STATUS_STYLES[normalizedStatus] ?? STATUS_STYLES.unknown;
  $: computedLabel = label || normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
</script>

<span
  class={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium gap-2 ${style.badge}`}
>
  <span class={`w-2 h-2 rounded-full ${style.dot}`} aria-hidden="true"></span>
  <span>{computedLabel}</span>
</span>

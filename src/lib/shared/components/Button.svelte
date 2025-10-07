<script>
  export let type = 'button';
  export let variant = 'primary'; // primary, secondary, text
  export let size = 'md'; // sm, md, lg
  export let disabled = false;
  export let fullWidth = false;
  export let icon = null;
  export let iconPosition = 'left'; // left, right

  // Variant classes
  const variantClasses = {
    primary: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500',
    secondary:
      'bg-stone-200 text-stone-800 hover:bg-stone-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 focus:ring-stone-400 dark:focus:ring-gray-500',
    text: 'bg-transparent hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-700 dark:text-gray-300'
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  // Compute classes
  $: classes = [
    'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
    variantClasses[variant],
    sizeClasses[size],
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    fullWidth ? 'w-full' : '',
    $$props.class
  ]
    .filter(Boolean)
    .join(' ');
</script>

<button {type} {disabled} class={classes} on:click {...$$restProps}>
  {#if icon && iconPosition === 'left'}
    <span class="mr-2">{@html icon}</span>
  {/if}

  <slot />

  {#if icon && iconPosition === 'right'}
    <span class="ml-2">{@html icon}</span>
  {/if}
</button>

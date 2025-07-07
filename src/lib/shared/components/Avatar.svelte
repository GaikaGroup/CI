<script>
  export let size = 'md'; // sm, md, lg
  export let emoji = '🤖';
  
  // Size classes
  const sizeClasses = {
    sm: {
      outer: 'w-10 h-10',
      inner: 'w-8 h-8',
      emoji: 'text-lg'
    },
    md: {
      outer: 'w-16 h-16',
      inner: 'w-14 h-14',
      emoji: 'text-2xl'
    },
    lg: {
      outer: 'w-32 h-32',
      inner: 'w-28 h-28',
      emoji: 'text-4xl'
    }
  };
</script>

<div class="{sizeClasses[size].outer} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
  <div class="{sizeClasses[size].inner} rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
    <div class="{sizeClasses[size].emoji}">{emoji}</div>
  </div>
</div>
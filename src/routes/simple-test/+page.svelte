<script>
  import SimpleMath from '$lib/components/SimpleMath.svelte';

  // Простые тесты
  const tests = [
    'Inline: \\(x^2 + 1\\)',
    'Display: \\[\\int x^2 dx = \\frac{x^3}{3} + C\\]',
    'Dollar: $x^2$',
    'Double dollar: $$\\frac{a}{b}$$'
  ];
</script>

<svelte:head>
  <title>Простой тест математики</title>
</svelte:head>

<div class="container mx-auto p-8">
  <h1 class="text-2xl font-bold mb-6">Простой тест математики</h1>

  {#each tests as test, i}
    <div class="mb-6 p-4 border rounded">
      <h2 class="font-semibold mb-2">Тест {i + 1}</h2>
      <p class="text-sm text-gray-600 mb-2">Исходник: <code>{test}</code></p>
      <div class="bg-gray-50 p-3 rounded">
        <SimpleMath content={test} />
      </div>
    </div>
  {/each}
</div>

<script>
  import SimpleMath from '$lib/components/SimpleMath.svelte';

  // Тестовые примеры с разными форматами
  const testCases = [
    {
      name: 'LaTeX inline стиль',
      content: 'Функция \\(f(x) = e^{-x^2}\\) является гауссовой.'
    },
    {
      name: 'LaTeX display стиль',
      content: 'Интеграл:\\n\\[\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\\]'
    },
    {
      name: 'Стандартный $ стиль',
      content: 'Решение: $\\frac{x^3}{3} + C$'
    },
    {
      name: 'Стандартный $$ стиль',
      content: 'Формула:\\n$$\\int x^2 dx = \\frac{x^3}{3} + C$$'
    },
    {
      name: 'Смешанный контент',
      content:
        'Для решения \\(\\int x^2 dx\\) используем правило:\\n\\[\\int x^n dx = \\frac{x^{n+1}}{n+1} + C\\]\\nПоэтому результат: \\(\\frac{x^3}{3} + C\\)'
    }
  ];
</script>

<svelte:head>
  <title>Тест математики</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-3xl font-bold mb-8">Тест рендеринга математики</h1>

  <div class="space-y-6">
    {#each testCases as testCase, i}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border">
        <h2 class="text-xl font-semibold mb-4">Тест {i + 1}: {testCase.name}</h2>

        <div class="mb-4">
          <h3 class="font-medium mb-2">Исходный текст:</h3>
          <pre
            class="text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-auto">{testCase.content}</pre>
        </div>

        <div>
          <h3 class="font-medium mb-2">Результат:</h3>
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded border">
            <SimpleMath content={testCase.content} className="text-gray-800 dark:text-gray-200" />
          </div>
        </div>
      </div>
    {/each}
  </div>

  <div
    class="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6"
  >
    <h2 class="text-xl font-semibold mb-4">Что должно работать:</h2>
    <ul class="list-disc list-inside space-y-2 text-sm">
      <li>LaTeX стиль: \\(inline\\) и \\[display\\]</li>
      <li>Стандартный стиль: $inline$ и $$display$$</li>
      <li>Дроби, интегралы, степени должны отображаться правильно</li>
      <li>Смешанный текст с математикой</li>
    </ul>
  </div>
</div>

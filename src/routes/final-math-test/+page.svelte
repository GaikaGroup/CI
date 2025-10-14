<script>
  import MathRenderer from '$lib/components/MathRenderer.svelte';

  const testMessage = `Чтобы найти все значения параметра a, при которых уравнение \\(x^2 - 4x + a = x\\) имеет ровно три различных действительных корня, мы можем рассмотреть различные случаи в зависимости от знака выражения в модуле.

1. Пусть \\(x^2 - 4x + a ≥ 0\\). Тогда модуль не влияет на уравнение, и мы получаем \\(x^2 - 4x + a = x\\).

2. Пусть \\(x^2 - 4x + a < 0\\). Тогда модуль меняет знак, и мы получаем \\(-(x^2 - 4x + a) = x\\), что эквивалентно \\(-x^2 + 4x - a = x\\).

Далее, мы можем решить оба этих уравнения и посмотреть, при каких значениях параметра a у нас будет ровно три различных действительных корня.`;
</script>

<svelte:head>
  <title>Финальный тест математики</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-2xl font-bold mb-6">Финальный тест математики</h1>
  
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border">
    <h2 class="text-lg font-semibold mb-4">Тест сообщения с математикой:</h2>
    <MathRenderer content={testMessage} />
  </div>
  
  <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
    <h3 class="font-semibold mb-2">Что должно работать:</h3>
    <ul class="text-sm space-y-1">
      <li>• Математические выражения в \\( \\) должны отображаться как формулы</li>
      <li>• Текст должен быть читаемым с правильными пробелами</li>
      <li>• Никакой анимации по буквам</li>
      <li>• Красивое форматирование</li>
    </ul>
  </div>
</div>
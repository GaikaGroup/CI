<script>
  import MathRenderer from '$lib/components/MathRenderer.svelte';

  const testMessage = `На доске написаны числа 1, 2, ..., n. За один ход можно выбрать любые два числа a и b, стереть их и вместо них записать число a + b + ab. После n - 1 ходов на доске останется одно число. Найдите это число (в зависимости от n).

**Решение (инвариант)**

Заметим тождество

\\[a + b + ab = (a + 1)(b + 1) - 1.\\]

Рассмотрим величину

\\[I = \\prod(x_i + 1),\\]

где произведение берётся по всем текущим числам на доске.

Если мы заменили пару a, b одним числом c = a + b + ab, то

\\[(a + 1)(b + 1) \\longrightarrow c + 1 = (a + 1)(b + 1),\\]

то есть произведение I не меняется — это инвариант.

Изначально на доске 1, 2, ..., n, поэтому

\\[I_{\\text{нач}} = \\prod_{k=1}^{n}(k + 1) = 2 \\cdot 3 \\cdot \\ldots \\cdot (n + 1) = (n + 1)!.\\]

В конце останется одно число X. Тогда инвариант равен X + 1. Следовательно,

\\[X + 1 = (n + 1)! \\quad \\Rightarrow \\quad X = (n + 1)! - 1.\\]

**Ответ:** \\((n + 1)! - 1\\).`;
</script>

<svelte:head>
  <title>Тест математики в чате</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-3xl font-bold mb-8 text-center">Тест математики в стиле чата</h1>

  <!-- Имитация сообщения в чате -->
  <div class="flex mb-3 justify-start">
    <div class="max-w-[70%] px-4 py-3 rounded-2xl shadow-sm bg-stone-100 text-stone-800 rounded-bl-sm">
      <div class="text-sm leading-relaxed">
        <MathRenderer content={testMessage} className="whitespace-pre-wrap" />
      </div>
      <div class="flex items-center justify-between text-xs mt-2 text-stone-500">
        <span class="opacity-75">12:34 PM</span>
      </div>
    </div>
  </div>

  <!-- Сравнение с beautiful-math-test стилем -->
  <div class="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
    <h2 class="text-2xl font-semibold mb-6 text-blue-600 dark:text-blue-400">
      Для сравнения - стиль beautiful-math-test
    </h2>
    <div class="prose prose-lg max-w-none dark:prose-invert">
      <MathRenderer content={testMessage} />
    </div>
  </div>
</div>
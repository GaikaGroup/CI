<script>
  import SimpleMath from '$lib/components/SimpleMath.svelte';

  // Тест с примером, похожим на ваш скриншот
  const problemExample = `На доске написаны числа 1, 2, ..., n. За один ход можно выбрать любые два числа a и b, стереть их и вместо них записать число a + b + ab. После n - 1 ходов на доске останется одно число. Найдите это число (в зависимости от n).

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

  const otherExamples = [
    {
      title: 'Квадратное уравнение',
      content: `Решим уравнение ax^2 + bx + c = 0.

Дискриминант: D = b^2 - 4ac

Корни: \\[x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}\\]`
    },
    {
      title: 'Интегрирование по частям',
      content: `Формула интегрирования по частям:

\\[\\int u \\, dv = uv - \\int v \\, du\\]

Пример: \\(\\int x e^x dx\\)

Пусть u = x, dv = e^x dx, тогда du = dx, v = e^x

\\[\\int x e^x dx = x e^x - \\int e^x dx = x e^x - e^x + C = e^x(x - 1) + C\\]`
    },
    {
      title: 'Предел последовательности',
      content: `Найдем предел:

\\[\\lim_{n \\to \\infty} \\frac{n^2 + 3n + 1}{2n^2 - n + 5}\\]

Разделим числитель и знаменатель на n^2:

\\[\\lim_{n \\to \\infty} \\frac{1 + \\frac{3}{n} + \\frac{1}{n^2}}{2 - \\frac{1}{n} + \\frac{5}{n^2}} = \\frac{1 + 0 + 0}{2 - 0 + 0} = \\frac{1}{2}\\]`
    }
  ];
</script>

<svelte:head>
  <title>Красивая математика</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-3xl font-bold mb-8 text-center">Красивое отображение математики</h1>

  <!-- Основной пример -->
  <div
    class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 border border-gray-200 dark:border-gray-700"
  >
    <h2 class="text-2xl font-semibold mb-6 text-blue-600 dark:text-blue-400">
      Пример задачи с инвариантом
    </h2>
    <div class="prose prose-lg max-w-none dark:prose-invert">
      <SimpleMath content={problemExample} />
    </div>
  </div>

  <!-- Другие примеры -->
  <div class="grid gap-6">
    {#each otherExamples as example}
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
          {example.title}
        </h3>
        <div class="prose max-w-none dark:prose-invert">
          <SimpleMath content={example.content} />
        </div>
      </div>
    {/each}
  </div>

  <!-- Информация о улучшениях -->
  <div
    class="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800"
  >
    <h2 class="text-2xl font-semibold mb-6 text-blue-800 dark:text-blue-200">
      ✨ Улучшения форматирования
    </h2>

    <div class="grid md:grid-cols-2 gap-6">
      <div>
        <h3 class="font-semibold mb-3 text-blue-700 dark:text-blue-300">Визуальные улучшения:</h3>
        <ul class="space-y-2 text-sm text-blue-600 dark:text-blue-400">
          <li>• Красивые фоны для display математики</li>
          <li>• Улучшенная типографика и интервалы</li>
          <li>• Плавные анимации появления</li>
          <li>• Адаптивный дизайн для мобильных</li>
          <li>• Поддержка темной темы</li>
        </ul>
      </div>

      <div>
        <h3 class="font-semibold mb-3 text-blue-700 dark:text-blue-300">
          Функциональные улучшения:
        </h3>
        <ul class="space-y-2 text-sm text-blue-600 dark:text-blue-400">
          <li>• Автоматическое определение математики</li>
          <li>• Улучшенная обработка дробей и степеней</li>
          <li>• Лучшее отображение больших операторов</li>
          <li>• Поддержка сложных выражений</li>
          <li>• Красивые стили ошибок</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  .prose {
    line-height: 1.8;
  }

  .prose h1,
  .prose h2,
  .prose h3 {
    margin-top: 2em;
    margin-bottom: 1em;
  }

  .prose p {
    margin-bottom: 1.5em;
  }
</style>

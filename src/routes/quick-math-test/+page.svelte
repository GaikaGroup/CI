<script>
  import SimpleMath from '$lib/components/SimpleMath.svelte';

  const testContent = `Шаг индукции: предположим, что для некоторого n = k формула k² - k + 1 выполняется. Докажем для n = k + 1.

После k шагов на доске останется число \\(k^2 - k + 1\\).

Формула: \\[F(n) = n^2 - n + 1\\]

Проверим для n = 3: \\(F(3) = 3^2 - 3 + 1 = 9 - 3 + 1 = 7\\)`;
</script>

<svelte:head>
  <title>Быстрый тест математики</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-2xl font-bold mb-6">Быстрый тест математики</h1>

  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border">
    <SimpleMath content={testContent} />
  </div>

  <div class="mt-6 text-sm text-gray-600 dark:text-gray-400">
    Если вы видите правильно отформатированный текст с математическими формулами - все работает!
  </div>
</div>

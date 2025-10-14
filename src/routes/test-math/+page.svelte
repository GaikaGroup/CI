<script>
  import SimpleMath from '$lib/components/SimpleMath.svelte';
  import { sampleMathResponse } from '$lib/modules/chat/test/mathTest.js';

  const testMessage = sampleMathResponse;
</script>

<svelte:head>
  <title>Math Formula Test</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-3xl font-bold mb-8">Mathematical Formula Rendering Test</h1>

  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border">
    <h2 class="text-xl font-semibold mb-4">Test Response:</h2>
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <SimpleMath content={testMessage} className="text-gray-800 dark:text-gray-200" />
    </div>
  </div>

  <div class="mt-8 bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
    <h3 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">Expected Results:</h3>
    <ul class="text-blue-700 dark:text-blue-300 space-y-1">
      <li>• Integrals should render with proper ∫ symbol</li>
      <li>• Fractions should display as proper mathematical fractions</li>
      <li>• Powers (x^2, x^3) should render as superscripts</li>
      <li>• Equations should be centered and properly formatted</li>
    </ul>
  </div>
</div>

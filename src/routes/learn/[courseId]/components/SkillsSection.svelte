<script>
  import { CheckCircle } from 'lucide-svelte';

  export let skills = [];
</script>

{#if skills && skills.length > 0}
  <section class="bg-white rounded-2xl shadow-sm p-8">
    <div class="flex items-center space-x-3 mb-6">
      <CheckCircle class="w-8 h-8 text-orange-500" />
      <h2 class="text-3xl font-bold text-gray-900">What You'll Learn</h2>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each skills as skill}
        <div class="flex items-start space-x-3 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
          <CheckCircle class="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <span class="text-gray-800">{skill}</span>
        </div>
      {/each}
    </div>
  </section>
{/if}

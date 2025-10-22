<script>
  import { Award, MessageSquare } from 'lucide-svelte';

  export let agents = [];
</script>

{#if agents && agents.length > 0}
  <section class="bg-white rounded-2xl shadow-sm p-8">
    <div class="flex items-center space-x-3 mb-8">
      <Award class="w-8 h-8 text-orange-500" />
      <h2 class="text-3xl font-bold text-gray-900">Your Instructors</h2>
    </div>
    <div class="space-y-6">
      {#each agents as instructor}
        <div
          class="p-6 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl hover:shadow-md transition-shadow"
        >
          <div class="flex items-start space-x-4">
            <div
              class="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <MessageSquare class="w-8 h-8 text-orange-600" />
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900 mb-1">{instructor.name}</h3>
              <p class="text-orange-600 font-medium mb-3">{instructor.role || 'AI Instructor'}</p>
              <p class="text-gray-700 mb-3">{instructor.description}</p>
              <div class="flex items-center space-x-4 text-sm text-gray-600">
                <span class="px-3 py-1 bg-white rounded-full">
                  Tone: {instructor.tone || 'Professional'}
                </span>
                <span class="px-3 py-1 bg-white rounded-full">
                  Formality: {instructor.formality || 'Adaptive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}

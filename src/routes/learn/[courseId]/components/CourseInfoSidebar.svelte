<script>
  import { CheckCircle } from 'lucide-svelte';

  export let level = '';
  export let language = '';
  export let studentCount = 0;
  export let agentCount = 0;
  export let enrolled = false;
  export let onEnroll = () => {};
</script>

<div class="sticky top-8 space-y-6">
  <!-- Course Info Card -->
  <div class="bg-white rounded-2xl shadow-lg p-6">
    <h3 class="text-xl font-bold text-gray-900 mb-4">Course Information</h3>
    <div class="space-y-4">
      <div class="flex items-center justify-between py-3 border-b border-gray-100">
        <span class="text-gray-600">Level</span>
        <span class="font-semibold text-gray-900">{level}</span>
      </div>
      <div class="flex items-center justify-between py-3 border-b border-gray-100">
        <span class="text-gray-600">Language</span>
        <span class="font-semibold text-gray-900">{language}</span>
      </div>
      <div class="flex items-center justify-between py-3 border-b border-gray-100">
        <span class="text-gray-600">Students</span>
        <span class="font-semibold text-gray-900">{studentCount}</span>
      </div>
      <div class="flex items-center justify-between py-3">
        <span class="text-gray-600">AI Agents</span>
        <span class="font-semibold text-gray-900">{agentCount}</span>
      </div>
    </div>
    <button
      on:click={onEnroll}
      class="w-full mt-6 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
    >
      {enrolled ? 'Continue Learning' : 'Enroll in Course'}
    </button>
  </div>

  <!-- Features -->
  <div class="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6">
    <h3 class="text-lg font-bold text-gray-900 mb-4">What's Included</h3>
    <div class="space-y-3">
      <div class="flex items-center space-x-3 text-gray-700">
        <CheckCircle class="w-5 h-5 text-orange-500" />
        <span>Access to AI mentors</span>
      </div>
      <div class="flex items-center space-x-3 text-gray-700">
        <CheckCircle class="w-5 h-5 text-orange-500" />
        <span>Learning materials</span>
      </div>
      <div class="flex items-center space-x-3 text-gray-700">
        <CheckCircle class="w-5 h-5 text-orange-500" />
        <span>Practical assignments</span>
      </div>
      <div class="flex items-center space-x-3 text-gray-700">
        <CheckCircle class="w-5 h-5 text-orange-500" />
        <span>Learn at your own pace</span>
      </div>
    </div>
  </div>
</div>

<script>
  import { BookOpen, Globe, Users } from 'lucide-svelte';

  export let courseName = '';
  export let description = '';
  export let level = '';
  export let language = '';
  export let studentCount = 0;
  export let enrolled = false;
  export let onEnroll = () => {};
</script>

<div class="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="max-w-3xl">
      <div class="flex items-center space-x-3 mb-4">
        <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
          {level}
        </span>
        <div class="flex items-center space-x-2">
          <Globe class="w-4 h-4" />
          <span class="text-sm">{language}</span>
        </div>
      </div>
      
      <h1 class="text-5xl font-bold mb-6">{courseName}</h1>
      
      <p class="text-xl mb-8 text-white/90">{description}</p>
      
      <div class="flex items-center space-x-4">
        <button
          on:click={onEnroll}
          class="px-8 py-4 bg-white text-orange-500 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-all transform hover:scale-105 shadow-lg"
        >
          {enrolled ? 'Start Learning' : 'Enroll in Course'}
        </button>
        <div class="flex items-center space-x-2 text-white/90">
          <Users class="w-5 h-5" />
          <span>{studentCount} students</span>
        </div>
      </div>
    </div>
  </div>
</div>

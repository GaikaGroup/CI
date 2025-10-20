<script>
  import { MessageSquare, FileText, Users } from 'lucide-svelte';
</script>

<section class="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl shadow-lg p-8 text-white">
  <h2 class="text-3xl font-bold mb-6">Learning Format</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6">
      <MessageSquare class="w-12 h-12 mb-4" />
      <h3 class="text-xl font-semibold mb-2">AI Assistants</h3>
      <p class="text-white/90">Personal AI mentors available 24/7</p>
    </div>
    <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6">
      <FileText class="w-12 h-12 mb-4" />
      <h3 class="text-xl font-semibold mb-2">Materials</h3>
      <p class="text-white/90">All necessary learning materials included</p>
    </div>
    <div class="bg-white/10 backdrop-blur-sm rounded-xl p-6">
      <Users class="w-12 h-12 mb-4" />
      <h3 class="text-xl font-semibold mb-2">Practice</h3>
      <p class="text-white/90">Interactive exercises and assignments</p>
    </div>
  </div>
</section>

<script>
  import CourseHero from './CourseHero.svelte';
  import CourseInfoSidebar from './CourseInfoSidebar.svelte';
  import InstructorProfiles from './InstructorProfiles.svelte';
  import SkillsSection from './SkillsSection.svelte';
  import LearningFormatSection from './LearningFormatSection.svelte';

  export let course = null;
  export let enrolled = false;
  export let studentCount = 0;
  export let onEnroll = () => {};
  export let onStartLearning = () => {};

  $: agentCount = course?.agents?.length || 0;
</script>

<div class="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
  <!-- Hero Section -->
  <CourseHero
    courseName={course?.name || ''}
    description={course?.description || ''}
    level={course?.level || 'Beginner'}
    language={course?.language || 'English'}
    {studentCount}
    {enrolled}
    {onEnroll}
  />

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left Column - Main Content -->
      <div class="lg:col-span-2 space-y-12">
        <!-- Description -->
        <section class="bg-white rounded-2xl shadow-sm p-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-6">About the Course</h2>
          <div class="prose prose-lg text-gray-700">
            <p>{course?.description || ''}</p>
          </div>
        </section>

        <!-- Skills Covered -->
        <SkillsSection skills={course?.skills || []} />

        <!-- Instructors -->
        <InstructorProfiles agents={course?.agents || []} />

        <!-- Learning Format -->
        <LearningFormatSection />
      </div>

      <!-- Right Column - Sidebar -->
      <div class="lg:col-span-1">
        <CourseInfoSidebar
          level={course?.level || 'Beginner'}
          language={course?.language || 'English'}
          {studentCount}
          {agentCount}
          {enrolled}
          {onEnroll}
        />
      </div>
    </div>
  </div>
</div>

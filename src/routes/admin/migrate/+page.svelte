<!--
  Migration Page for Admin
  
  This page provides a UI for migrating localStorage data to database
-->

<script>
  import { onMount } from 'svelte';
  import { user } from '$modules/auth/stores';
  import { goto } from '$app/navigation';

  let migrationStatus = 'idle'; // idle, running, success, error
  let migrationLog = [];
  let migrationError = null;
  let localStorageData = {};
  let migrationStats = {
    courses: 0,
    enrollments: 0,
    preferences: 0,
    reports: 0,
    logs: 0
  };

  onMount(() => {
    // Check if user is admin
    if (!$user || $user.type !== 'admin') {
      goto('/');
      return;
    }

    // Load localStorage data for preview
    loadLocalStorageData();
  });

  function loadLocalStorageData() {
    const keys = [
      'learnModeCourses',
      'learnModeSubjects', 
      'userEnrollments',
      'courseEnrollments',
      'subjectEnrollments',
      'adminSubjects',
      'adminCourses',
      'moderationQueue',
      'moderationData',
      'errorLog',
      'theme',
      'language'
    ];

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          localStorageData[key] = JSON.parse(value);
        } catch (e) {
          localStorageData[key] = value;
        }
      }
    });

    localStorageData = { ...localStorageData };
  }

  function addLog(message, type = 'info') {
    migrationLog = [...migrationLog, {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }];
  }

  async function migrateCourses() {
    addLog('🔄 Starting courses migration...');
    
    const courses = [
      ...(localStorageData.learnModeCourses || []),
      ...(localStorageData.learnModeSubjects || [])
    ];

    let migratedCount = 0;

    for (const course of courses) {
      try {
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: course.name || 'Untitled Course',
            description: course.description || null,
            language: course.language || 'en',
            level: course.level || 'beginner',
            skills: course.skills || [],
            settings: course.settings || {},
            practice: course.practice || null,
            exam: course.exam || null,
            agents: course.agents || [],
            orchestrationAgent: course.orchestrationAgent || null,
            materials: course.materials || [],
            llmSettings: course.llmSettings || {}
          })
        });

        if (response.ok) {
          migratedCount++;
          addLog(`✅ Migrated course: "${course.name}"`, 'success');
        } else {
          const error = await response.json();
          addLog(`⚠️ Failed to migrate course "${course.name}": ${error.message}`, 'warning');
        }
      } catch (error) {
        addLog(`❌ Error migrating course "${course.name}": ${error.message}`, 'error');
      }
    }

    migrationStats.courses = migratedCount;
    addLog(`🎉 Migrated ${migratedCount} courses successfully`, 'success');
  }

  async function migrateEnrollments() {
    addLog('🔄 Starting enrollments migration...');
    
    const enrollments = [
      ...(localStorageData.userEnrollments || []),
      ...(localStorageData.courseEnrollments || []),
      ...(localStorageData.subjectEnrollments || [])
    ];

    let migratedCount = 0;

    for (const enrollment of enrollments) {
      try {
        const response = await fetch('/api/enrollments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: enrollment.courseId || enrollment.subjectId
          })
        });

        if (response.ok) {
          migratedCount++;
          addLog(`✅ Migrated enrollment for course ${enrollment.courseId || enrollment.subjectId}`, 'success');
        } else {
          const error = await response.json();
          addLog(`⚠️ Failed to migrate enrollment: ${error.message}`, 'warning');
        }
      } catch (error) {
        addLog(`❌ Error migrating enrollment: ${error.message}`, 'error');
      }
    }

    migrationStats.enrollments = migratedCount;
    addLog(`🎉 Migrated ${migratedCount} enrollments successfully`, 'success');
  }

  async function migratePreferences() {
    addLog('🔄 Starting preferences migration...');
    
    const preferences = {};
    
    if (localStorageData.theme) {
      preferences.theme = localStorageData.theme;
    }
    
    if (localStorageData.language) {
      preferences.language = localStorageData.language;
    }

    if (Object.keys(preferences).length > 0) {
      try {
        const response = await fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences })
        });

        if (response.ok) {
          migrationStats.preferences = Object.keys(preferences).length;
          addLog(`✅ Migrated ${Object.keys(preferences).length} preferences`, 'success');
        } else {
          const error = await response.json();
          addLog(`❌ Failed to migrate preferences: ${error.message}`, 'error');
        }
      } catch (error) {
        addLog(`❌ Error migrating preferences: ${error.message}`, 'error');
      }
    } else {
      addLog('ℹ️ No preferences to migrate', 'info');
    }
  }

  async function runMigration() {
    migrationStatus = 'running';
    migrationLog = [];
    migrationError = null;

    try {
      addLog('🚀 Starting localStorage to database migration...', 'info');
      
      await migrateCourses();
      await migrateEnrollments();
      await migratePreferences();
      
      migrationStatus = 'success';
      addLog('🎉 Migration completed successfully!', 'success');
      
    } catch (error) {
      migrationStatus = 'error';
      migrationError = error.message;
      addLog(`❌ Migration failed: ${error.message}`, 'error');
    }
  }

  function clearLocalStorage() {
    const keysToRemove = [
      'learnModeCourses',
      'learnModeSubjects',
      'userEnrollments',
      'courseEnrollments',
      'subjectEnrollments',
      'adminSubjects',
      'adminCourses',
      'moderationQueue',
      'moderationData',
      'errorLog'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    addLog('🧹 Cleared localStorage data', 'success');
    loadLocalStorageData();
  }

  function downloadBackup() {
    const backup = {
      timestamp: new Date().toISOString(),
      data: localStorageData
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Data Migration - Admin</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">Data Migration Tool</h1>
    
    <!-- Migration Status -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Migration Status</h2>
      
      <div class="flex items-center space-x-4 mb-4">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 rounded-full {migrationStatus === 'idle' ? 'bg-gray-400' : migrationStatus === 'running' ? 'bg-yellow-400' : migrationStatus === 'success' ? 'bg-green-400' : 'bg-red-400'}"></div>
          <span class="capitalize">{migrationStatus}</span>
        </div>
        
        {#if migrationStatus === 'running'}
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        {/if}
      </div>

      <!-- Migration Stats -->
      {#if migrationStatus === 'success'}
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{migrationStats.courses}</div>
            <div class="text-sm text-gray-600">Courses</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{migrationStats.enrollments}</div>
            <div class="text-sm text-gray-600">Enrollments</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{migrationStats.preferences}</div>
            <div class="text-sm text-gray-600">Preferences</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{migrationStats.reports}</div>
            <div class="text-sm text-gray-600">Reports</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{migrationStats.logs}</div>
            <div class="text-sm text-gray-600">Logs</div>
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex space-x-4">
        <button
          on:click={runMigration}
          disabled={migrationStatus === 'running'}
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
        >
          {migrationStatus === 'running' ? 'Migrating...' : 'Start Migration'}
        </button>
        
        <button
          on:click={downloadBackup}
          class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          Download Backup
        </button>
        
        {#if migrationStatus === 'success'}
          <button
            on:click={clearLocalStorage}
            class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Clear localStorage
          </button>
        {/if}
      </div>
    </div>

    <!-- Migration Log -->
    {#if migrationLog.length > 0}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Migration Log</h2>
        
        <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {#each migrationLog as log}
            <div class="mb-1 {log.type === 'error' ? 'text-red-400' : log.type === 'warning' ? 'text-yellow-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-300'}">
              [{log.timestamp}] {log.message}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- localStorage Preview -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">localStorage Data Preview</h2>
      
      {#if Object.keys(localStorageData).length > 0}
        <div class="space-y-4">
          {#each Object.entries(localStorageData) as [key, value]}
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 class="font-medium mb-2">{key}</h3>
              <pre class="bg-gray-100 dark:bg-gray-900 p-2 rounded text-sm overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-gray-600 dark:text-gray-400">No data found in localStorage</p>
      {/if}
    </div>
  </div>
</div>
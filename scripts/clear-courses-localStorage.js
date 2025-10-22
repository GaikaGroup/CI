/**
 * Browser console script to completely clear course catalog and enrollments
 * Copy and paste this into your browser's developer console
 * when you're on the application page
 */

console.log('🧹 Starting complete course catalog and enrollment cleanup...');

// 1. Clear main course storage
localStorage.removeItem('learnModeCourses');
localStorage.removeItem('learnModeSubjects');
console.log('✅ Removed course storage');

// 2. Clear enrollment data (this is what causes the statistics to show)
localStorage.removeItem('userEnrollments');
localStorage.removeItem('courseEnrollments');
console.log('✅ Cleared enrollment data');

// 3. Clear all course-related storage
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (
    key &&
    (key.includes('course') ||
      key.includes('Course') ||
      key.includes('subject') ||
      key.includes('Subject') ||
      key.includes('enrollment') ||
      key.includes('Enrollment'))
  ) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach((key) => {
  localStorage.removeItem(key);
  console.log(`✅ Removed: ${key}`);
});

// 4. Clear admin and moderation data
localStorage.removeItem('adminSubjects');
localStorage.removeItem('adminCourses');
localStorage.removeItem('moderationQueue');
localStorage.removeItem('moderationData');
console.log('✅ Cleared admin and moderation data');

// 5. Set empty arrays to prevent auto-restoration
localStorage.setItem('learnModeCourses', '[]');
localStorage.setItem('learnModeSubjects', '[]');
localStorage.setItem('userEnrollments', '[]');
console.log('✅ Set empty arrays to prevent auto-restoration');

// 6. Clear any cached data
if (typeof window !== 'undefined') {
  try {
    // Clear any window-level cached data
    if (window.coursesStore) {
      window.coursesStore.set([]);
      console.log('✅ Cleared courses store');
    }
    if (window.enrollmentStore) {
      window.enrollmentStore.initialize(null);
      console.log('✅ Reset enrollment store');
    }
  } catch (e) {
    console.log('ℹ️ Could not access stores directly');
  }
}

console.log('');
console.log('🎉 Complete cleanup finished!');
console.log('📊 All course and enrollment data cleared');
console.log('🔄 Refreshing page to see empty catalog...');
console.log('');

// Force reload to ensure all stores are reinitialized
window.location.reload(true);

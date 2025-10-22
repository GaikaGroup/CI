/**
 * FINAL CLEANUP SCRIPT
 * This script completely clears all course and enrollment data
 * Copy and paste this into your browser's developer console
 */

console.log('🧹 FINAL CLEANUP - Clearing ALL course data...');

// 1. Clear ALL localStorage
console.log('🗑️ Clearing localStorage...');
const allKeys = Object.keys(localStorage);
console.log('Found localStorage keys:', allKeys);

// Remove all course/subject/enrollment related keys
const keysToRemove = allKeys.filter(
  (key) =>
    key.includes('course') ||
    key.includes('Course') ||
    key.includes('subject') ||
    key.includes('Subject') ||
    key.includes('enrollment') ||
    key.includes('Enrollment') ||
    key.includes('learn') ||
    key.includes('Learn')
);

console.log('Removing keys:', keysToRemove);
keysToRemove.forEach((key) => {
  localStorage.removeItem(key);
  console.log(`✅ Removed: ${key}`);
});

// 2. Force set empty arrays for all possible keys
console.log('🔧 Setting empty arrays...');
localStorage.setItem('learnModeCourses', '[]');
localStorage.setItem('learnModeSubjects', '[]');
localStorage.setItem('userEnrollments', '[]');
localStorage.setItem('courseEnrollments', '[]');

// 3. Clear any cached data in memory
console.log('💾 Clearing memory cache...');
if (typeof window !== 'undefined') {
  // Clear any global variables that might cache course data
  if (window.coursesStore) {
    try {
      window.coursesStore.set([]);
      console.log('✅ Cleared window.coursesStore');
    } catch (e) {
      console.log('ℹ️ Could not clear window.coursesStore');
    }
  }

  if (window.subjectsStore) {
    try {
      window.subjectsStore.set([]);
      console.log('✅ Cleared window.subjectsStore');
    } catch (e) {
      console.log('ℹ️ Could not clear window.subjectsStore');
    }
  }

  if (window.enrollmentStore) {
    try {
      window.enrollmentStore.initialize(null);
      console.log('✅ Reset window.enrollmentStore');
    } catch (e) {
      console.log('ℹ️ Could not reset window.enrollmentStore');
    }
  }
}

// 4. Clear browser cache for this domain (if possible)
console.log('🌐 Attempting to clear cache...');
if ('caches' in window) {
  caches
    .keys()
    .then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
      console.log('✅ Cleared browser cache');
    })
    .catch((e) => {
      console.log('ℹ️ Could not clear browser cache');
    });
}

console.log('');
console.log('🎉 FINAL CLEANUP COMPLETE!');
console.log('📊 All course and enrollment data should be cleared');
console.log('🔄 Force reloading page with cache bypass...');
console.log('');

// 5. Force reload with cache bypass
setTimeout(() => {
  // Use location.reload(true) for hard refresh, or window.location.href for complete reload
  window.location.href = window.location.href + '?t=' + Date.now();
}, 1000);

/**
 * Browser console script to enable test mode
 * This prevents automatic loading of default courses
 * Copy and paste this into your browser's developer console
 */

console.log('🧪 Enabling test mode...');

// Set test mode flag
localStorage.setItem('testMode', 'true');
localStorage.setItem('skipDefaultCourses', 'true');

// Clear all course data
localStorage.removeItem('learnModeCourses');
localStorage.removeItem('learnModeSubjects');

// Set empty arrays
localStorage.setItem('learnModeCourses', '[]');
localStorage.setItem('learnModeSubjects', '[]');

// Clear enrollment data
localStorage.removeItem('userEnrollments');
localStorage.removeItem('courseEnrollments');

// Clear admin data
localStorage.removeItem('adminSubjects');
localStorage.removeItem('adminCourses');
localStorage.removeItem('moderationQueue');
localStorage.removeItem('moderationData');

console.log('✅ Test mode enabled');
console.log('✅ All course data cleared');
console.log('🔄 Refresh the page to see empty catalog');

// Optionally reload the page
window.location.reload();

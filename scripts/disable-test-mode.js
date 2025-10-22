/**
 * Browser console script to disable test mode
 * This restores normal course loading behavior
 * Copy and paste this into your browser's developer console
 */

console.log('🔄 Disabling test mode...');

// Remove test mode flags
localStorage.removeItem('testMode');
localStorage.removeItem('skipDefaultCourses');

// Clear empty arrays
localStorage.removeItem('learnModeCourses');
localStorage.removeItem('learnModeSubjects');

console.log('✅ Test mode disabled');
console.log('✅ Default courses will be restored on next page load');
console.log('🔄 Refresh the page to see default courses');

// Optionally reload the page
window.location.reload();

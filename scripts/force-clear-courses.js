#!/usr/bin/env node

/**
 * Force clear all course data from localStorage and reset the application
 */

console.log('🧹 Force clearing all course data...');

// This script will generate JavaScript code to run in browser console
const browserScript = `
// Force clear all course-related data
console.log('🧹 Force clearing all course data...');

// Clear main storage keys
localStorage.removeItem('learnModeCourses');
localStorage.removeItem('learnModeSubjects');

// Clear all course-related keys
const allKeys = Object.keys(localStorage);
const courseKeys = allKeys.filter(key => 
  key.toLowerCase().includes('course') || 
  key.toLowerCase().includes('subject') ||
  key.toLowerCase().includes('enrollment') ||
  key.toLowerCase().includes('admin') ||
  key.toLowerCase().includes('moderation')
);

courseKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log('✅ Removed:', key);
});

// Set empty arrays to prevent auto-restoration
localStorage.setItem('learnModeCourses', '[]');
localStorage.setItem('learnModeSubjects', '[]');

console.log('✅ All course data cleared');
console.log('🔄 Reloading page...');

// Force reload
window.location.reload(true);
`;

console.log('📋 Copy and paste this code into your browser console:');
console.log('=' .repeat(60));
console.log(browserScript);
console.log('=' .repeat(60));
console.log('');
console.log('Or run this in your browser:');
console.log('1. Open Developer Tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Paste the code above');
console.log('4. Press Enter');
console.log('');
console.log('✨ The page will reload with empty course catalog!');
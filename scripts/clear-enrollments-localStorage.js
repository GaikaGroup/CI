/**
 * Clear Enrollments localStorage Script
 * 
 * This script clears enrollment data from localStorage to reset the badge count.
 * Run this in the browser console to clear old enrollment data.
 */

console.log('🧹 Clearing enrollment data from localStorage...');

// Clear enrollment data
const keysToRemove = [
  'userEnrollments',
  'enrollmentStore',
  'courseEnrollments',
  'subjectEnrollments'
];

let clearedCount = 0;

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Cleared: ${key}`);
    clearedCount++;
  }
});

// Also check for any keys that might contain enrollment data
const allKeys = Object.keys(localStorage);
const enrollmentKeys = allKeys.filter(key =>
  key.toLowerCase().includes('enrollment') ||
  key.toLowerCase().includes('course') ||
  key.toLowerCase().includes('subject')
);

enrollmentKeys.forEach(key => {
  if (!keysToRemove.includes(key)) {
    console.log(`🔍 Found potential enrollment key: ${key}`);
    console.log(`   Value: ${localStorage.getItem(key)}`);
  }
});

if (clearedCount === 0) {
  console.log('ℹ️  No enrollment data found in localStorage');
} else {
  console.log(`✨ Cleared ${clearedCount} enrollment keys from localStorage`);
  console.log('🔄 Please refresh the page to see the changes');
}

// Show current localStorage contents for debugging
console.log('\n📋 Current localStorage contents:');
Object.keys(localStorage).forEach(key => {
  console.log(`  ${key}: ${localStorage.getItem(key)}`);
});
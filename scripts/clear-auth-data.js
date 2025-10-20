#!/usr/bin/env node

/**
 * Script to clear old authentication data from localStorage and cookies
 * Run this in browser console or create a page to execute it
 */

console.log('🧹 Clearing old authentication data...');

// Clear localStorage
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  localStorage.removeItem('auth_token');
  console.log('✅ Cleared localStorage');
}

// Clear sessionStorage
if (typeof sessionStorage !== 'undefined') {
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('auth_token');
  console.log('✅ Cleared sessionStorage');
}

// Clear cookies
if (typeof document !== 'undefined') {
  document.cookie = 'user=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'authToken=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax';
  console.log('✅ Cleared cookies');
}

console.log('🎉 Authentication data cleared! Please refresh the page and log in again.');
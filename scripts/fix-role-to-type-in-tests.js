#!/usr/bin/env node

/**
 * Script to replace all role references with type in test files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  'tests/e2e/admin/ConsoleNavigation.test.js',
  'tests/e2e/admin/AdminSessionManagement.test.js',
  'tests/auth/stores.test.js',
  'tests/unit/api/users-endpoints.test.js',
  'tests/unit/admin/UsersPage.test.js',
  'tests/unit/auth/adminUtils.test.js',
  'tests/integration/api/courses.test.js',
  'tests/integration/admin/UsersPageFlow.test.js',
  'tests/integration/admin/AdminSessionsAPI.test.js'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace role: 'admin' with type: 'admin'
  content = content.replace(/role: 'admin'/g, "type: 'admin'");
  
  // Replace role: 'student' with type: 'regular'
  content = content.replace(/role: 'student'/g, "type: 'regular'");
  
  // Replace role: 'teacher' with type: 'regular'
  content = content.replace(/role: 'teacher'/g, "type: 'regular'");
  
  // Replace { role: null } with { type: null }
  content = content.replace(/role: null/g, "type: null");
  
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Fixed: ${filePath}`);
}

console.log('🔧 Fixing role references in test files...');

testFiles.forEach(fixFile);

console.log('🎉 All test files updated!');
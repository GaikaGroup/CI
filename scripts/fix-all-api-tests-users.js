#!/usr/bin/env node

/**
 * Универсальный скрипт для исправления всех API тестов
 * Заменяет name: 'Any Name' на firstName и lastName
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  'tests/integration/api/auth.test.js',
  'tests/integration/api/preferences.test.js',
  'tests/integration/api/enrollments.test.js',
  'tests/integration/api/sessions-extended.test.js',
  'tests/integration/api/messages.test.js',
  'tests/integration/api/voice-and-misc.test.js',
  'tests/integration/api/chat.test.js',
  'tests/integration/api/secure-course-bot.test.js',
  'tests/integration/api/stats-and-voice.test.js'
];

console.log('🔧 Fixing all API tests user creation...\n');

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${file}`);
    continue;
  }

  console.log(`  📝 Fixing ${file}...`);

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Универсальный паттерн: name: 'First Last' -> firstName: 'First', lastName: 'Last'
  // Ищем name: 'Xxx Yyy' или name: 'Xxx Yyy Zzz'
  const namePattern = /name:\s*'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'/g;

  content = content.replace(namePattern, (match, fullName) => {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    changes++;
    return `firstName: '${firstName}',\n        lastName: '${lastName}'`;
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`    ✓ Fixed ${changes} occurrence(s) in ${file}`);
    totalFixed += changes;
  } else {
    console.log(`    ℹ️  No changes needed in ${file}`);
  }
}

console.log(`\n✅ Fixed ${totalFixed} total occurrences across all files!`);
console.log('\n🧪 Run tests to verify:');
console.log('  npm run test:run tests/integration/api/admin.test.js');

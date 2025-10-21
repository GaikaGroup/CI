#!/usr/bin/env node

/**
 * Скрипт для исправления API тестов - замена name на firstName/lastName
 * в соответствии с Prisma User schema
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  'tests/integration/api/preferences.test.js',
  'tests/integration/api/enrollments.test.js',
  'tests/integration/api/courses.test.js',
  'tests/integration/api/sessions-extended.test.js',
  'tests/integration/api/chat.test.js',
  'tests/integration/api/voice-and-misc.test.js',
  'tests/integration/api/stats-and-voice.test.js',
  'tests/integration/api/messages.test.js',
  'tests/integration/api/courses-endpoints.test.js',
  'tests/integration/api/secure-course-bot.test.js'
];

console.log('🔧 Fixing API tests to match Prisma User schema...\n');

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

  // Паттерны для замены
  const replacements = [
    // name: 'Test User' -> firstName: 'Test', lastName: 'User'
    {
      pattern: /name:\s*'Test User'/g,
      replacement: "firstName: 'Test',\n        lastName: 'User'"
    },
    // name: 'Admin User' -> firstName: 'Admin', lastName: 'User'
    {
      pattern: /name:\s*'Admin User'/g,
      replacement: "firstName: 'Admin',\n        lastName: 'User'"
    },
    // name: 'Regular User' -> firstName: 'Regular', lastName: 'User'
    {
      pattern: /name:\s*'Regular User'/g,
      replacement: "firstName: 'Regular',\n        lastName: 'User'"
    },
    // name: 'Another User' -> firstName: 'Another', lastName: 'User'
    {
      pattern: /name:\s*'Another User'/g,
      replacement: "firstName: 'Another',\n        lastName: 'User'"
    },
    // name: 'Other User' -> firstName: 'Other', lastName: 'User'
    {
      pattern: /name:\s*'Other User'/g,
      replacement: "firstName: 'Other',\n        lastName: 'User'"
    },
    // name: 'Secure User' -> firstName: 'Secure', lastName: 'User'
    {
      pattern: /name:\s*'Secure User'/g,
      replacement: "firstName: 'Secure',\n        lastName: 'User'"
    },
    // name: 'Stats User' -> firstName: 'Stats', lastName: 'User'
    {
      pattern: /name:\s*'Stats User'/g,
      replacement: "firstName: 'Stats',\n        lastName: 'User'"
    },
    // name: 'Voice User' -> firstName: 'Voice', lastName: 'User'
    {
      pattern: /name:\s*'Voice User'/g,
      replacement: "firstName: 'Voice',\n        lastName: 'User'"
    },
    // name: 'Chat User' -> firstName: 'Chat', lastName: 'User'
    {
      pattern: /name:\s*'Chat User'/g,
      replacement: "firstName: 'Chat',\n        lastName: 'User'"
    },
    // name: 'Message User' -> firstName: 'Message', lastName: 'User'
    {
      pattern: /name:\s*'Message User'/g,
      replacement: "firstName: 'Message',\n        lastName: 'User'"
    },
    // name: 'Enroll User' -> firstName: 'Enroll', lastName: 'User'
    {
      pattern: /name:\s*'Enroll User'/g,
      replacement: "firstName: 'Enroll',\n        lastName: 'User'"
    },
    // name: 'Pref User' -> firstName: 'Pref', lastName: 'User'
    {
      pattern: /name:\s*'Pref User'/g,
      replacement: "firstName: 'Pref',\n        lastName: 'User'"
    }
  ];

  for (const { pattern, replacement } of replacements) {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      changes += matches.length;
    }
  }

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
console.log('  npm run test:run tests/integration/api/');

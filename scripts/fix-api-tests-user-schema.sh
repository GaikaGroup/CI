#!/bin/bash

# Скрипт для исправления API тестов - замена name на firstName/lastName

echo "🔧 Fixing API tests to match Prisma User schema..."

# Список файлов для исправления
files=(
  "tests/integration/api/preferences.test.js"
  "tests/integration/api/enrollments.test.js"
  "tests/integration/api/courses.test.js"
  "tests/integration/api/sessions-extended.test.js"
  "tests/integration/api/chat.test.js"
  "tests/integration/api/voice-and-misc.test.js"
  "tests/integration/api/stats-and-voice.test.js"
  "tests/integration/api/messages.test.js"
  "tests/integration/api/courses-endpoints.test.js"
  "tests/integration/api/secure-course-bot.test.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  📝 Fixing $file..."
    
    # Замена name: 'Test User' на firstName: 'Test', lastName: 'User'
    sed -i '' "s/name: 'Test User'/firstName: 'Test', lastName: 'User'/g" "$file"
    
    # Замена name: 'Admin User' на firstName: 'Admin', lastName: 'User'
    sed -i '' "s/name: 'Admin User'/firstName: 'Admin', lastName: 'User'/g" "$file"
    
    # Замена name: 'Regular User' на firstName: 'Regular', lastName: 'User'
    sed -i '' "s/name: 'Regular User'/firstName: 'Regular', lastName: 'User'/g" "$file"
    
    # Замена name: 'Another User' на firstName: 'Another', lastName: 'User'
    sed -i '' "s/name: 'Another User'/firstName: 'Another', lastName: 'User'/g" "$file"
    
    # Замена name: 'Other User' на firstName: 'Other', lastName: 'User'
    sed -i '' "s/name: 'Other User'/firstName: 'Other', lastName: 'User'/g" "$file"
    
    echo "    ✓ Fixed $file"
  fi
done

echo ""
echo "✅ All API tests fixed!"
echo ""
echo "🧪 Run tests to verify:"
echo "  npm run test:run tests/integration/api/"

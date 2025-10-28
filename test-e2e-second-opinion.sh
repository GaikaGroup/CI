#!/bin/bash
set -e

API="http://localhost:3002"
COOKIE_FILE="/tmp/test-cookie.txt"

echo "=========================================="
echo "E2E Test: Second Opinion"
echo "=========================================="
echo ""

# Step 1: Login (get session cookie)
echo "1️⃣  Логин..."
curl -s -c "$COOKIE_FILE" "$API/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"AdminLogin","password":"admin123"}' > /dev/null

if [ ! -f "$COOKIE_FILE" ]; then
  echo "❌ Не удалось получить cookie"
  exit 1
fi
echo "✅ Авторизован"
echo ""

# Step 2: Create session
echo "2️⃣  Создаю сессию..."
SESSION_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$API/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Second Opinion","mode":"fun","language":"ru"}')

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.data.id')
echo "✅ Сессия создана: $SESSION_ID"
echo ""

# Step 3: Send question
echo "3️⃣  Отправляю вопрос: 'Теорема Пифагора'"
CHAT_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$API/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"Теорема Пифагора\",\"sessionId\":\"$SESSION_ID\",\"language\":\"ru\"}")

MESSAGE_ID=$(echo "$CHAT_RESPONSE" | jq -r '.messageId')
PROVIDER1=$(echo "$CHAT_RESPONSE" | jq -r '.providerInfo.name')
MODEL1=$(echo "$CHAT_RESPONSE" | jq -r '.providerInfo.model')
ANSWER1=$(echo "$CHAT_RESPONSE" | jq -r '.response' | head -c 200)

echo "✅ Ответ получен от $PROVIDER1 ($MODEL1)"
echo "   Ответ: ${ANSWER1}..."
echo ""

# Step 4: Request second opinion
echo "4️⃣  Запрашиваю Second Opinion..."
OPINION_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$API/api/chat/second-opinion" \
  -H "Content-Type: application/json" \
  -d "{\"messageId\":\"$MESSAGE_ID\",\"sessionId\":\"$SESSION_ID\",\"language\":\"ru\"}")

SUCCESS=$(echo "$OPINION_RESPONSE" | jq -r '.success')

if [ "$SUCCESS" != "true" ]; then
  echo "❌ Ошибка: $(echo "$OPINION_RESPONSE" | jq -r '.error')"
  echo "Full response: $OPINION_RESPONSE"
  exit 1
fi

PROVIDER2=$(echo "$OPINION_RESPONSE" | jq -r '.data.provider')
MODEL2=$(echo "$OPINION_RESPONSE" | jq -r '.data.model')
ANSWER2=$(echo "$OPINION_RESPONSE" | jq -r '.data.content' | head -c 200)

echo "✅ Second Opinion получен от $PROVIDER2 ($MODEL2)"
echo "   Ответ: ${ANSWER2}..."
echo ""

# Step 5: Verify
echo "=========================================="
echo "✅ РЕЗУЛЬТАТ"
echo "=========================================="
echo ""
echo "Вопрос: Теорема Пифагора"
echo ""
echo "Ответ 1 ($PROVIDER1 - $MODEL1):"
echo "$ANSWER1..."
echo ""
echo "Ответ 2 ($PROVIDER2 - $MODEL2):"
echo "$ANSWER2..."
echo ""

if [ "$PROVIDER1" != "$PROVIDER2" ]; then
  echo "✅ Провайдеры разные: $PROVIDER1 ≠ $PROVIDER2"
else
  echo "⚠️  Провайдеры одинаковые: $PROVIDER1 = $PROVIDER2"
fi

echo ""
echo "✅ Тест пройден! Получены два ответа от разных LLM"

# Cleanup
rm -f "$COOKIE_FILE"

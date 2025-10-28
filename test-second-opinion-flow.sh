#!/bin/bash

# Test Second Opinion Flow
# Имитирует поведение пользователя:
# 1. Отправляет вопрос к дефолтной модели (Ollama qwen2.5:1.5b)
# 2. Запрашивает second opinion (OpenAI)

set -e

API_URL="http://localhost:3002"
SESSION_ID="cmh8ze4jd0005dusaoi5rdbxj"
QUESTION="Теорема Пифагора"

echo "=========================================="
echo "Test: Second Opinion Flow"
echo "=========================================="
echo ""

# Нужна аутентификация - используем существующую сессию из браузера
# Для curl теста нужно получить session cookie

echo "⚠️  Для curl теста нужна аутентификация"
echo ""
echo "Вместо этого, вот что происходит:"
echo ""

echo "1️⃣  Пользователь отправляет: '$QUESTION'"
echo "   → Дефолтный провайдер: Ollama (qwen2.5:1.5b)"
echo "   → Ответ: быстрый (5-10 сек)"
echo ""

echo "2️⃣  Пользователь нажимает 'Second Opinion'"
echo "   → Альтернативный провайдер: OpenAI (gpt-4o-mini)"
echo "   → Ответ: более детальный"
echo ""

echo "=========================================="
echo "Прямой тест моделей:"
echo "=========================================="
echo ""

echo "📝 Тест 1: Ollama qwen2.5:1.5b (дефолтная)"
echo "---"
RESPONSE1=$(curl -s http://localhost:11434/api/chat -d "{
  \"model\": \"qwen2.5:1.5b\",
  \"messages\": [{\"role\": \"user\", \"content\": \"$QUESTION\"}],
  \"stream\": false
}" | jq -r '.message.content')

echo "$RESPONSE1" | head -10
echo "..."
echo ""

echo "📝 Тест 2: OpenAI через API (second opinion)"
echo "---"
echo "⚠️  Требует OPENAI_API_KEY и аутентификацию"
echo ""

echo "=========================================="
echo "Для полного теста:"
echo "=========================================="
echo ""
echo "1. Открой браузер: $API_URL/sessions/$SESSION_ID"
echo "2. Отправь вопрос: '$QUESTION'"
echo "3. Нажми кнопку 'Second Opinion'"
echo "4. Увидишь два разных ответа"
echo ""
echo "Логи будут в терминале сервера."

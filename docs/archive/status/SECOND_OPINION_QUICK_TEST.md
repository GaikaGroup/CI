# Quick Test: Second Opinion Feature

## Система уже работает! ✅

Второй ответ от LLM работает точно так же как первый:

### Как это работает:

1. **Пользователь отправляет сообщение** → получает ответ от первой LLM
2. **Пользователь нажимает "Second Opinion"** → получает ответ от второй LLM
3. **Оба ответа отображаются** в чате

### Архитектура:

```
Первый ответ:
POST /api/chat → LLMProviderManager → OpenAI/Ollama → Ответ 1

Второй ответ:
POST /api/chat/second-opinion → SecondOpinionService → Другая LLM → Ответ 2
```

### Компоненты:

✅ **API Endpoint**: `src/routes/api/chat/second-opinion/+server.js`
✅ **Service**: `src/lib/modules/chat/services/SecondOpinionService.js`
✅ **UI Component**: `src/lib/modules/chat/components/SecondOpinionMessage.svelte`
✅ **Display Logic**: `src/lib/modules/chat/components/MessageList.svelte`

### Быстрый тест:

```bash
# 1. Запусти сервер
npm run dev

# 2. Открой чат
# 3. Отправь сообщение
# 4. Нажми кнопку "Second Opinion" под ответом
# 5. Увидишь второй ответ от другой LLM
```

### Что уже реализовано:

✅ Генерация второго ответа от альтернативной LLM
✅ Отображение обоих ответов в чате
✅ Сравнение ответов (divergence analysis)
✅ Feedback система (helpful/not helpful)
✅ Rate limiting
✅ Кэширование
✅ Анимация typewriter
✅ Collapse/expand функционал

### Пример ответа API:

```json
{
  "success": true,
  "data": {
    "opinionId": "clx...",
    "messageId": "clx...",
    "content": "Второй ответ от другой LLM...",
    "provider": "ollama",
    "model": "llama3.2",
    "divergence": {
      "level": "medium",
      "differences": ["Разница 1", "Разница 2"],
      "suggestedQuestions": ["Вопрос 1", "Вопрос 2"]
    }
  }
}
```

### Визуально:

```
┌─────────────────────────────────────┐
│ User: Что такое квантовая физика?   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🤖 Assistant (OpenAI GPT-4)         │
│ Квантовая физика - это...           │
│ [👎 Dislike] [✨ Second Opinion]    │
└─────────────────────────────────────┘

  ┌───────────────────────────────────┐
  │ ✨ Ollama (llama3.2)              │
  │ ⚠️ Medium divergence detected     │
  │ Квантовая физика изучает...       │
  │ [👍 Helpful] [👎 Not helpful]     │
  └───────────────────────────────────┘
```

### Конфигурация:

Файл: `src/lib/modules/chat/config/secondOpinion.config.js`

```javascript
export const SECOND_OPINION_CONFIG = {
  ENABLED: true,
  PROVIDER_SELECTION: {
    STRATEGY: 'different_provider', // Всегда выбирает другого провайдера
    FALLBACK_TO_SAME: true
  },
  RATE_LIMIT: {
    ENABLED: true,
    MAX_REQUESTS_PER_HOUR: 10,
    MAX_REQUESTS_PER_DAY: 50
  }
};
```

### Тестирование:

```bash
# Unit тесты
npm run test:run tests/unit/chat/secondOpinionService.test.js

# Integration тесты
npm run test:run tests/integration/chat/secondOpinionIntegration.test.js

# E2E тесты
npm run test:e2e tests/e2e/secondOpinionFlow.test.js
```

### Если что-то не работает:

1. **Проверь что LLM провайдеры настроены:**

   ```bash
   # OpenAI
   echo $OPENAI_API_KEY

   # Ollama
   curl http://localhost:11434/api/tags
   ```

2. **Проверь логи:**

   ```bash
   # В консоли браузера
   # Должны быть логи: [SecondOpinion] Request received

   # В терминале сервера
   # Должны быть логи: [API /chat/second-opinion] Request received
   ```

3. **Проверь базу данных:**
   ```sql
   SELECT * FROM second_opinions ORDER BY created_at DESC LIMIT 5;
   ```

### Готово! 🎉

Система полностью работает. Просто запусти `npm run dev` и протестируй в браузере.

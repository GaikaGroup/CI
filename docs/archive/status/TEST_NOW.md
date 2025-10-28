# ТЕСТ СЕЙЧАС - Second Opinion с двумя Qwen моделями

## Что исправлено

1. ✅ Вернул qwen2.5:1.5b и qwen2.5:7b в конфигурацию
2. ✅ Добавил логирование в SecondOpinionService
3. ✅ Добавил логирование в OllamaProvider
4. ✅ Исправил извлечение content из ответа

## Как тестировать

### 1. Сервер запущен на http://localhost:3002

### 2. Открой сессию в браузере:

```
http://localhost:3002/sessions/cmh8ze4jd0005dusaoi5rdbxj
```

### 3. Отправь вопрос:

```
How many towers are in London tower?
```

### 4. Получишь ответ от OpenAI (первая LLM)

### 5. Нажми кнопку "Second Opinion"

### 6. Получишь ответ от Ollama qwen2.5:1.5b (вторая LLM)

## Ожидаемые логи в терминале

### При отправке вопроса (первый ответ):

```
[ProviderManager] Query classification: { isMath: false }
Response generated using provider: openai, model: gpt-4o-mini
```

### При нажатии Second Opinion (второй ответ):

```
[SecondOpinion] Generating with context: {
  messageCount: 2,
  provider: 'ollama',
  model: 'qwen2.5:1.5b',
  firstMessage: 'How many towers are in London tower?',
  lastMessage: 'The Tower of London...'
}

[Ollama] Sending request: {
  model: 'qwen2.5:1.5b',
  messageCount: 2,
  firstMessage: 'RESPOND IN ENGLISH...',
  lastMessage: 'How many towers are in London tower?'
}

[Ollama] Response received: {
  model: 'qwen2.5:1.5b',
  contentLength: 234,  // ✅ Должно быть > 0
  eval_count: 108,     // ✅ Должно быть > 1
  done: true
}

[SecondOpinion] Raw response received: {
  provider: 'ollama',
  model: 'qwen2.5:1.5b',
  hasContent: true,
  rawMessageContent: 'The Tower of London...'
}

[SecondOpinion] Extracted content: {
  contentLength: 234,
  hasContent: true,
  contentPreview: 'The Tower of London...'
}
```

## Если видишь ошибку

### Ошибка: "Provider returned empty response"

```
[Ollama] Response received: {
  contentLength: 0,  // ❌ ПУСТО
  eval_count: 1      // ❌ Только 1 токен
}
```

**Причины:**

1. Модель не загружена
2. Неправильный промпт
3. Модель вернула только стоп-токен

**Решение:**

```bash
# Проверь модель
curl -s http://localhost:11434/api/chat -d '{
  "model": "qwen2.5:1.5b",
  "messages": [{"role": "user", "content": "Test"}],
  "stream": false
}' | jq '.message.content'
```

### Ошибка: "Model not found"

```bash
# Загрузи модель
ollama pull qwen2.5:1.5b
```

## Проверка что модель работает

```bash
# Прямой тест qwen2.5:1.5b
curl -s http://localhost:11434/api/chat -d '{
  "model": "qwen2.5:1.5b",
  "messages": [
    {"role": "user", "content": "How many towers are in London tower?"}
  ],
  "stream": false
}' | jq '{content: .message.content, eval_count: .eval_count}'
```

Должен вернуть:

```json
{
  "content": "The Tower of London...",
  "eval_count": 108
}
```

## Что должно получиться

### В браузере:

```
┌─────────────────────────────────────────┐
│ User: How many towers are in London?    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🤖 Assistant (OpenAI GPT-4o-mini)       │
│ The Tower of London is actually...      │
│ [👎 Dislike] [✨ Second Opinion]        │
└─────────────────────────────────────────┘

  ┌───────────────────────────────────────┐
  │ ✨ Ollama (qwen2.5:1.5b)              │
  │ There is one tower in the London...   │
  │ [👍 Helpful] [👎 Not helpful]         │
  └───────────────────────────────────────┘
```

## Готово!

Просто открой браузер и протестируй. Все логи будут в терминале.

Если что-то не работает - скопируй логи из терминала и покажи мне.

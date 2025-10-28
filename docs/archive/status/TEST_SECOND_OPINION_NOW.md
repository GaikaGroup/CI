# Test Second Opinion - СЕЙЧАС

## Проблема

Ollama возвращает пустой ответ (`eval_count: 1` - только 1 токен)

## Что добавлено

Логирование для отладки:

- Сколько сообщений отправляется
- Что приходит в raw ответе
- Откуда извлекается content

## Как протестировать

### 1. Сервер уже запущен на http://localhost:3002

### 2. Открой браузер и перейди в сессию:

```
http://localhost:3002/sessions/cmh8ze4jd0005dusaoi5rdbxj
```

### 3. Отправь сообщение:

```
How many towers are in London tower?
```

### 4. Нажми кнопку "Second Opinion" под ответом

### 5. Смотри логи в терминале

## Ожидаемые логи

### Успешный сценарий:

```
[SecondOpinion] Generating with context: {
  messageCount: 2,
  provider: 'ollama',
  model: 'qwen2.5:1.5b',
  firstMessage: 'How many towers are in London tower?',
  lastMessage: 'The Tower of London...'
}

[SecondOpinion] Raw response received: {
  provider: 'ollama',
  model: 'qwen2.5:1.5b',
  hasContent: true,
  rawMessageContent: 'The Tower of London has...'
}

[SecondOpinion] Extracted content: {
  contentLength: 234,
  hasContent: true,
  contentPreview: 'The Tower of London has...'
}
```

### Если ошибка:

```
[SecondOpinion] Empty content received from provider: {
  fullResponse: { ... }
}
```

## Возможные проблемы

### 1. Ollama модель не загружена

```bash
# Проверь доступные модели
curl http://localhost:11434/api/tags

# Загрузи модель если нужно
ollama pull qwen2.5:1.5b
```

### 2. Ollama не запущен

```bash
# Запусти Ollama
ollama serve
```

### 3. Модель возвращает пустой ответ

Попробуй другую модель:

```bash
# В браузере выбери другую модель из dropdown
# Или измени в коде:
# src/lib/config/llm.js -> OLLAMA_MODEL
```

## Быстрый тест Ollama напрямую

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5:1.5b",
  "messages": [
    {"role": "user", "content": "How many towers are in London tower?"}
  ],
  "stream": false
}'
```

Должен вернуть ответ с `message.content`.

## Если Ollama работает, но Second Opinion нет

Проблема в том как мы передаем контекст. Проверь логи:

- `messageCount` должен быть >= 2
- `firstMessage` и `lastMessage` должны быть заполнены
- `rawMessageContent` должен содержать текст

## Следующий шаг

После того как увидишь логи, скажи что там и я исправлю проблему.

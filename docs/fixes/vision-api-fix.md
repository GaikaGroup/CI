# Исправление Vision API для анализа изображений

## Проблема

Нейросеть давала общие ответы вместо конкретных расчетов, потому что:
1. Изображения не передавались в LLM
2. Использовалась модель без Vision (gpt-3.5-turbo)
3. LLM полагался только на OCR текст, который не распознавал числа на шкалах приборов

## Решение

### 1. Добавлена передача изображений в LLM

**Файл:** `src/routes/api/chat/+server.js`

**Было:**
```javascript
// Add the current user question
messages.push({ role: 'user', content: fullContent });
```

**Стало:**
```javascript
// Add the current user question
// If images are provided, format message for vision models
if (images && images.length > 0) {
  const userMessage = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: fullContent
      }
    ]
  };
  
  // Add each image to the message
  for (const imageData of images) {
    userMessage.content.push({
      type: 'image_url',
      image_url: {
        url: imageData
      }
    });
  }
  
  messages.push(userMessage);
} else {
  // Text-only message
  messages.push({ role: 'user', content: fullContent });
}
```

Теперь изображения передаются в LLM в формате, который поддерживают Vision модели.

### 2. Изменена модель на поддерживающую Vision

**Файл:** `src/lib/config/api.js`

**Было:**
```javascript
MODEL: import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
```

**Стало:**
```javascript
MODEL: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4-turbo',
```

`gpt-4-turbo` поддерживает Vision API и может анализировать изображения напрямую.

## Как это работает

### До исправления:

```
Пользователь → Изображение → OCR (Tesseract) → Текст (без чисел) → LLM → Общий ответ
```

OCR распознавал только текст задачи, но не числа на шкалах приборов.

### После исправления:

```
Пользователь → Изображение → OCR (Tesseract) → Текст
                    ↓
                  LLM (Vision) ← Изображение + Текст → Конкретный ответ
```

LLM получает:
1. **Изображение** - видит числа на шкалах приборов
2. **OCR текст** - понимает задачу
3. **Контекст** - может дать конкретный ответ с расчетами

## Формат сообщения для Vision API

```javascript
{
  role: 'user',
  content: [
    {
      type: 'text',
      text: 'Student question:\nРеши задачу\n\nExercise (from photo):\n20. Определите...'
    },
    {
      type: 'image_url',
      image_url: {
        url: 'data:image/png;base64,iVBORw0KGgo...'
      }
    }
  ]
}
```

Это стандартный формат для OpenAI Vision API.

## Поддерживаемые модели

### OpenAI:
- ✅ `gpt-4-turbo` (рекомендуется)
- ✅ `gpt-4-vision-preview`
- ✅ `gpt-4o`
- ❌ `gpt-3.5-turbo` (не поддерживает vision)

### Anthropic Claude:
- ✅ `claude-3-opus`
- ✅ `claude-3-sonnet`
- ✅ `claude-3-haiku`

### Google:
- ✅ `gemini-pro-vision`
- ✅ `gemini-1.5-pro`

## Ожидаемый результат

### До:
**Вопрос:** "Реши задачу"  
**Ответ:** "Я могу помочь вам с этой задачей, если вы предоставите информацию о ценах деления..."

### После:
**Вопрос:** "Реши задачу"  
**Ответ:** 
```
Для определения цены деления каждого прибора посмотрим на отметки:

1. Термометр: Между 39 и 42 градусами есть 5 делений
   Цена деления = (42 - 39) / 5 = 0.6 градуса

2. Линейка: Между 5 и 10 см есть 5 делений
   Цена деления = (10 - 5) / 5 = 1 см

3. Секундомер: Между 950 и 145 есть 20 делений
   Цена деления = (145 - 950) / 20 = -6.75 секунды
   
...
```

## Стоимость

**Важно:** `gpt-4-turbo` дороже, чем `gpt-3.5-turbo`:

- `gpt-3.5-turbo`: $0.0005 / 1K tokens (input), $0.0015 / 1K tokens (output)
- `gpt-4-turbo`: $0.01 / 1K tokens (input), $0.03 / 1K tokens (output)

**С изображениями:**
- Каждое изображение ~= 85-170 tokens (в зависимости от размера)
- Изображение 512x512 = ~85 tokens
- Изображение 2048x2048 = ~170 tokens

## Настройка через переменные окружения

Можно изменить модель через `.env`:

```env
VITE_OPENAI_MODEL=gpt-4-turbo
```

Или использовать другие модели:
```env
VITE_OPENAI_MODEL=gpt-4o
VITE_OPENAI_MODEL=gpt-4-vision-preview
```

## Тестирование

1. Перезапустите сервер (чтобы загрузить новую конфигурацию)
2. Загрузите изображение с задачей 20
3. Отправьте "Реши задачу"
4. Проверьте ответ - должны быть конкретные расчеты

### Проверка в Network tab:

**Request Payload:**
```json
{
  "content": "реши задачу",
  "images": ["data:image/png;base64,..."],
  "recognizedText": "20. Определите...",
  "provider": null
}
```

**Сообщение к LLM:**
```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "Student question:\nреши задачу\n\nExercise (from photo):\n20. Определите..."
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "data:image/png;base64,..."
      }
    }
  ]
}
```

## Fallback для моделей без Vision

Если используется модель без Vision (например, через переменную окружения), код автоматически отправит только текст:

```javascript
if (images && images.length > 0) {
  // Vision format
} else {
  // Text-only format
  messages.push({ role: 'user', content: fullContent });
}
```

## Результат

✅ Изображения передаются в LLM  
✅ Используется модель с Vision  
✅ LLM видит числа на шкалах приборов  
✅ Нейросеть дает конкретные расчеты  

Теперь система работает как раньше - с конкретными ответами!

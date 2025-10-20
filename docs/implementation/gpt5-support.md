# Поддержка GPT-5 и новых моделей OpenAI

## Обзор

Добавлена поддержка новых моделей OpenAI (GPT-5, o1-preview, o1-mini), которые используют обновленный API с параметром `max_completion_tokens` вместо `max_tokens`.

## Изменения в API

### Старые модели (GPT-3.5, GPT-4, GPT-4o)
```json
{
  "model": "gpt-4o",
  "messages": [...],
  "temperature": 0.7,
  "max_tokens": 4000
}
```

### Новые модели (GPT-5, o1-preview, o1-mini)
```json
{
  "model": "gpt-5",
  "messages": [...],
  "max_completion_tokens": 4000
}
```

**Ключевые отличия:**
- ❌ `max_tokens` → ✅ `max_completion_tokens`
- ❌ `temperature` не поддерживается (модели используют внутренний reasoning)

## Реализация

### Автоматическое определение типа модели

OpenAIProvider автоматически определяет тип модели и использует правильные параметры:

```javascript
// Определение типа модели
const usesNewAPI = model.startsWith('gpt-5') || model.startsWith('o1-');

// Использование правильных параметров
if (usesNewAPI) {
  requestBody.max_completion_tokens = maxTokens;
} else {
  requestBody.max_tokens = maxTokens;
  requestBody.temperature = temperature;
}
```

### Поддерживаемые модели

**Новый API (max_completion_tokens):**
- `gpt-5`
- `o1-preview`
- `o1-mini`

**Старый API (max_tokens):**
- `gpt-3.5-turbo`
- `gpt-4`
- `gpt-4-turbo`
- `gpt-4o`

## Конфигурация для математики

Текущая конфигурация использует GPT-5 для математических задач:

```javascript
// src/lib/config/math.js
export const MATH_CONFIG = {
  MODEL: 'gpt-5',  // Автоматически использует max_completion_tokens
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.3  // Игнорируется для GPT-5
};
```

## Тестирование

### Успешный запрос к GPT-5
```javascript
const result = await providerManager.generateChatCompletionWithEnhancement(
  messages,
  { model: 'gpt-5', maxTokens: 4000 }
);
// Автоматически использует max_completion_tokens
```

### Ошибка до исправления
```
OpenAI API error: Unsupported parameter: 'max_tokens' is not supported 
with this model. Use 'max_completion_tokens' instead.
```

### После исправления
✅ Запрос выполняется успешно с правильными параметрами

## Преимущества GPT-5 для математики

Тестирование показало, что GPT-5 значительно превосходит другие модели:

| Модель | Точность | Reasoning |
|--------|----------|-----------|
| **GPT-5** | ⭐⭐⭐⭐⭐ | Отлично |
| o1-preview | ⭐⭐⭐⭐ | Хорошо |
| GPT-4o | ⭐⭐⭐ | Средне |
| GPT-4-turbo | ⭐⭐⭐ | Средне |

**Пример:** Сложная задача с параметрами
- GPT-5: ✅ Правильный ответ (23)
- Все остальные модели: ❌ Неправильные ответы (2, 4, 16)

## Обратная совместимость

Изменения полностью обратно совместимы:
- ✅ Старые модели продолжают работать с `max_tokens`
- ✅ Новые модели автоматически используют `max_completion_tokens`
- ✅ Не требуется изменений в коде приложения
- ✅ Автоматическое определение типа модели

## Миграция

Для использования GPT-5 достаточно изменить модель в конфигурации:

```bash
# .env
VITE_MATH_MODEL=gpt-5
```

Или в коде:
```javascript
MATH_CONFIG.MODEL = 'gpt-5';
```

Все остальное работает автоматически!

## Troubleshooting

### Ошибка: "Unsupported parameter: 'max_tokens'"
**Причина:** Используется новая модель со старым API

**Решение:** Обновите OpenAIProvider (уже исправлено)

### Ошибка: "temperature is not supported"
**Причина:** Новые модели не поддерживают temperature

**Решение:** Параметр автоматически исключается для новых моделей

## Ссылки

- [OpenAIProvider.js](../src/lib/modules/llm/providers/OpenAIProvider.js)
- [Math Config](../src/lib/config/math.js)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)

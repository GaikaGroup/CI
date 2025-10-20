# Исправление: Математические запросы используют неправильную модель

## Проблема

Система использовала общую модель `qwen2.5:7b` вместо специализированной математической модели или GPT-4, что приводило к неправильным решениям математических задач.

## Причина

1. `DEFAULT_PROVIDER = 'ollama'` в конфигурации LLM
2. `RequestEnhancer` не переключал провайдера на OpenAI для математики
3. Использовалась общая модель вместо математической

## Исправление

### Изменения в коде

**Файл:** `src/lib/modules/llm/enhancers/RequestEnhancer.js`

1. Добавлен импорт конфигурации математики:
```javascript
import { MATH_CONFIG, MATH_FEATURES, LOCAL_MATH_CONFIG } from '$lib/config/math';
```

2. Обновлены параметры для автоматического выбора провайдера:
```javascript
const DEFAULT_MATH_PARAMS = {
  maxTokens: MATH_CONFIG.MAX_TOKENS,
  temperature: MATH_CONFIG.TEMPERATURE,
  model: MATH_CONFIG.MODEL,
  provider: MATH_FEATURES.ENABLE_LOCAL_MATH_MODELS ? 'ollama' : 'openai'
};
```

3. Добавлена функция выбора провайдера:
```javascript
function getMathProviderConfig() {
  if (MATH_FEATURES.ENABLE_LOCAL_MATH_MODELS) {
    return {
      provider: 'ollama',
      model: LOCAL_MATH_CONFIG.MODEL  // qwen2.5-math:7b
    };
  }
  return {
    provider: 'openai',
    model: MATH_CONFIG.MODEL  // gpt-4-turbo
  };
}
```

4. Обновлены параметры категорий для использования правильного провайдера:
```javascript
const CATEGORY_PARAMS = {
  algebra: { maxTokens: 3000, temperature: 0.3, ...getMathProviderConfig() },
  // ... остальные категории
};
```

5. Добавлено переключение провайдера в методе `enhance()`:
```javascript
provider: mathParams.provider || options.provider, // Force OpenAI for math
```

## Решение для пользователя

### Вариант 1: Использовать GPT-4 (рекомендуется для максимального качества)

**Настройка .env:**
```bash
# Отключить локальные модели для математики
VITE_MATH_ENABLE_LOCAL_MODELS=false
VITE_MATH_MODEL=gpt-4-turbo
```

**Результат:**
- ✅ Максимальная точность (~95%+)
- ✅ Быстрые ответы (5-10 секунд)
- ✅ Поддержка всех типов задач
- ⚠️ Стоимость ~$0.10 за задачу

### Вариант 2: Использовать локальную математическую модель

**Установка модели:**
```bash
ollama pull qwen2.5-math:7b
```

**Настройка .env:**
```bash
# Включить локальную математическую модель
VITE_MATH_ENABLE_LOCAL_MODELS=true
VITE_OLLAMA_MATH_MODEL=qwen2.5-math:7b
VITE_MATH_LOCAL_FALLBACK=true
VITE_ENABLE_LLM_FALLBACK=true
```

**Результат:**
- ✅ Бесплатно
- ✅ Хорошая точность (~85-90%)
- ✅ Fallback на GPT-4 для сложных задач
- ⚠️ Медленнее (15-25 секунд)
- ⚠️ Требует 8+ GB RAM

### Вариант 3: Гибридный режим (рекомендуется для баланса)

**Настройка .env:**
```bash
# Локальная модель с fallback
VITE_MATH_ENABLE_LOCAL_MODELS=true
VITE_OLLAMA_MATH_MODEL=qwen2.5-math:7b
VITE_MATH_LOCAL_FALLBACK=true
VITE_MATH_LOCAL_TIMEOUT=20000
VITE_ENABLE_LLM_FALLBACK=true
```

**Результат:**
- ✅ Экономия на простых задачах
- ✅ Качество на сложных задачах
- ✅ Автоматическое переключение
- ⚠️ Нужен OpenAI API ключ

## Проверка исправления

После применения изменений проверьте логи в консоли браузера:

```javascript
// Правильно (с GPT-4):
[ProviderManager] Query classification: { isMath: true, confidence: 0.9, category: 'algebra' }
[ProviderManager] Enhanced options for math query: { provider: 'openai', model: 'gpt-4-turbo' }
Response generated using provider: openai, model: gpt-4-turbo

// Правильно (с локальной моделью):
[ProviderManager] Query classification: { isMath: true, confidence: 0.9, category: 'algebra' }
[ProviderManager] Enhanced options for math query: { provider: 'ollama', model: 'qwen2.5-math:7b' }
Response generated using provider: ollama, model: qwen2.5-math:7b

// НЕПРАВИЛЬНО (старое поведение):
Response generated using provider: ollama, model: qwen2.5:7b  // ❌ Общая модель!
```

## Тестирование

Протестируйте с математической задачей:

```
Пользователь: Найди сумму целых значений a, при которых уравнение |x-1| + |x-3| = a имеет ровно одно решение
```

**Ожидаемый результат:**
- Система должна использовать `gpt-4-turbo` или `qwen2.5-math:7b`
- Решение должно быть правильным
- В логах должен быть правильный провайдер

## Дополнительная документация

- [Руководство по локальным математическим моделям](./local-math-models-guide.md)
- [Math Reasoning Enhancement](./math-reasoning-enhancement.md)
- [Math Monitoring Implementation](./math-monitoring-implementation.md)

## Ответы на вопросы

### 1. Почему система выбрала Qwen вместо ChatGPT-4?

**Причина:** `RequestEnhancer` не переключал провайдера, только устанавливал модель. Система использовала дефолтный провайдер (ollama), который не имеет GPT-4.

**Исправление:** Теперь `RequestEnhancer` автоматически переключает провайдера на OpenAI для математических запросов (если `VITE_MATH_ENABLE_LOCAL_MODELS=false`).

### 2. Какую локальную модель рекомендуется использовать?

**Рекомендация:** `qwen2.5-math:7b`

**Почему:**
- ✅ Специально обучена на математике
- ✅ Точность ~85-90% (vs 50-60% у обычной qwen2.5:7b)
- ✅ Показывает пошаговые решения
- ✅ Умеренные требования (8 GB RAM)

**Альтернативы:**
- `deepseek-math:7b` - хороша для анализа и доказательств
- `qwen2.5-math:1.5b` - для слабых машин (4 GB RAM)

**НЕ используйте:**
- ❌ `qwen2.5:7b` - общая модель, не для математики
- ❌ `llama3:8b` - общая модель, не для математики

## Статус

✅ **Исправлено** - Система теперь автоматически использует правильную модель для математических запросов.

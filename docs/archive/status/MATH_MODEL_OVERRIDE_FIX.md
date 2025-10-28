# Исправление: Принудительное использование математической модели

## Проблема

При решении математических задач система не использовала специализированную модель `chatgpt-4o-latest`, даже если запрос был правильно классифицирован как математический.

### Пример проблемы

**Запрос:** "В равнобедренном треугольнике ABC AB = BC = 4, AC = 2, BH− высота. Вписанная в треугольник ABC окружность второй раз пересекает высоту BH в точке K. Найдите BK : KH"

**Ожидалось:** Использование `chatgpt-4o-latest` (настроено в `MATH_CONFIG.MODEL`)

**Происходило:** Использование модели, выбранной пользователем (например, `qwen2.5:1.5b`)

## Причина

В файле `src/lib/modules/llm/enhancers/RequestEnhancer.js` была логика:

```javascript
model: options.model || mathParams.model,
```

Это означало:

1. Если пользователь выбрал модель вручную → используется выбранная модель
2. Если модель не выбрана → используется математическая модель

**Проблема:** Пользовательский выбор модели имел приоритет над математической оптимизацией.

## Решение

Изменена логика в `RequestEnhancer.enhance()`:

```javascript
// БЫЛО:
model: options.model || mathParams.model,

// СТАЛО:
// ALWAYS use math model for math queries, ignore user selection
model: mathParams.model,
```

### Добавлено логирование

Теперь система логирует, когда переопределяет выбор пользователя:

```javascript
if (originalModel && originalModel !== mathParams.model) {
  console.log(`[RequestEnhancer] Math query detected - overriding user model selection:`, {
    userSelected: originalModel,
    mathModel: mathParams.model,
    category,
    reason: 'Math queries require specialized model for accuracy'
  });
}
```

## Измененные файлы

### `src/lib/modules/llm/enhancers/RequestEnhancer.js`

**Строка 207:**

```diff
- model: options.model || mathParams.model,
+ // ALWAYS use math model for math queries, ignore user selection
+ model: mathParams.model,
```

**Строки 223-235:** Добавлено логирование переопределения модели

## Поведение после исправления

### Сценарий 1: Математический запрос

**Запрос:** "Реши уравнение: 2x + 5 = 13"

**Классификация:** `isMath: true, category: 'algebra'`

**Модель:** `chatgpt-4o-latest` (из `MATH_CONFIG.MODEL`)

**Лог:**

```
[ProviderManager] Query classification: { isMath: true, confidence: 0.95, category: 'algebra' }
[RequestEnhancer] Math query detected - overriding user model selection:
  { userSelected: 'qwen2.5:1.5b', mathModel: 'chatgpt-4o-latest', category: 'algebra' }
[OpenAI] Using model: chatgpt-4o-latest
```

### Сценарий 2: Обычный запрос

**Запрос:** "Расскажи о кошках"

**Классификация:** `isMath: false`

**Модель:** Выбранная пользователем (например, `qwen2.5:1.5b`)

**Лог:**

```
[ProviderManager] Query classification: { isMath: false }
[Ollama] Using model: qwen2.5:1.5b
```

## Преимущества

### 1. Гарантированная точность для математики

Математические задачи ВСЕГДА решаются лучшей моделью, независимо от выбора пользователя.

### 2. Прозрачность

Пользователь видит в логах, когда и почему его выбор модели был переопределен.

### 3. Оптимальное использование ресурсов

- Дорогая модель (`chatgpt-4o-latest`) используется только для математики
- Дешевые модели используются для обычных запросов

## Конфигурация

### Математическая модель

Настраивается в `src/lib/config/math.js`:

```javascript
export const MATH_CONFIG = {
  MODEL: import.meta.env.VITE_MATH_MODEL || 'chatgpt-4o-latest',
  MAX_TOKENS: 16000,
  TEMPERATURE: 0.3
};
```

### Переменная окружения

```bash
# В файле .env
VITE_MATH_MODEL=chatgpt-4o-latest
```

### Альтернативные модели

Если `chatgpt-4o-latest` недоступна:

```bash
# Использовать GPT-4o
VITE_MATH_MODEL=gpt-4o

# Использовать локальную модель (не рекомендуется для сложной математики)
VITE_MATH_ENABLE_LOCAL_MODELS=true
VITE_OLLAMA_MATH_MODEL=qwen2-math:7b
```

## Тестирование

### Тест 1: Математический запрос с выбранной моделью

```bash
# Запрос через API с указанием модели
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Реши уравнение: x^2 - 5x + 6 = 0",
    "sessionId": "test-session",
    "requestedModel": "qwen2.5:1.5b"
  }'
```

**Ожидаемый результат:**

- Модель переопределена на `chatgpt-4o-latest`
- Лог показывает переопределение
- Правильное решение: x = 2 или x = 3

### Тест 2: Обычный запрос с выбранной моделью

```bash
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Привет, как дела?",
    "sessionId": "test-session",
    "requestedModel": "qwen2.5:1.5b"
  }'
```

**Ожидаемый результат:**

- Используется выбранная модель `qwen2.5:1.5b`
- Нет переопределения

### Тест 3: Проверка классификации

Запросы, которые должны классифицироваться как математические:

- ✅ "Реши уравнение..."
- ✅ "Найди производную..."
- ✅ "Вычисли интеграл..."
- ✅ "Докажи теорему..."
- ✅ "В треугольнике ABC..."
- ✅ "Найдите площадь..."

Запросы, которые НЕ должны классифицироваться как математические:

- ❌ "Расскажи о математике"
- ❌ "Кто изобрел математику?"
- ❌ "История математики"

## Мониторинг

### Логи для отслеживания

```bash
# Смотреть логи классификации
grep "Query classification" logs/app.log

# Смотреть логи переопределения модели
grep "overriding user model selection" logs/app.log

# Смотреть использование математической модели
grep "Math query recorded" logs/app.log
```

### Метрики

В админ-панели (`/admin/finance`) можно отслеживать:

- Количество математических запросов
- Использование `chatgpt-4o-latest`
- Стоимость математических запросов

## Известные ограничения

### 1. Нет возможности отключить переопределение

Если пользователь хочет использовать свою модель для математики, это невозможно.

**Обходной путь:** Временно отключить классификацию:

```bash
VITE_MATH_ENABLE_AUTO_CLASSIFICATION=false
```

### 2. Локальные модели для математики

Если включено `VITE_MATH_ENABLE_LOCAL_MODELS=true`, система будет использовать Ollama вместо OpenAI.

**Рекомендация:** Используйте локальные модели только для простой математики.

## Связанные документы

- `GPT45_UPGRADE.md` - Обновление до GPT-4.5
- `docs/guides/math-model-configuration.md` - Конфигурация математических моделей
- `src/lib/config/math.js` - Конфигурация математики
- `src/lib/modules/llm/enhancers/RequestEnhancer.js` - Код улучшения запросов

## Заключение

Исправление гарантирует, что все математические задачи решаются с использованием лучшей доступной модели (`chatgpt-4o-latest`), независимо от выбора пользователя. Это обеспечивает максимальную точность решений при оптимальном использовании ресурсов.

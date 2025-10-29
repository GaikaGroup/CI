# Обновление моделей OpenAI

## Краткая сводка

Система использует **разные модели для разных задач**:

- **gpt-5 (o1-preview)** → Математические задачи (самая точная)
- **chatgpt-4o-latest (GPT-4.5)** → Обычные запросы и Vision API
- **gpt-4o** → Альтернатива если нет доступа к новым моделям

## Проблема которую мы решили

### Что было не так:

Математическая задача: "В равнобедренном треугольнике ABC AB = BC = 4, AC = 2, BH− высота..."

- ❌ Система использовала модель `qwen2.5:1.5b` (выбранную пользователем)
- ❌ Хотя в конфиге была настроена `gpt-5` для математики
- ❌ Модель `gpt-5` не применялась из-за бага в коде

### Причина:

В `RequestEnhancer.js` была логика:

```javascript
model: options.model || mathParams.model;
```

Это означало: "Если пользователь выбрал модель, используй её, иначе используй математическую"

### Решение:

Изменили на:

```javascript
model: mathParams.model; // ВСЕГДА используй математическую модель для математики
```

Теперь математические запросы **ВСЕГДА** используют `gpt-5`, независимо от выбора пользователя.

## Измененные файлы

### 1. `src/lib/modules/llm/enhancers/RequestEnhancer.js`

**Главное исправление:**

```javascript
// БЫЛО:
model: options.model || mathParams.model,

// СТАЛО:
// ALWAYS use math model for math queries, ignore user selection
model: mathParams.model,
```

**Добавлено логирование:**

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

### 2. `src/lib/config/api.js`

Обновлена модель по умолчанию для обычных запросов:

```javascript
MODEL: import.meta.env.VITE_OPENAI_MODEL || 'chatgpt-4o-latest';
```

### 3. `src/lib/config/math.js`

Модель для математики осталась `gpt-5` (это правильно!):

```javascript
MODEL: import.meta.env.VITE_MATH_MODEL || 'gpt-5';
```

MAX_TOKENS увеличен до 16000 для сложных задач.

### 4. `src/lib/modules/chat/services.js`

Для Vision API используется chatgpt-4o-latest:

```javascript
const visionModel = hasImages ? 'chatgpt-4o-latest' : undefined;
```

### 5. `src/routes/api/chat/available-providers/+server.js`

Добавлена chatgpt-4o-latest в список доступных моделей.

### 6. `.env.example`

```bash
VITE_OPENAI_MODEL=chatgpt-4o-latest  # Для обычных запросов
VITE_MATH_MODEL=gpt-5                # Для математики
VITE_MATH_MAX_TOKENS=16000
```

## Как это работает сейчас

### Сценарий 1: Математический запрос

**Запрос:** "Реши уравнение: x² - 5x + 6 = 0"

**Что происходит:**

1. Классификатор определяет: `isMath: true, category: 'algebra'`
2. RequestEnhancer переопределяет модель на `gpt-5`
3. Логируется: "Math query detected - overriding user model selection"
4. Запрос отправляется в OpenAI с моделью `gpt-5`

**Результат:** Правильное решение с пошаговым объяснением

### Сценарий 2: Обычный запрос

**Запрос:** "Расскажи о кошках"

**Что происходит:**

1. Классификатор определяет: `isMath: false`
2. Используется модель, выбранная пользователем (или chatgpt-4o-latest по умолчанию)
3. Запрос обрабатывается обычным образом

### Сценарий 3: Запрос с изображением

**Запрос:** Загружено изображение с текстом

**Что происходит:**

1. Система определяет наличие изображения
2. Автоматически переключается на `chatgpt-4o-latest` (поддерживает Vision)
3. Изображение обрабатывается с помощью Vision API

## Конфигурация

### Переменные окружения

```bash
# Основная модель для обычных запросов
VITE_OPENAI_MODEL=chatgpt-4o-latest

# Модель для математики (требует специального доступа)
VITE_MATH_MODEL=gpt-5

# Максимум токенов для математики
VITE_MATH_MAX_TOKENS=16000

# Температура для математики (низкая = более точно)
VITE_MATH_TEMPERATURE=0.3
```

### Если нет доступа к gpt-5

```bash
# Используйте gpt-4o для математики
VITE_MATH_MODEL=gpt-4o
```

## Стоимость моделей

| Модель                 | Input    | Output   | Использование           |
| ---------------------- | -------- | -------- | ----------------------- |
| **gpt-5** (o1-preview) | $15/1M   | $60/1M   | Только математика       |
| **chatgpt-4o-latest**  | $5/1M    | $15/1M   | Обычные запросы, Vision |
| **gpt-4o**             | $2.50/1M | $10/1M   | Альтернатива            |
| **gpt-4o-mini**        | $0.15/1M | $0.60/1M | Простые задачи          |

**Рекомендация:**

- Математика → `gpt-5` (дорого, но максимально точно)
- Обычные вопросы → `chatgpt-4o-latest` (хороший баланс)
- Простые вопросы → `gpt-4o-mini` (экономия)

## Проверка работы

### 1. Проверьте логи

При математическом запросе вы должны видеть:

```
[ProviderManager] Query classification: { isMath: true, confidence: 0.95, category: 'geometry' }
[RequestEnhancer] Math query detected - overriding user model selection:
  { userSelected: 'qwen2.5:1.5b', mathModel: 'gpt-5', category: 'geometry' }
[OpenAI] Using model: gpt-5
Response generated using provider: openai, model: gpt-5
```

### 2. Тест математической задачи

Задайте вопрос:

```
В равнобедренном треугольнике ABC AB = BC = 4, AC = 2, BH− высота.
Вписанная в треугольник ABC окружность второй раз пересекает высоту BH в точке K.
Найдите BK : KH
```

**Ожидаемый результат:**

- ✅ Используется модель `gpt-5`
- ✅ Правильное решение с пошаговым объяснением
- ✅ Геометрические вычисления корректны

### 3. Тест обычного запроса

Задайте вопрос:

```
Привет, как дела?
```

**Ожидаемый результат:**

- ✅ Используется выбранная модель (или chatgpt-4o-latest)
- ✅ Нет переопределения модели

## Известные проблемы

### Проблема: "Model 'gpt-5' not found"

**Причина:** Модель `gpt-5` (o1-preview) требует специального доступа от OpenAI.

**Решение:**

```bash
# В .env используйте gpt-4o вместо gpt-5
VITE_MATH_MODEL=gpt-4o
```

### Проблема: Высокая стоимость

**Причина:** gpt-5 очень дорогая ($15/$60 за 1M токенов).

**Решение:** Используйте gpt-4o для математики, если стоимость критична:

```bash
VITE_MATH_MODEL=gpt-4o  # В 6 раз дешевле, но менее точная
```

### Проблема: Медленные ответы

**Причина:** gpt-5 использует chain-of-thought reasoning, что занимает больше времени.

**Решение:** Это нормально. gpt-5 думает дольше, но дает более точные ответы.

## Мониторинг

### Логи для отслеживания

```bash
# Смотреть классификацию запросов
grep "Query classification" logs/app.log

# Смотреть переопределение модели
grep "overriding user model selection" logs/app.log

# Смотреть использование gpt-5
grep "model: gpt-5" logs/app.log
```

### Метрики в админ-панели

Перейдите на `/admin/finance` чтобы увидеть:

- Количество запросов к каждой модели
- Стоимость использования gpt-5
- Общую статистику

## Заключение

Теперь система работает правильно:

1. ✅ Математические задачи **ВСЕГДА** используют `gpt-5` (самая точная)
2. ✅ Обычные запросы используют `chatgpt-4o-latest` (хороший баланс)
3. ✅ Изображения обрабатываются через Vision API (`chatgpt-4o-latest`)
4. ✅ Пользовательский выбор модели не влияет на математику

**Главное исправление:** Математические запросы больше не зависят от выбора пользователя - они всегда используют оптимальную модель для максимальной точности.

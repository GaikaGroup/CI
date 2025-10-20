# Math Reasoning Enhancement

## Обзор

Функция улучшения математических возможностей AI-тьютора автоматически определяет математические запросы и оптимизирует параметры генерации для получения детальных пошаговых решений.

## Основные возможности

### 1. Автоматическая классификация

Система автоматически определяет, является ли запрос пользователя математическим, анализируя:
- Математические ключевые слова (решить, вычислить, найти, доказать, etc.)
- Математические символы и формулы (+, -, =, ∫, ∑, etc.)
- Числовые выражения и уравнения
- Контекст предыдущих сообщений

### 2. Категоризация задач

Математические запросы классифицируются по категориям:
- **Алгебра** - уравнения, неравенства, системы
- **Геометрия** - фигуры, площади, теоремы
- **Математический анализ** - производные, интегралы, пределы
- **Теория вероятностей** - вероятность, статистика
- **Дискретная математика** - комбинаторика, графы, логика
- **Арифметика** - базовые вычисления

### 3. Оптимизация параметров

Для математических запросов автоматически:
- Увеличивается лимит токенов до 4000 (вместо 500-1000)
- Снижается temperature до 0.3 для более точных вычислений
- Добавляются специализированные system prompts
- Используется более мощная модель (GPT-4-turbo)

### 4. Специализированные промпты

Для каждой категории математики используется свой system prompt, который инструктирует модель:
- Показывать все шаги решения
- Объяснять каждое преобразование
- Использовать LaTeX для формул
- Проверять правильность ответа

## Конфигурация

### Environment Variables

```bash
# Основные настройки
VITE_MATH_ENABLE_AUTO_CLASSIFICATION=true  # Автоматическая классификация
VITE_MATH_ENABLE_REQUEST_ENHANCEMENT=true  # Улучшение параметров
VITE_MATH_ENABLE_SYSTEM_PROMPTS=true       # Специализированные промпты
VITE_MATH_MAX_TOKENS=4000                  # Максимум токенов
VITE_MATH_TEMPERATURE=0.3                  # Temperature для точности
VITE_MATH_MODEL=o1-preview                 # Предпочитаемая модель (лучшая для математики)
VITE_MATH_CONFIDENCE_THRESHOLD=0.5         # Порог уверенности (0.0-1.0)

# Локальные модели (опционально)
VITE_MATH_ENABLE_LOCAL_MODELS=false        # false = использовать GPT-4 (рекомендуется)
VITE_OLLAMA_MATH_MODEL=qwen2.5-math:7b     # Специализированная математическая модель
VITE_MATH_LOCAL_FALLBACK=true              # Fallback на GPT-4 при ошибках
VITE_MATH_LOCAL_TIMEOUT=30000              # Timeout для локальной модели

# ВАЖНО: Для математики рекомендуется использовать GPT-4 или qwen2.5-math:7b
# НЕ используйте обычный qwen2.5:7b - он не специализирован на математике!

# Настройки по категориям (опционально)
VITE_MATH_ALGEBRA_MAX_TOKENS=3000
VITE_MATH_GEOMETRY_MAX_TOKENS=3500
VITE_MATH_CALCULUS_MAX_TOKENS=4000
VITE_MATH_PROBABILITY_MAX_TOKENS=3500
VITE_MATH_DISCRETE_MAX_TOKENS=3500
VITE_MATH_ARITHMETIC_MAX_TOKENS=2000
```

### Дефолтные настройки агентов

Обновлены дефолтные параметры для всех агентов:

```javascript
export const DEFAULT_AGENT_CONFIG = {
  model: 'gpt-4-turbo',  // Изменено с gpt-3.5-turbo
  temperature: 0.7,
  maxTokens: 4000        // Изменено с 1000
};
```

## Использование

### Автоматическое использование

Функция работает автоматически - просто отправьте математический запрос:

```
Пользователь: Реши уравнение: 2x + 5 = 13
```

Система автоматически:
1. Определит, что это математический запрос (алгебра)
2. Увеличит maxTokens до 4000
3. Добавит специализированный промпт для алгебры
4. Сгенерирует детальное пошаговое решение

### Примеры запросов

**Алгебра:**
```
Реши систему уравнений:
2x + y = 5
x - y = 1
```

**Геометрия:**
```
Найди площадь треугольника со сторонами 3, 4 и 5
```

**Математический анализ:**
```
Найди производную функции f(x) = x³ + 2x² - 5x + 1
```

**Теория вероятностей:**
```
Какова вероятность выпадения двух шестёрок при броске двух кубиков?
```

## Мониторинг и метрики

### Логирование

Система логирует информацию о классификации:

```javascript
console.info(`Math enhancement applied - Category: algebra, Confidence: 0.85`);
```

### Метрики

Доступны следующие метрики через `usageTracker.getMathSummary()`:

```javascript
{
  totalMathQueries: 150,           // Всего математических запросов
  totalTokens: 450000,             // Всего использовано токенов
  avgTokens: 3000,                 // Среднее на запрос
  totalCost: 5.40,                 // Общая стоимость (USD)
  avgCost: 0.036,                  // Средняя стоимость на запрос
  categories: [
    {
      category: 'algebra',
      count: 50,
      totalTokens: 150000,
      avgTokens: 3000,
      totalCost: 1.80,
      avgCost: 0.036,
      avgConfidence: 0.87
    },
    // ... другие категории
  ],
  recentClassifications: [...]     // Последние 10 классификаций
}
```

### API для получения метрик

Можно добавить endpoint для получения статистики:

```javascript
// GET /api/analytics/math
export async function GET() {
  const mathSummary = usageTracker.getMathSummary();
  return json(mathSummary);
}
```

## Архитектура

### Компоненты

1. **MathQueryClassifier** (`src/lib/modules/llm/classifiers/MathQueryClassifier.js`)
   - Классифицирует запросы как математические
   - Определяет категорию математики
   - Вычисляет confidence score

2. **RequestEnhancer** (`src/lib/modules/llm/enhancers/RequestEnhancer.js`)
   - Улучшает параметры запроса для математики
   - Добавляет специализированные system prompts
   - Оптимизирует maxTokens и temperature

3. **ProviderManager** (`src/lib/modules/llm/ProviderManager.js`)
   - Интегрирует классификатор и enhancer
   - Метод `generateChatCompletionWithEnhancement()`
   - Добавляет метаданные в ответ

4. **UsageTracker** (`src/lib/modules/analytics/UsageTracker.js`)
   - Отслеживает математические запросы
   - Собирает метрики по категориям
   - Вычисляет стоимость и использование токенов

### Поток данных

```
User Message
     ↓
[MathQueryClassifier] → Classification (isMath, category, confidence)
     ↓
[RequestEnhancer] → Enhanced Options (maxTokens: 4000, system prompt)
     ↓
[ProviderManager] → LLM Request
     ↓
[LLM Provider] → Detailed Solution
     ↓
[UsageTracker] → Record Metrics
     ↓
Response to User
```

## Производительность

### Стоимость

При использовании GPT-4-turbo:
- Input: $10 / 1M tokens
- Output: $30 / 1M tokens

Средний математический запрос (4000 токенов):
- Input: ~500 токенов = $0.005
- Output: ~3500 токенов = $0.105
- **Итого: ~$0.11 на запрос**

Для сравнения, GPT-3.5-turbo с 1000 токенов:
- Input: $0.5 / 1M tokens
- Output: $1.5 / 1M tokens
- Средний запрос: ~$0.002

**Вывод:** GPT-4-turbo дороже в ~55 раз, но даёт значительно более качественные решения.

### Время ответа

- GPT-4-turbo: 10-20 секунд для 4000 токенов
- GPT-3.5-turbo: 3-5 секунд для 1000 токенов
- Локальные модели (Ollama): 20-40 секунд

## Локальные математические модели

### Поддерживаемые модели

Для использования с Ollama:
- **qwen2.5-math:7b** - специализированная модель для математики
- **deepseek-math:7b** - альтернативная математическая модель

### Установка

```bash
# Установить модель
ollama pull qwen2.5-math:7b

# Настроить в .env
VITE_MATH_ENABLE_LOCAL_MODELS=true
VITE_OLLAMA_MATH_MODEL=qwen2.5-math:7b
```

### Преимущества локальных моделей

- ✅ Бесплатно (нет API costs)
- ✅ Приватность (данные не покидают систему)
- ✅ Работает офлайн
- ❌ Медленнее (20-40 сек)
- ❌ Требует ресурсов (8+ GB RAM)

## Troubleshooting

### Проблема: Классификация неточная

**Решение:** Настройте порог уверенности:
```bash
VITE_MATH_CONFIDENCE_THRESHOLD=0.7  # Увеличить с 0.5
```

### Проблема: Слишком дорого

**Решение 1:** Используйте локальные модели
```bash
VITE_MATH_ENABLE_LOCAL_MODELS=true
```

**Решение 2:** Уменьшите maxTokens для простых категорий
```bash
VITE_MATH_ARITHMETIC_MAX_TOKENS=1500
VITE_MATH_ALGEBRA_MAX_TOKENS=2500
```

### Проблема: Медленные ответы

**Решение:** Используйте GPT-3.5-turbo для простых задач
```bash
VITE_MATH_ARITHMETIC_MODEL=gpt-3.5-turbo
```

## Будущие улучшения

1. **Мультимодальность** - распознавание рукописных формул
2. **Интерактивность** - пошаговое решение с подсказками
3. **Проверка** - автоматическая проверка ответов пользователя
4. **Визуализация** - графики функций, геометрические фигуры
5. **Адаптивность** - обучение на feedback пользователей

## Ссылки

- [MathQueryClassifier.js](../src/lib/modules/llm/classifiers/MathQueryClassifier.js)
- [RequestEnhancer.js](../src/lib/modules/llm/enhancers/RequestEnhancer.js)
- [ProviderManager.js](../src/lib/modules/llm/ProviderManager.js)
- [math.js config](../src/lib/config/math.js)

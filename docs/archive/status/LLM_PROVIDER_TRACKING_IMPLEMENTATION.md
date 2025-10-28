# LLM Provider Tracking Implementation

## Обзор

Добавлена функциональность отслеживания LLM провайдеров в сессиях и статистике.

## Реализованные изменения

### 1. Отображение провайдеров на странице Admin Sessions

**Страница:** `/admin/sessions` (http://localhost:3002/admin/sessions)

**Изменения:**

#### Backend (SessionService)

- **Файл:** `src/lib/modules/session/services/SessionService.js`
- Добавлена функция `extractLLMProviders()` для извлечения уникальных провайдеров из метаданных сообщений
- Обновлены методы:
  - `getUserSessions()` - теперь возвращает `llmProviders` для каждой сессии
  - `getAllSessions()` - теперь возвращает `llmProviders` для каждой сессии
  - `searchSessions()` - теперь возвращает `llmProviders` для каждой сессии

**Как работает:**

```javascript
// Извлекаем провайдеры из assistant сообщений
messages: {
  select: { metadata: true },
  where: { type: 'assistant' }
}

// Извлекаем уникальные провайдеры
llmProviders: extractLLMProviders(session.messages)
// Результат: ['openai', 'ollama'] или ['openai'] и т.д.
```

#### Frontend (AdminSessionManager)

- **Файл:** `src/lib/modules/admin/components/AdminSessionManager.svelte`
- Добавлено отображение LLM провайдеров под информацией о сессии
- Провайдеры отображаются как цветные badges:
  - OpenAI: зеленый badge
  - Ollama: синий badge
  - Другие: серый badge

**Пример отображения:**

```
Session Title
User: xxx | Messages: 4 | Language: ru | Updated: ...
LLM: [openai] [ollama]
```

### 2. Pie Chart с распределением LLM провайдеров

**Страница:** `/stats` (http://localhost:3002/stats)

**Изменения:**

#### Backend (StatsService)

- **Файл:** `src/lib/modules/stats/services/StatsService.js`
- Добавлен метод `getLLMProviderStats(timeRange)`:
  - Получает все assistant сообщения за период
  - Извлекает провайдеры из metadata
  - Подсчитывает количество и процент для каждого провайдера
  - Возвращает отсортированный список провайдеров

**Структура данных:**

```javascript
{
  providerDistribution: [
    { provider: 'ollama', count: 150, percentage: '75.0' },
    { provider: 'openai', count: 50, percentage: '25.0' }
  ],
  totalMessages: 200,
  totalMessagesWithoutProvider: 10
}
```

- Обновлен метод `getOverviewStats()` для включения `llmProviders`

#### Frontend (Stats Page)

- **Файл:** `src/routes/stats/+page.svelte`
- Добавлен новый блок "LLM Provider Usage" с:
  - **Pie Chart** - визуальное представление распределения провайдеров
  - **Legend** - список провайдеров с цветами, количеством сообщений и процентами
  - Информация о сообщениях без провайдера (если есть)

**Цвета провайдеров:**

- Провайдер 1: зеленый (#10b981)
- Провайдер 2: синий (#3b82f6)
- Провайдер 3: оранжевый (#f59e0b)
- Провайдер 4: красный (#ef4444)
- Провайдер 5: фиолетовый (#8b5cf6)

## Технические детали

### Извлечение провайдеров из метаданных

Провайдеры хранятся в metadata сообщений:

```javascript
message.metadata = {
  llm: {
    provider: 'ollama',
    model: 'qwen2.5:1.5b',
    config: { ... },
    timestamp: '2025-10-25T19:16:40.313Z'
  }
}
```

### Оптимизация запросов

- Используется `include` с фильтром `where: { type: 'assistant' }` для получения только нужных сообщений
- Провайдеры извлекаются на уровне приложения (не в БД) для гибкости
- Результаты кэшируются в StatsService на 10 минут

### Кэширование

StatsService использует кэш для оптимизации:

```javascript
cacheKey: `llm-providers-${timeRange}`;
cacheTimeout: 10 * 60 * 1000; // 10 минут
```

## Примеры использования

### 1. Просмотр провайдеров в сессии

1. Перейти на `/admin/sessions`
2. В списке сессий под каждой сессией отображаются использованные LLM провайдеры
3. Если в сессии использовались разные провайдеры (например, fallback с OpenAI на Ollama), будут показаны оба

### 2. Анализ распределения провайдеров

1. Перейти на `/stats`
2. Найти блок "LLM Provider Usage"
3. Pie chart показывает визуальное распределение
4. Legend показывает точные цифры и проценты

### 3. Фильтрация по времени

На странице статистики можно выбрать период:

- Last Hour
- Last 24 Hours
- Last 7 Days
- Last 30 Days (по умолчанию)
- Last Year

## Преимущества

1. **Прозрачность**: Видно какие провайдеры используются в каждой сессии
2. **Аналитика**: Можно отслеживать распределение использования провайдеров
3. **Оптимизация затрат**: Понимание какой провайдер используется чаще помогает оптимизировать расходы
4. **Отладка**: Легко увидеть когда происходит fallback между провайдерами

## Связанные файлы

### Измененные файлы:

1. `src/lib/modules/session/services/SessionService.js` - добавлена логика извлечения провайдеров
2. `src/lib/modules/admin/components/AdminSessionManager.svelte` - добавлено отображение провайдеров
3. `src/lib/modules/stats/services/StatsService.js` - добавлена статистика по провайдерам
4. `src/routes/stats/+page.svelte` - добавлен pie chart

### API Endpoints:

- `GET /api/admin/sessions` - теперь возвращает `llmProviders` для каждой сессии
- `GET /api/stats/overview` - теперь включает `llmProviders` в ответ

## Тестирование

### Ручное тестирование:

1. **Admin Sessions:**

   ```bash
   # Открыть в браузере
   http://localhost:3002/admin/sessions

   # Проверить что под каждой сессией отображаются LLM провайдеры
   ```

2. **Stats Page:**

   ```bash
   # Открыть в браузере
   http://localhost:3002/stats

   # Проверить что отображается pie chart с провайдерами
   # Проверить что проценты суммируются в 100%
   ```

### Проверка данных:

```javascript
// Проверить что провайдеры извлекаются правильно
const session = await SessionService.getAllSessions({ limit: 1 });
console.log(session.sessions[0].llmProviders); // ['openai', 'ollama']

// Проверить статистику
const stats = await StatsService.getLLMProviderStats('30d');
console.log(stats.providerDistribution);
```

## Будущие улучшения

1. **Детальная статистика по моделям**: Не только провайдер, но и конкретная модель (gpt-4, qwen2.5:1.5b)
2. **Фильтрация сессий по провайдеру**: Возможность фильтровать сессии по используемому провайдеру
3. **Временные графики**: График изменения использования провайдеров во времени
4. **Стоимость по провайдерам**: Интеграция с финансовой статистикой
5. **Алерты**: Уведомления при частых fallback'ах

## Связанные документы

- [Command-Specific Temperatures](./docs/features/command-specific-temperatures.md)
- [Session LLM Tracking Requirements](./.kiro/specs/session-llm-tracking/requirements.md)
- [Session LLM Tracking Tasks](./.kiro/specs/session-llm-tracking/tasks.md)

# Command Parameters Fix

## Проблема

Пользователь написал `/explain теорема пифагора`, но бот ответил "Привет! Как я могу помочь?" вместо того чтобы объяснить теорему Пифагора.

**Причина:** System prompt описывал команды только как КОНТЕКСТНЫЕ (работающие с предыдущими сообщениями), но не объяснял что команды могут принимать параметры в том же сообщении.

## Решение

Обновлен system prompt чтобы поддерживать ДВА способа использования команд:

### 1. Команда С параметром (в одном сообщении)

```
/explain теорема пифагора
/solve 2x + 5 = 15
/практика 3 задачи
```

### 2. Команда БЕЗ параметра (контекстная)

```
Пользователь: "теорема пифагора"
Бот: [объясняет]
Пользователь: "/explain"  ← объяснить подробнее ТУ ЖЕ тему
```

## Изменения в System Prompt

### Было:

```
The student can use special commands that start with "/" to request specific actions.
These commands are CONTEXTUAL and refer to the previous conversation:

Available commands:
- /explain: Explain the concept from the previous message
```

### Стало:

```
The student can use special commands that start with "/" to request specific actions.

Commands can be used in TWO ways:
1. WITH a topic in the same message: "/explain теорема пифагора" - explain this specific topic
2. WITHOUT a topic (contextual): "/explain" - explain the topic from previous messages

Available commands:
- /explain: Explain the concept or topic.
  Can be used as "/explain квадратные уравнения" or just "/explain"
```

### Добавлены примеры:

```
Example 1 (Command WITH topic in same message):
- Student: "/explain теорема пифагора"
- You MUST: Explain Pythagorean theorem immediately
- DO NOT say "Привет! Как я могу помочь?"
- DO NOT ignore the command
- CORRECT: Start explaining the Pythagorean theorem

Example 2 (Command WITHOUT topic - contextual):
- Student: "теория струн"
- You: [explain string theory]
- Student: "/explain"
- You MUST: Explain string theory in MORE DETAIL

Example 3 (Command with specific problem):
- Student: "/solve 2x + 5 = 15"
- You MUST: Solve this equation step by step immediately
```

## Поддерживаемые форматы

### Все команды теперь поддерживают оба формата:

| Команда     | С параметром                    | Без параметра (контекстная)        |
| ----------- | ------------------------------- | ---------------------------------- |
| `/explain`  | `/explain квадратные уравнения` | `/explain` (после обсуждения темы) |
| `/solve`    | `/solve 2x+5=15`                | `/solve` (после постановки задачи) |
| `/check`    | `/check ответ: x=5`             | `/check` (после решения)           |
| `/practice` | `/practice 3 задачи`            | `/practice` (по текущей теме)      |
| `/test`     | `/test`                         | `/test` (по текущей теме)          |
| `/essay`    | `/essay тема="образование"`     | `/essay` (по текущей теме)         |

## Ожидаемое поведение

### Тест 1: Команда с параметром

```
Пользователь: "/explain теорема пифагора"
Ожидается: Бот сразу объясняет теорему Пифагора
НЕ ожидается: "Привет! Как я могу помочь?"
```

### Тест 2: Контекстная команда

```
Пользователь: "расскажи про производные"
Бот: [объясняет производные]
Пользователь: "/explain"
Ожидается: Бот объясняет производные ПОДРОБНЕЕ
```

### Тест 3: Команда с числовым параметром

```
Пользователь: "/практика 5 задач"
Ожидается: Бот генерирует 5 задач по текущей теме или общих задач
```

## Преимущества

1. ✅ Более гибкое использование команд
2. ✅ Не нужно сначала писать тему, потом команду
3. ✅ Быстрее для пользователя
4. ✅ Интуитивно понятно

## Связанные изменения

- Файл: `src/routes/api/chat/+server.js`
- Секция: Command descriptions and examples
- Тип изменения: Улучшение system prompt

## Заключение

Теперь команды поддерживают оба способа использования:

- **С параметром:** `/explain теорема пифагора` - быстро и удобно
- **Без параметра:** `/explain` - для уточнения текущей темы

Это делает систему более гибкой и удобной для пользователей.

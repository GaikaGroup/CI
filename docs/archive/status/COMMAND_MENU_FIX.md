# Command Menu Fix

## Проблема

В UI меню команд отображалась команда `/help`, которую нужно было удалить, и отсутствовала команда `/test`.

## Решение

### Файл: `src/lib/config/tutorCommands.json`

**Удалено:**

```json
{
  "id": "help",
  "category": "reference",
  "translations": {
    "en": {
      "name": "/help",
      "description": "Shows this help menu",
      "example": "/help"
    },
    ...
  }
}
```

**Добавлено:**

```json
{
  "id": "test",
  "category": "assessment",
  "translations": {
    "en": {
      "name": "/test",
      "description": "Creates a 5-question multiple-choice test",
      "example": "/test"
    },
    "ru": {
      "name": "/тест",
      "description": "Создает тест из 5 вопросов с вариантами ответов",
      "example": "/тест"
    },
    "es": {
      "name": "/prueba",
      "description": "Crea una prueba de 5 preguntas de opción múltiple",
      "example": "/prueba"
    }
  }
}
```

## Результат

Теперь в UI меню команд:

- ✅ Удалена команда `/help`
- ✅ Добавлена команда `/test` с описанием на 3 языках
- ✅ Команда `/test` создает тест из 5 вопросов с 4 вариантами ответов

## Список команд в UI

1. `/explain` - Explains a topic in simple terms
2. `/solve` - Solves a problem step by step
3. `/check` - Checks your answer, text, code, or essay
4. `/practice` - Gives similar exercises for practice
5. `/notes` - Creates a short summary or cheatsheet
6. `/essay` - Writes an essay on a given topic
7. `/test` - Creates a 5-question multiple-choice test ⭐ NEW

## Связь с System Prompt

Команда `/test` в UI теперь соответствует описанию в system prompt:

- 5 вопросов
- 4 варианта ответа (A, B, C, D)
- БЕЗ правильных ответов

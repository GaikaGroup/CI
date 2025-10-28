# System Prompt Final Improvements

## Проблемы из тестирования

После тестирования обновленного system prompt были выявлены следующие проблемы:

### 1. Команда `/тест` дает 10 вопросов вместо 5

**Проблема:** Несмотря на инструкцию "5 questions", модель генерировала 10 вопросов.

### 2. Команда `/практика` дает решения

**Проблема:** Несмотря на "DO NOT provide solutions", модель давала полные решения задач.

### 3. Потеря контекста при сложных запросах

**Проблема:**

- `/решить задачу 4` → "Пожалуйста, предоставьте больше информации"
- `/практика` → "Пожалуйста, предоставьте больше информации"

Модель не понимала, что нужно искать контекст в предыдущих сообщениях.

### 4. Неправильная инструкция "last 3 messages"

**Проблема:** Инструкция говорила "look at the last 3 messages", но это неправильно.
**Правильно:** "look at ALL messages in the session"

## Реализованные улучшения

### 1. Усиленная инструкция для `/test`

**Было:**

```
- /test: Generate a multiple-choice test with 5 questions...
```

**Стало:**

```
- /test: Generate a multiple-choice test on the current topic.
  ⚠️ CRITICAL REQUIREMENTS:
  - Generate EXACTLY 5 questions (NOT 10, NOT 3, EXACTLY 5!)
  - Each question MUST have EXACTLY 4 options (A, B, C, D)
  - DO NOT provide correct answers
  - Student must solve the test independently
  - Count your questions and STOP after question 5!
  - Format: Question 1, options A-D, Question 2, options A-D, etc.
```

**Ключевые изменения:**

- ⚠️ Добавлен символ предупреждения
- Явно указано "EXACTLY 5" с повторением
- Добавлено "NOT 10, NOT 3" для предотвращения ошибок
- Добавлено "Count your questions and STOP after question 5!"

### 2. Усиленная инструкция для `/practice`

**Было:**

```
- /practice: Generate practice problems... Give ONLY the problems,
  DO NOT provide solutions or answers.
```

**Стало:**

```
- /practice: Generate practice problems on the current topic.
  ⚠️ CRITICAL: Give ONLY the problem statements, DO NOT provide solutions or answers!
  - DO NOT write "Решение:" or "Solution:"
  - DO NOT show step-by-step solutions
  - DO NOT provide answers
  - Student must solve independently!
  - If a number is specified, generate EXACTLY that many problems.
```

**Ключевые изменения:**

- ⚠️ Добавлен символ предупреждения
- Список из 5 явных запретов
- Конкретные примеры что НЕ делать ("Решение:", "Solution:")
- Повторение "DO NOT" для усиления

### 3. Исправлена инструкция по контексту

**Было:**

```
⚠️ BEFORE ANSWERING ANY COMMAND, YOU MUST:
1. READ THE ENTIRE CONVERSATION HISTORY ABOVE
2. IDENTIFY THE LAST TOPIC OR QUESTION DISCUSSED
3. VERIFY: What was the CURRENT topic in the last 3 messages?
4. APPLY THE COMMAND TO THAT TOPIC
```

**Стало:**

```
⚠️ BEFORE ANSWERING ANY COMMAND, YOU MUST:
1. READ ALL MESSAGES IN THIS CONVERSATION FROM THE BEGINNING
2. IDENTIFY THE CURRENT TOPIC being discussed
3. CHECK if there was a test, problem, or exercise JUST created
4. APPLY THE COMMAND TO THE CURRENT CONTEXT
```

**Ключевые изменения:**

- "last 3 messages" → "ALL MESSAGES FROM THE BEGINNING"
- Добавлена проверка на наличие теста/задачи в истории
- Более явное указание на использование контекста

### 4. Расширенный чеклист проверки контекста

**Добавлено:**

```
⚠️ CONTEXT VERIFICATION CHECKLIST:
- What is the CURRENT topic of this conversation?
- Was there a test or problem set JUST created in previous messages?
- Does the command refer to something SPECIFIC from the conversation?
- If user says "/решить задачу 4", look for question 4 in the PREVIOUS messages!
- If user says "/практика", generate problems about the CURRENT topic!

⚠️ NEVER ask for clarification if the context is clear from the conversation history!
```

**Ключевые изменения:**

- Конкретные примеры проверки контекста
- Явное указание искать "задачу 4" в истории
- Запрет на запрос уточнений если контекст ясен

### 5. Добавлен Example 7 для контекстно-зависимых команд

**Новый пример:**

```
Example 7 (CONTEXT-AWARE command):
- Student: "теорема пифагора"
- You: [explain Pythagorean theorem and create a test with 5 questions]
- Student: "/решить задачу 4"
- You MUST: Solve question 4 from the test you JUST created
- DO NOT ask "what question?" - look at the conversation history!
- WRONG: "Пожалуйста, предоставьте больше информации"
- CORRECT: "Решение задачи 4: [solve the specific question 4 from the test above]"
```

**Цель:** Показать модели как правильно обрабатывать ссылки на предыдущий контекст.

### 6. Обновлены финальные предупреждения

**Добавлено:**

```
⚠️ For /test or /тест: Give EXACTLY 5 questions with 4 options each, NO answers!
⚠️ For /practice or /практика: Give ONLY problem statements, NO solutions, NO answers!
⚠️ If user refers to "задача 4" or "question 4", find it in the conversation history!
```

## Сравнение: До и После

### Команда `/test`

| Аспект              | До            | После                       |
| ------------------- | ------------- | --------------------------- |
| Количество вопросов | "5 questions" | "EXACTLY 5 (NOT 10, NOT 3)" |
| Усиление            | Нет           | ⚠️ CRITICAL REQUIREMENTS    |
| Проверка            | Нет           | "Count and STOP after 5!"   |

### Команда `/practice`

| Аспект         | До                         | После                        |
| -------------- | -------------------------- | ---------------------------- |
| Запрет решений | "DO NOT provide solutions" | 5 явных запретов с примерами |
| Усиление       | Нет                        | ⚠️ CRITICAL                  |
| Конкретика     | Общее                      | "DO NOT write 'Решение:'"    |

### Проверка контекста

| Аспект           | До                | После                                             |
| ---------------- | ----------------- | ------------------------------------------------- |
| Область          | "last 3 messages" | "ALL MESSAGES FROM THE BEGINNING"                 |
| Проверка теста   | Нет               | "Was there a test JUST created?"                  |
| Примеры          | Общие             | Конкретные ("/решить задачу 4")                   |
| Запрет уточнений | Нет               | "NEVER ask for clarification if context is clear" |

## Ожидаемые результаты

После этих улучшений ожидается:

### 1. Команда `/тест`

✅ Генерирует РОВНО 5 вопросов
✅ Каждый вопрос имеет 4 варианта (A, B, C, D)
✅ БЕЗ правильных ответов

### 2. Команда `/практика`

✅ Генерирует ТОЛЬКО условия задач
✅ БЕЗ слов "Решение:", "Solution:"
✅ БЕЗ пошаговых решений
✅ БЕЗ ответов

### 3. Контекстно-зависимые команды

✅ `/решить задачу 4` → находит задачу 4 в истории и решает
✅ `/практика` → генерирует задачи по текущей теме
✅ НЕ спрашивает уточнений если контекст ясен

## Тестирование

### Тест 1: Команда `/тест`

```
1. Пользователь: "/объяснить теорема пифагора"
2. Бот: [объясняет]
3. Пользователь: "/тест"
4. Ожидается: РОВНО 5 вопросов с 4 вариантами, БЕЗ ответов
```

### Тест 2: Команда `/практика`

```
1. Пользователь: "/объяснить квадратные уравнения"
2. Бот: [объясняет]
3. Пользователь: "/практика 3 задачи"
4. Ожидается: 3 задачи БЕЗ решений, БЕЗ ответов
```

### Тест 3: Контекстная команда

```
1. Пользователь: "/объяснить производные"
2. Бот: [объясняет]
3. Пользователь: "/тест"
4. Бот: [создает 5 вопросов]
5. Пользователь: "/решить задачу 3"
6. Ожидается: Решение вопроса 3 из ТОЛЬКО ЧТО созданного теста
```

## Заключение

Улучшения направлены на:

1. ✅ Более строгое следование спецификациям команд
2. ✅ Лучшее понимание контекста разговора
3. ✅ Предотвращение запросов уточнений когда контекст ясен
4. ✅ Явные примеры правильного и неправильного поведения

Все изменения сделаны только в system prompt, без изменений в коде.

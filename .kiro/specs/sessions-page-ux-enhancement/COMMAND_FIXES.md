# Исправления Обработки Команд

## Дата: 21 октября 2024

## Проблемы

### 1. Неправильное описание команды /essay

**Проблема:** Команда `/essay` имела описание "Help with essay writing" (Помощь с написанием эссе), что подразумевает помощь, а не написание.

**Ожидаемое поведение:** "Write an essay" (Написать эссе)

### 2. Отсутствие контекстной обработки команд

**Проблема:** Команды не обрабатывались в контексте предыдущих сообщений сессии.

**Пример проблемного сценария:**

1. Студент: "Реши уравнение 2x + 5 = 15"
2. Бот: [решает уравнение]
3. Студент: "/explain"
4. Бот: [не понимает, что нужно объяснить решение из предыдущего сообщения]

**Ожидаемое поведение:** Команда `/explain` должна относиться к решению уравнения из предыдущего сообщения.

---

## Исправления

### 1. Обновлено описание команды /essay

**Файл:** `src/lib/config/tutorCommands.json`

**Изменения:**

```json
{
  "id": "essay",
  "category": "writing",
  "translations": {
    "en": {
      "name": "/essay",
      "description": "Write an essay on the current topic" // Было: "Help with essay writing"
    },
    "ru": {
      "name": "/эссе",
      "description": "Написать эссе по текущей теме" // Было: "Помощь с написанием эссе"
    },
    "es": {
      "name": "/ensayo",
      "description": "Escribir un ensayo sobre el tema actual" // Было: "Ayuda con la escritura de ensayos"
    }
  }
}
```

### 2. Добавлена контекстная обработка команд в системный промпт

**Файл:** `src/routes/api/chat/+server.js`

**Добавлен раздел в baseSystemPrompt:**

```javascript
IMPORTANT - COMMAND PROCESSING RULES:
The student can use special commands that start with "/" to request specific actions. These commands are CONTEXTUAL and refer to the previous conversation:

Available commands:
- /solve or /решить or /resolver: Solve the problem or equation from the previous message step by step
- /explain or /объяснить or /explicar: Explain the concept, solution, or topic from the previous message in more detail
- /check or /проверить or /verificar: Check the student's work from the previous message for errors
- /example or /пример or /ejemplo: Show an example related to the current topic or previous message
- /cheatsheet or /шпаргалка or /guía: Create a quick reference guide for the current topic
- /test or /тест or /prueba: Generate practice questions on the current topic
- /conspect or /конспект or /notas: Create study notes for the current topic
- /plan or /план: Create a study plan for the current topic
- /essay or /эссе or /ensayo: Write an essay on the current topic

CRITICAL COMMAND CONTEXT RULES:
1. When a student uses a command, it ALWAYS refers to the PREVIOUS message or conversation context
2. Example flow:
   - Student: "2x + 5 = 15"
   - You: [provide solution]
   - Student: "/explain"
   - You: [explain the solution you just provided in detail]
3. Another example:
   - Student: "/solve x² - 4 = 0"
   - You: [solve the equation]
   - Student: "/check my solution: x = 2"
   - You: [check if x = 2 is correct for the equation x² - 4 = 0]
4. Commands without additional text refer to the immediately previous topic
5. Commands with additional text (e.g., "/solve 2x + 3 = 7") introduce a NEW problem to solve
6. ALWAYS look at the conversation history to understand what the command refers to
```

---

## Примеры Правильного Поведения

### Пример 1: Команда /explain после решения

**Сценарий:**

```
Студент: "Реши уравнение 2x + 5 = 15"
Бот: "Решение:
     2x + 5 = 15
     2x = 15 - 5
     2x = 10
     x = 5"
Студент: "/explain"
```

**Ожидаемое поведение:**
Бот объясняет решение уравнения 2x + 5 = 15, которое было в предыдущем сообщении.

### Пример 2: Команда /check после попытки решения

**Сценарий:**

```
Студент: "/solve x² - 4 = 0"
Бот: "Решение:
     x² - 4 = 0
     x² = 4
     x = ±2
     Ответ: x = 2 или x = -2"
Студент: "/check мое решение: x = 2"
```

**Ожидаемое поведение:**
Бот проверяет, правильно ли решение x = 2 для уравнения x² - 4 = 0 из предыдущего сообщения.

### Пример 3: Команда /essay

**Сценарий:**

```
Студент: "Расскажи о фотосинтезе"
Бот: [объясняет фотосинтез]
Студент: "/essay"
```

**Ожидаемое поведение:**
Бот пишет эссе о фотосинтезе (тема из предыдущего сообщения).

### Пример 4: Команда с новым контекстом

**Сценарий:**

```
Студент: "/solve 3x + 7 = 22"
```

**Ожидаемое поведение:**
Бот решает новое уравнение 3x + 7 = 22 (команда с дополнительным текстом вводит новую задачу).

---

## Технические Детали

### Как работает контекстная обработка

1. **История сообщений передается в LLM:**

   ```javascript
   if (sessionContext?.history && sessionContext.history.length > 0) {
     sessionContext.history.forEach((entry) => {
       messages.push({ role: entry.role, content: entry.content });
     });
   }
   ```

2. **Системный промпт содержит правила обработки команд:**
   - LLM получает инструкции о том, что команды контекстуальные
   - LLM знает, что нужно смотреть на предыдущие сообщения
   - LLM понимает разницу между командой без текста и командой с текстом

3. **Многоязычная поддержка:**
   - Все команды имеют варианты на английском, русском и испанском
   - LLM знает все варианты команд
   - Контекстная обработка работает на всех языках

### Поддерживаемые языки команд

| Команда    | English     | Русский    | Español    |
| ---------- | ----------- | ---------- | ---------- |
| Solve      | /solve      | /решить    | /resolver  |
| Explain    | /explain    | /объяснить | /explicar  |
| Check      | /check      | /проверить | /verificar |
| Example    | /example    | /пример    | /ejemplo   |
| Cheatsheet | /cheatsheet | /шпаргалка | /guía      |
| Test       | /test       | /тест      | /prueba    |
| Conspect   | /conspect   | /конспект  | /notas     |
| Plan       | /plan       | /план      | /plan      |
| Essay      | /essay      | /эссе      | /ensayo    |

---

## Тестирование

### Ручное тестирование

Для проверки исправлений:

1. **Тест команды /essay:**

   ```
   1. Студент: "Расскажи о глобальном потеплении"
   2. Бот: [объясняет]
   3. Студент: "/essay"
   4. Проверить: Бот должен написать эссе о глобальном потеплении
   ```

2. **Тест контекстной команды /explain:**

   ```
   1. Студент: "Реши 5x - 3 = 12"
   2. Бот: [решает]
   3. Студент: "/explain"
   4. Проверить: Бот должен объяснить решение уравнения 5x - 3 = 12
   ```

3. **Тест команды /check:**

   ```
   1. Студент: "/solve x + 7 = 10"
   2. Бот: [решает: x = 3]
   3. Студент: "/check x = 3"
   4. Проверить: Бот должен проверить, что x = 3 правильно для x + 7 = 10
   ```

4. **Тест многоязычности:**
   ```
   1. Студент (на русском): "Реши 2x = 8"
   2. Бот: [решает на русском]
   3. Студент: "/объяснить"
   4. Проверить: Бот должен объяснить на русском
   ```

### Автоматическое тестирование

Можно добавить тесты в `tests/integration/chat/`:

```javascript
describe('Command Context Processing', () => {
  it('should process /explain command in context', async () => {
    // 1. Send problem
    // 2. Get solution
    // 3. Send /explain
    // 4. Verify explanation refers to the solution
  });

  it('should process /essay command correctly', async () => {
    // 1. Discuss topic
    // 2. Send /essay
    // 3. Verify essay is written about the topic
  });
});
```

---

## Влияние на Пользователей

### Положительные изменения

1. **Более интуитивное поведение команд:**
   - Студенты могут использовать команды естественным образом
   - Не нужно повторять контекст в каждой команде

2. **Правильное описание /essay:**
   - Студенты понимают, что команда напишет эссе, а не просто поможет

3. **Улучшенный учебный процесс:**
   - Команды работают как ожидается
   - Более плавный диалог с ботом

### Обратная совместимость

- ✅ Все существующие команды продолжают работать
- ✅ Команды с дополнительным текстом работают как раньше
- ✅ Многоязычная поддержка сохранена
- ✅ Никаких breaking changes

---

## Дополнительные Улучшения (Будущее)

### Возможные улучшения

1. **Явное указание контекста:**

   ```
   /explain #2  // Объяснить сообщение #2
   /check @previous  // Проверить предыдущее решение
   ```

2. **Цепочки команд:**

   ```
   /solve && /explain  // Решить и объяснить
   ```

3. **Умные подсказки:**
   - Если студент пишет "/explain" без контекста, бот может спросить: "Что именно объяснить?"

4. **История команд:**
   - Показывать студенту, какие команды он использовал в сессии

---

## Дополнительное улучшение: Умное предложение контекста

### Дата обновления: 21 октября 2024

После тестирования было добавлено дополнительное улучшение - "умное предложение контекста".

### Проблема

Когда студент работает над темой A, а затем дает команду с темой B, бот не предлагает использовать тему A.

**Пример:**

```
Студент: [большой конспект о Барселоне]
Студент: "/эссе как я провел лето у бабушки"
Бот: [пишет эссе о лете у бабушки]
```

**Улучшение:**
Бот теперь может предложить тему из контекста:

```
Студент: [большой конспект о Барселоне]
Студент: "/эссе как я провел лето у бабушки"
Бот: "Я вижу, что вы хотите эссе о том, как провели лето у бабушки.
      Кстати, я заметил, что вы только что написали подробный конспект
      о Барселоне. Хотите, чтобы я написал эссе о Барселоне, или
      продолжим с темой о лете у бабушки?"
```

### Добавленные правила в системный промпт

```
SMART CONTEXT AWARENESS:
7. If a student just discussed topic A in detail, and then uses a command about topic B:
   - You MAY briefly acknowledge topic A and offer to work on it instead
   - Example: "I see you want an essay about [topic B]. I also noticed you just
     wrote detailed notes about [topic A]. Would you like me to write about
     [topic A] instead, or shall I proceed with [topic B]?"
   - Keep this suggestion brief and friendly, don't insist
   - If the student clearly wants topic B, proceed with topic B
8. Be contextually aware but respect the student's explicit request
```

### Принципы умного предложения

1. **Не навязчиво** - бот предлагает, но не настаивает
2. **Уважает выбор студента** - если студент явно хочет тему B, работаем с темой B
3. **Краткость** - предложение должно быть коротким и дружелюбным
4. **Контекстуальность** - предлагается только если тема A была обсуждена подробно

### Когда срабатывает умное предложение

- ✅ Студент написал большой текст о теме A
- ✅ Сразу после этого дал команду с темой B
- ✅ Тема A релевантна для команды (например, /эссе после конспекта)

### Когда НЕ срабатывает

- ❌ Тема A была упомянута вскользь
- ❌ Между темой A и командой прошло много сообщений
- ❌ Студент явно не хочет работать с темой A

## Заключение

Исправления обеспечивают:

- ✅ Правильное описание команды /essay
- ✅ Контекстную обработку всех команд
- ✅ Умное предложение контекста (новое!)
- ✅ Улучшенный пользовательский опыт
- ✅ Более естественное взаимодействие с AI-тьютором

Изменения минимальны, но значительно улучшают функциональность команд и делают бота более внимательным к контексту разговора.

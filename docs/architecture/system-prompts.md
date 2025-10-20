# Архитектура Системных Промптов

## Обзор

Платформа использует **двухуровневую систему** промптов в зависимости от режима работы:

```
┌─────────────────────────────────────────┐
│         Пользователь                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Какой режим?  │
         └────────┬───────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   ┌─────────┐         ┌─────────┐
   │  LEARN  │         │   FUN   │
   │  MODE   │         │  MODE   │
   └────┬────┘         └────┬────┘
        │                   │
        ▼                   ▼
  ┌──────────────┐    ┌──────────────┐
  │ Инструкции   │    │ Универсальный│
  │ агента курса │    │   промпт     │
  └──────────────┘    └──────────────┘
```

---

## LEARN Mode (Режим Обучения)

### Когда Используется:
- Студент подписан на курс
- Сессия создана в контексте курса
- `sessionContext.context.agentInstructions` присутствует

### Источник Промпта:
**Инструкции агента из курса** (`agentInstructions`)

### Пример:

```javascript
// Курс "Advanced Mathematics"
{
  "courseId": "math-101",
  "agents": [
    {
      "id": "algebra-tutor",
      "name": "Algebra Specialist",
      "instructions": "You are an algebra tutor specializing in equations. Always show step-by-step solutions and explain the reasoning behind each step. Use clear mathematical notation."
    }
  ]
}

// В сессии используется:
systemPrompt = "You are an algebra tutor specializing in equations..."
```

### Характеристики:
- ✅ **Уникальный для каждого курса**
- ✅ **Настраивается создателем курса**
- ✅ **Может быть несколько агентов** (с оркестрацией)
- ✅ **Специализированный** под предмет

---

## FUN Mode (Свободный Режим)

### Когда Используется:
- Студент НЕ подписан на курс
- Сессия создана без курса
- `sessionContext.context.agentInstructions` отсутствует

### Источник Промпта:
**Универсальный fallback промпт** из кода приложения

### Текущий Промпт:

```javascript
`You are a helpful AI tutor assistant.

Your role is to:
- Provide clear, accurate, and educational responses
- Explain concepts in a way that's easy to understand
- Be patient and supportive
- Use examples when helpful

Maintain a friendly and encouraging tone.`
```

### Характеристики:
- ✅ **Одинаковый для всех пользователей**
- ✅ **Общий образовательный характер**
- ✅ **Не специализирован** под конкретный предмет
- ✅ **Дружелюбный и поддерживающий**

---

## Реализация в Коде

### Логика Выбора Промпта

```javascript
// src/routes/api/chat/+server.js

// Получаем инструкции агента из контекста сессии
const agentInstructions = sessionContext?.context?.agentInstructions || 
                          activeExamProfile?.agentInstructions ||
                          null;

if (agentInstructions) {
  // LEARN MODE: Используем инструкции из курса
  enhancedMessages.unshift({
    role: 'system',
    content: agentInstructions
  });
} else {
  // FUN MODE: Используем универсальный промпт
  enhancedMessages.unshift({
    role: 'system',
    content: `You are a helpful AI tutor assistant...`
  });
}
```

---

## Как Настроить Промпты

### Для LEARN Mode (Курсы)

#### 1. Через Админ-Панель

```
1. Перейдите в "Courses"
2. Создайте или отредактируйте курс
3. Добавьте агента:
   - Name: "Math Tutor"
   - Instructions: "You are a mathematics tutor..."
4. Сохраните
```

#### 2. Через API

```javascript
POST /api/courses
{
  "name": "Physics 101",
  "agents": [
    {
      "name": "Physics Tutor",
      "type": "subject",
      "instructions": "You are a physics tutor specializing in mechanics and thermodynamics. Use real-world examples and explain concepts using analogies."
    }
  ]
}
```

#### 3. Через Базу Данных

```sql
UPDATE courses 
SET agents = '[
  {
    "id": "physics-tutor",
    "name": "Physics Tutor",
    "instructions": "Your custom instructions..."
  }
]'
WHERE id = 'course-id';
```

### Для FUN Mode (Универсальный)

Отредактируйте fallback промпт в коде:

```javascript
// src/routes/api/chat/+server.js (строка ~577)

enhancedMessages.unshift({
  role: 'system',
  content: `Your custom universal prompt here...`
});
```

Затем перезапустите сервер:
```bash
npm run dev
```

---

## Примеры Использования

### Пример 1: Курс Математики

```javascript
// Настройка курса
{
  "name": "Advanced Mathematics",
  "agents": [
    {
      "name": "Algebra Specialist",
      "instructions": "You are an algebra tutor. Show step-by-step solutions. Explain each step clearly. Use mathematical notation."
    }
  ]
}

// Студент спрашивает: "Solve x² + 5x + 6 = 0"
// AI отвечает с использованием инструкций агента:
// "Let me solve this quadratic equation step by step..."
```

### Пример 2: Курс Программирования

```javascript
// Настройка курса
{
  "name": "Python Programming",
  "agents": [
    {
      "name": "Python Mentor",
      "instructions": "You are a Python programming mentor. Provide code examples. Explain best practices. Help debug errors. Use PEP 8 style."
    }
  ]
}

// Студент спрашивает: "How do I read a file in Python?"
// AI отвечает с использованием инструкций агента:
// "Here's how to read a file in Python using best practices..."
```

### Пример 3: FUN Mode (Без Курса)

```javascript
// Студент НЕ подписан на курс
// Используется универсальный промпт

// Студент спрашивает: "What is photosynthesis?"
// AI отвечает с общим образовательным подходом:
// "Photosynthesis is the process by which plants..."
```

---

## Множественные Агенты (Advanced)

Курс может иметь **несколько агентов** для разных тем:

```javascript
{
  "name": "Complete Mathematics",
  "agents": [
    {
      "id": "algebra-tutor",
      "name": "Algebra Specialist",
      "instructions": "You specialize in algebra...",
      "assignedMaterials": ["algebra-basics", "equations"]
    },
    {
      "id": "geometry-tutor",
      "name": "Geometry Expert",
      "instructions": "You specialize in geometry...",
      "assignedMaterials": ["shapes", "angles"]
    }
  ],
  "orchestrationAgent": {
    "id": "math-coordinator",
    "name": "Math Coordinator",
    "instructions": "You coordinate between algebra and geometry tutors. Route questions to the appropriate specialist."
  }
}
```

### Как Работает Оркестрация:

1. Студент задает вопрос
2. Оркестратор анализирует вопрос
3. Направляет к нужному агенту (algebra или geometry)
4. Агент отвечает с использованием своих инструкций

---

## Лучшие Практики

### Для Создателей Курсов:

1. **Будьте Специфичны**
   ```
   ❌ "You are a tutor"
   ✅ "You are a calculus tutor specializing in derivatives and integrals"
   ```

2. **Определите Стиль**
   ```
   ✅ "Always show step-by-step solutions"
   ✅ "Use real-world examples"
   ✅ "Explain concepts using analogies"
   ```

3. **Укажите Формат**
   ```
   ✅ "Use mathematical notation"
   ✅ "Provide code examples"
   ✅ "Include diagrams descriptions"
   ```

4. **Задайте Тон**
   ```
   ✅ "Maintain a professional tone"
   ✅ "Be encouraging and supportive"
   ✅ "Use simple language for beginners"
   ```

### Для Разработчиков:

1. **Не Изменяйте Fallback Часто**
   - FUN mode промпт должен быть стабильным
   - Изменения влияют на всех пользователей

2. **Тестируйте Промпты**
   - Создайте тестовый курс
   - Проверьте разные типы вопросов
   - Убедитесь, что AI следует инструкциям

3. **Логируйте Использование**
   - Отслеживайте, какие промпты используются
   - Анализируйте эффективность

---

## Текущий Статус

✅ **Реализовано:**
- Двухуровневая система промптов
- Автоматический выбор на основе режима
- Поддержка агентов курса
- Fallback для FUN mode

📋 **Где Настроить:**
- **LEARN mode**: Админ-панель → Courses → Agents
- **FUN mode**: `src/routes/api/chat/+server.js` (строка ~577)

🔄 **Как Применить Изменения:**
```bash
# Для LEARN mode (курсы)
# Изменения применяются сразу через админ-панель

# Для FUN mode (код)
npm run dev
```

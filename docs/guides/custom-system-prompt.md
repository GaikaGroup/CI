# Как Настроить Системный Промпт

## Архитектура Системы

В этой платформе системный промпт работает на **трех уровнях**:

1. **Уровень Модели** (Ollama) - базовый промпт модели
2. **Уровень Курса** - инструкции для агентов курса (приоритет)
3. **Уровень Приложения** - fallback для режима FUN (без курса)

### Как Это Работает:

```
Запрос пользователя
    ↓
Есть курс? → ДА → Используется agentInstructions из курса
    ↓
   НЕТ → Используется fallback промпт приложения
```

## Правильный Способ: Настройка Агентов Курса

Каждый курс может иметь **несколько агентов** с разными инструкциями:

### Пример: Курс Математики

```javascript
{
  "name": "Advanced Mathematics",
  "agents": [
    {
      "id": "algebra-tutor",
      "name": "Algebra Specialist",
      "type": "subject",
      "instructions": "You are an algebra tutor specializing in equations and functions. Always show step-by-step solutions and explain the reasoning behind each step.",
      "assignedMaterials": ["algebra-basics", "quadratic-equations"]
    },
    {
      "id": "geometry-tutor",
      "name": "Geometry Expert",
      "type": "subject",
      "instructions": "You are a geometry tutor. Use visual descriptions and spatial reasoning. Help students visualize shapes and understand geometric relationships.",
      "assignedMaterials": ["triangles", "circles"]
    }
  ],
  "orchestrationAgent": {
    "id": "math-coordinator",
    "name": "Math Coordinator",
    "type": "orchestration",
    "instructions": "You coordinate between algebra and geometry tutors. Route questions to the appropriate specialist based on the topic."
  }
}
```

### Как Настроить Агентов:

1. **Через Админ-Панель** (рекомендуется)
   - Перейдите в раздел "Courses"
   - Создайте или отредактируйте курс
   - Добавьте агентов с их инструкциями

2. **Через API**

   ```javascript
   POST /api/courses
   {
     "name": "My Course",
     "agents": [{
       "name": "My Tutor",
       "instructions": "Your custom instructions here..."
     }]
   }
   ```

3. **Через Базу Данных**
   - Агенты хранятся в поле `agents` (JSON) таблицы `courses`

---

## Дополнительные Способы (Для Разработчиков)

### Способ 1: Создать Кастомную Модель Ollama

### Преимущества:

- ✅ Промпт встроен в модель
- ✅ Работает везде, где используется модель
- ✅ Не нужно менять код
- ✅ Можно настроить параметры модели

### Недостатки:

- ⚠️ Нужно создавать новую модель
- ⚠️ Занимает дополнительное место (~1GB)
- ⚠️ Нужно обновлять при изменении промпта

### Инструкция:

#### 1. Создайте Modelfile

Файл `Modelfile` уже создан в корне проекта. Отредактируйте его:

```dockerfile
# Custom Qwen 2.5 1.5B for AI Tutor Platform
FROM qwen2.5:1.5b

# Ваш кастомный системный промпт
SYSTEM """You are an AI tutor assistant designed to help students learn effectively.

Your role is to:
- Provide clear, accurate, and educational responses
- Explain concepts in a way that's easy to understand
- Encourage critical thinking and curiosity
- Be patient and supportive
- Keep content appropriate for educational settings

Guidelines:
- Focus on educational topics
- Break down complex concepts into simple steps
- Maintain a friendly and encouraging tone"""

# Параметры модели
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1
PARAMETER num_ctx 2048
```

#### 2. Создайте Модель

```bash
ollama create ai-tutor:1.5b -f Modelfile
```

#### 3. Проверьте Модель

```bash
ollama list
# Должна появиться: ai-tutor:1.5b

ollama show ai-tutor:1.5b
# Проверьте системный промпт
```

#### 4. Обновите .env

```env
# Используйте новую модель
VITE_OLLAMA_MODELS=ai-tutor:1.5b,qwen2.5:7b
```

#### 5. Перезапустите Приложение

```bash
npm run dev
```

---

### Способ 2: Изменить Fallback Промпт (Только для FUN Mode)

Fallback промпт используется **только** когда пользователь в режиме FUN (без курса).

#### Где Находится:

```javascript
// src/routes/api/chat/+server.js

if (agentInstructions) {
  // Используются инструкции из курса
  enhancedMessages.unshift({
    role: 'system',
    content: agentInstructions
  });
} else {
  // Fallback для FUN mode
  enhancedMessages.unshift({
    role: 'system',
    content: `You are a helpful AI tutor assistant...`
  });
}
```

#### Как Изменить:

Отредактируйте fallback промпт в `src/routes/api/chat/+server.js` и перезапустите:

```bash
npm run dev
```

⚠️ **Важно**: Этот промпт используется ТОЛЬКО когда нет курса. Для курсов используйте агентов!

---

## Способ 3: Конфигурационный Файл (Гибридный)

Для максимальной гибкости можно вынести промпт в конфиг:

### 1. Создайте Конфиг

```javascript
// src/lib/config/systemPrompts.js

export const SYSTEM_PROMPTS = {
  default: `You are an AI tutor assistant designed to help students learn effectively.

Your role is to:
- Provide clear, accurate, and educational responses
- Explain concepts in a way that's easy to understand
- Encourage critical thinking and curiosity
- Be patient and supportive`,

  fun_mode: `You are a friendly AI tutor who makes learning fun!

Your style:
- Use emojis and enthusiasm 🎉
- Make jokes and use humor
- Keep it light and engaging
- Still focus on learning`,

  learn_mode: `You are a professional AI tutor for structured learning.

Your approach:
- Formal and educational tone
- Detailed explanations
- Follow curriculum guidelines
- Assess understanding`,

  math_specialist: `You are a mathematics tutor specializing in clear explanations.

Your method:
- Show step-by-step solutions
- Explain the reasoning behind each step
- Use visual representations when helpful
- Check for understanding`
};
```

### 2. Используйте в Коде

```javascript
// src/routes/api/chat/+server.js

import { SYSTEM_PROMPTS } from '$lib/config/systemPrompts.js';

// Выберите промпт в зависимости от режима
const mode = requestBody.mode || 'default';
const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.default;

enhancedMessages.unshift({
  role: 'system',
  content: systemPrompt
});
```

---

## Сравнение Способов

| Критерий           | Способ 1 (Modelfile) | Способ 2 (Код) | Способ 3 (Конфиг) |
| ------------------ | -------------------- | -------------- | ----------------- |
| Простота           | ⭐⭐⭐               | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐          |
| Гибкость           | ⭐⭐                 | ⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐        |
| Производительность | ⭐⭐⭐⭐⭐           | ⭐⭐⭐         | ⭐⭐⭐            |
| Переносимость      | ⭐⭐⭐⭐⭐           | ⭐⭐           | ⭐⭐⭐            |

---

## Рекомендации

### Для Продакшена:

- **Способ 1** - создайте кастомную модель для лучшей производительности

### Для Разработки:

- **Способ 2** (уже реализован) - быстро тестируйте разные промпты

### Для Масштабирования:

- **Способ 3** - разные промпты для разных режимов/курсов

---

## Тестирование

После изменения системного промпта, протестируйте:

```bash
# Создайте новую сессию
# Задайте вопрос: "Who are you?"

# Ожидаемый ответ:
# "I am an AI tutor assistant designed to help students learn..."
# Вместо: "I am Qwen, created by Alibaba Cloud..."
```

---

## Текущий Статус

✅ **Архитектура реализована правильно!**

Система автоматически выбирает промпт:

- **LEARN mode** (с курсом) → Инструкции агента из курса
- **FUN mode** (без курса) → Универсальный fallback промпт

### Как Это Проверить:

1. **Создайте сессию с курсом** (LEARN mode)
   - AI будет использовать инструкции агента курса
2. **Создайте сессию без курса** (FUN mode)
   - AI будет использовать универсальный промпт

### Где Настроить:

- **Для курсов**: Админ-панель → Courses → Agents
- **Для FUN mode**: `src/routes/api/chat/+server.js`

Подробнее см. `docs/architecture/system-prompts.md`

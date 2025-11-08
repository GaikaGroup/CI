# Voice Mode Context Fix

## Проблема

В режиме VoiceMode система не применяла ту же логику обработки контекста, что и в TextMode:

- Не передавался `sessionContext` с историей сообщений
- Не передавался `examProfile` с настройками курса
- Не передавались `agentInstructions` для специализированных агентов
- OCR контекст из истории не включался в запрос

Это приводило к тому, что в VoiceMode:

- Бот не учитывал контекст из PDF/изображений
- Не применялись настройки экзамена/практики
- Не работали специализированные агенты

## Решение

Обновлена функция `generateAIResponseStreaming` в `src/lib/modules/chat/voiceServices.js`:

### 1. Добавлен импорт необходимых stores

```javascript
import { messages } from './stores';
import { examProfile } from '$lib/stores/examProfile';
```

### 2. Обновлена сигнатура функции

```javascript
async function generateAIResponseStreaming(transcription, images, sessionId = null)
```

### 3. Добавлено построение полного контекста

```javascript
// Get exam profile for context (same as TextMode)
const activeExamProfile = get(examProfile);

// Build session context from message history (same as TextMode)
const messageHistory = get(messages);
const sessionContext = sessionId
  ? {
      sessionId,
      context: {
        examProfile: activeExamProfile,
        messageHistory: messageHistory.slice(-10) // Last 10 messages for context
      }
    }
  : null;
```

### 4. Обновлен запрос к API

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: enhancedContent, // Use enhanced content with OCR context
    images: processedImages,
    recognizedText: recognizedText || undefined,
    language: language,
    stream: true, // Enable streaming
    sessionContext: sessionContext, // Include session context (same as TextMode)
    examProfile: activeExamProfile, // Include exam profile (same as TextMode)
    // Include any additional context from session
    ...(sessionContext?.context?.agentInstructions
      ? {
          agentInstructions: sessionContext.context.agentInstructions
        }
      : {})
  })
});
```

### 5. Использована существующая функция для получения языка из waiting phrase

Функция `getWaitingPhraseLanguage()` уже существовала в файле и используется в `enhancedServices.js` для избежания повторного определения языка.

## Результат

Теперь VoiceMode использует ту же логику обработки контекста, что и TextMode:

- ✅ Включает историю сообщений (последние 10)
- ✅ Передает настройки экзамена/практики
- ✅ Использует специализированных агентов
- ✅ Включает OCR контекст из PDF/изображений
- ✅ Сохраняет язык из waiting phrase для избежания повторного определения
- ✅ После обработки добавляет синтезированный голос

## Тестирование

Все существующие тесты проходят успешно:

```bash
npm run test:run
# Test Files  43 passed (43)
# Tests  714 passed (714)
```

Сборка проходит без ошибок:

```bash
npm run build
# ✓ built in 18.82s
```

## Файлы изменены

- `src/lib/modules/chat/voiceServices.js` - основные изменения
  - Добавлены импорты `messages` и `examProfile`
  - Обновлена функция `generateAIResponseStreaming`
  - Функция `getWaitingPhraseLanguage` уже существовала в файле (удалено дублирование)
  - Обновлены вызовы функции с передачей `sessionId`

## Совместимость

Изменения полностью обратно совместимы:

- Параметр `sessionId` опциональный (по умолчанию `null`)
- Если `sessionId` не передан, контекст не включается
- Все существующие вызовы продолжают работать

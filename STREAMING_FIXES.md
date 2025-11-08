# Исправления стриминга

## Проблема 1: Стриминг не работал ❌

Стриминг работал на бэкенде, но ответ не доходил до пользователя.

### Причины:

1. `enhancedServices.js` читал стрим, но не вызывал синтез речи
2. `StreamingResponseHandler` был инициализирован с неправильным callback
3. `StreamingTTSCoordinator` не был подключен к `audioBufferManager`

### Исправлено ✅:

- Изменен callback с `onSentence` на `onSentenceComplete`
- Добавлен вызов `streamingTTSCoordinator.queueSentence()`
- Добавлена интеграция с `audioBufferManager.bufferAudio()`
- Добавлен импорт `audioBufferManager`

---

## Проблема 2: Waiting phrase прерывался ❌

Стриминг начинал воспроизведение до завершения waiting phrase → наложение звуков.

### Исправлено ✅:

- Добавлена проверка `waitingPhraseActive` перед добавлением в очередь
- Стриминг ждет завершения waiting phrase (polling каждые 100ms)
- Логирование: `[Streaming] Waiting for waiting phrase to complete...`

```javascript
// Wait for waiting phrase to complete before adding to queue
if (waitingPhraseActive) {
  console.log('[Streaming] Waiting for waiting phrase to complete...');
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (!waitingPhraseActive) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}
```

---

## Проблема 3: Язык определялся дважды ❌

Язык определялся для waiting phrase, потом снова для ответа → несоответствие языков.

### Исправлено ✅:

- Добавлена переменная `waitingPhraseLanguage` для хранения языка
- Язык сохраняется в `triggerWaitingPhrase()`
- `generateAIResponseStreaming()` использует сохраненный язык
- Язык очищается после завершения или при ошибке

```javascript
// In triggerWaitingPhrase()
waitingPhraseLanguage = currentLanguage;
console.log('[WaitingPhrase] Language set:', currentLanguage);

// In generateAIResponseStreaming()
const language = waitingPhraseLanguage || get(selectedLanguage);
console.log(
  '[Streaming] Using language:',
  language,
  waitingPhraseLanguage ? '(from waiting phrase)' : '(from store)'
);
```

---

## Поток работы теперь:

1. **Пользователь говорит** → транскрипция
2. **Определяется язык** → сохраняется в `waitingPhraseLanguage`
3. **Воспроизводится waiting phrase** на этом языке
4. **API стримит ответ** (используя тот же язык)
5. **Стриминг ЖДЕТ** завершения waiting phrase ⏳
6. **После завершения** waiting phrase начинается воспроизведение ответа
7. **Язык очищается** после завершения

---

## Результат:

✅ Waiting phrase не прерывается  
✅ Язык одинаковый для waiting phrase и ответа  
✅ Плавный переход от waiting phrase к ответу  
✅ Нет наложения звуков  
✅ Стриминг работает корректно

---

## Проблема 4: OCR контекст не применялся ❌

PDF/изображения из истории не учитывались при генерации ответа в стриминге.

### Причина:

`generateAIResponseStreaming()` вызывался напрямую без построения OCR контекста из истории сообщений.

### Исправлено ✅:

- Добавлен импорт `buildOCRContextForChat` из OCRService
- OCR контекст строится перед запросом: `buildOCRContextForChat()`
- Контекст добавляется к транскрипции: `enhancedContent = transcription + ocrContext`
- Используется `enhancedContent` в запросе к API
- Для сообщений с изображениями используется `sendMessageWithOCRContext`

```javascript
// Build OCR context from chat history (includes PDF/image context)
const ocrContext = buildOCRContextForChat();
const enhancedContent = ocrContext ? transcription + ocrContext : transcription;
console.log('[Streaming] OCR context length:', ocrContext?.length || 0);

// Use enhanced content in API request
body: JSON.stringify({
  content: enhancedContent // With OCR context
  // ...
});
```

### Результат:

✅ PDF контекст применяется при стриминге  
✅ Изображения из истории учитываются  
✅ OCR память работает корректно  
✅ Логирование показывает длину контекста

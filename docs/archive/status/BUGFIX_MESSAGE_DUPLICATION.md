# Исправление: Дублирование сообщений в сессии

## Проблема

Сообщения в сессии дублировались - каждое сообщение сохранялось в базу данных дважды.

### Причина

В файле `src/routes/sessions/[id]/+page.svelte` была двойная логика сохранения:

1. **Явное сохранение** в функции `handleSendMessage`:
   - Сохраняло user message в БД
   - Сохраняло assistant message в БД

2. **Автоматическое сохранение** через подписку на `messages` store в `onMount`:
   - Подписка отслеживала все новые сообщения
   - Пыталась сохранить каждое новое сообщение через `saveMessageToSession`
   - Не проверяла, было ли сообщение уже сохранено

Результат: каждое сообщение сохранялось дважды.

## Решение

### 1. Добавлен флаг `saved: true` при явном сохранении

В `handleSendMessage` после успешного сохранения сообщения в БД:

```javascript
// Для user message
updateMessage(tempMessageId, { id: savedMessage.id, saved: true });

// Для assistant message
updateMessage(lastAssistantMessage.id, { id: savedMessage.id, saved: true });
```

### 2. Улучшена проверка в автоматической подписке

Подписка теперь пропускает сообщения, которые уже помечены как `saved: true`:

```javascript
messageUnsubscribe = messages.subscribe(($messages) => {
  for (let i = lastProcessedIndex; i < $messages.length; i++) {
    const message = $messages[i];
    // Пропускаем уже сохраненные сообщения
    if (message && !message.saved && message.type !== 'system' && message.content) {
      console.log('[Auto-save fallback] Saving message:', message.id);
      saveMessageToSession(message);
      message.saved = true;
    }
  }
  lastProcessedIndex = $messages.length;
});
```

### 3. Сообщения из БД помечаются как сохраненные

При загрузке сессии все сообщения из БД помечаются `saved: true`:

```javascript
const chatMessages = (sessionData.messages || []).map((msg, index) => ({
  id: msg.id || index + 1,
  type: msg.type === 'assistant' ? 'tutor' : msg.type,
  content: msg.content,
  timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }),
  metadata: msg.metadata || {},
  images: msg.metadata?.images || [],
  saved: true // Уже в БД, не сохранять повторно
}));
```

## Тестирование

Создан интеграционный тест `tests/integration/session/messageDuplication.test.js` с проверками:

- ✅ Отсутствие дублирования при быстром создании сообщений
- ✅ Правильный порядок сообщений
- ✅ Сохранение сообщений с metadata
- ✅ Обработка конкурентных сохранений

Все тесты проходят успешно.

## Измененные файлы

- `src/routes/sessions/[id]/+page.svelte` - исправлена логика сохранения
- `tests/integration/session/messageDuplication.test.js` - добавлены тесты

## Результат

Теперь каждое сообщение сохраняется в базу данных ровно один раз. Дублирование устранено.

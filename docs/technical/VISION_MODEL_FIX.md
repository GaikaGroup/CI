# Vision Model Fix - Ollama LLaVA Integration

## Проблема

При загрузке изображения и задании вопроса система использовала текстовую модель `qwen2.5:7b` вместо модели для работы с изображениями `llava:7b`.

### Симптомы
- В логах: `[ProviderManager] No images detected in messages`
- Модель: `[Ollama] resolved model: qwen2.5:7b` вместо `llava:7b`
- Изображения не анализировались нейросетью

## Причина

Проблема была в методе `addLanguageConstraints()` в файле `src/lib/modules/chat/PromptEnhancer.js`.

### Что происходило:

1. **Создание сообщения с изображениями** (правильно):
   ```javascript
   {
     role: 'user',
     content: [
       { type: 'text', text: 'Что на картинке?' },
       { type: 'image_url', image_url: { url: 'data:image/...' } }
     ]
   }
   ```

2. **Обработка PromptEnhancer** (неправильно):
   ```javascript
   // СТАРЫЙ КОД - преобразовывал структурированный content в строку
   enhancedMessages[lastUserMessageIndex] = {
     ...lastUserMessage,
     content: `${lastUserMessage.content}\n\n${reminder}`
   };
   ```
   
   Результат: `content` становился строкой `"[object Object]\n\n(Ответь на русском языке)"`

3. **Проверка изображений** (не находила):
   ```javascript
   hasImages(messages) {
     return messages.some(m => {
       if (Array.isArray(m.content)) {  // false - теперь это строка!
         return m.content.some(c => c.type === 'image_url');
       }
       return false;
     });
   }
   ```

## Решение

Обновлен метод `addLanguageConstraints()` для правильной обработки структурированных сообщений:

```javascript
// НОВЫЙ КОД - сохраняет структуру с изображениями
const isStructuredContent = Array.isArray(lastUserMessage.content);

if (isStructuredContent) {
  // Для структурированного контента добавляем напоминание в текстовую часть
  const contentCopy = [...lastUserMessage.content];
  const firstTextIndex = contentCopy.findIndex(c => c.type === 'text');
  
  if (firstTextIndex !== -1) {
    contentCopy[firstTextIndex] = {
      ...contentCopy[firstTextIndex],
      text: `${contentCopy[firstTextIndex].text}\n\n${reminder}`
    };
  }
  
  enhancedMessages[lastUserMessageIndex] = {
    ...lastUserMessage,
    content: contentCopy  // Массив сохраняется!
  };
}
```

## Результат

После исправления:
- ✅ Структура сообщения с изображениями сохраняется
- ✅ `hasImages()` правильно определяет наличие изображений
- ✅ `OllamaProvider` выбирает модель `llava:7b` для vision-запросов
- ✅ Языковые напоминания добавляются в текстовую часть, не нарушая структуру

## Тестирование

Создан тест для проверки:
```bash
node test-vision-fix.js
```

Результаты:
- ✅ Определение изображений: работает
- ✅ Старое поведение: изображения терялись (подтверждено)
- ✅ Новое поведение: изображения сохраняются
- ✅ Структура: массив с text и image_url частями

## Конфигурация

Модель для работы с изображениями настроена в `src/lib/config/llm.js`:

```javascript
export const OLLAMA_CONFIG = {
  VISION_MODEL: import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llava:7b',
  // ...
};
```

Для изменения модели установите переменную окружения:
```bash
VITE_OLLAMA_VISION_MODEL=llava:13b
```

## Файлы изменены

- `src/lib/modules/chat/PromptEnhancer.js` - исправлен метод `addLanguageConstraints()`

## Связанные компоненты

- `src/lib/modules/llm/ProviderManager.js` - определяет наличие изображений
- `src/lib/modules/llm/providers/OllamaProvider.js` - выбирает vision модель
- `src/routes/api/chat/+server.js` - создает структурированные сообщения
- `src/lib/config/llm.js` - конфигурация моделей

## Дата исправления

16 октября 2025

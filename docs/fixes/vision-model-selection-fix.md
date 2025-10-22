# Исправление выбора vision модели

## Проблема

LLaVA установлена, но система продолжала использовать qwen2.5 даже для запросов с изображениями.

## Причина

Проверка наличия изображений происходила в `OllamaProvider.generateChatCompletion()`, но к этому моменту модель уже была выбрана через `resolveModel()`.

## Решение

### 1. Добавлена проверка в ProviderManager

**src/lib/modules/llm/ProviderManager.js:**

```javascript
/**
 * Check if messages contain images
 */
hasImages(messages) {
  return messages.some(m => {
    if (Array.isArray(m.content)) {
      return m.content.some(c => c.type === 'image_url');
    }
    return false;
  });
}

async generateChatCompletion(messages, options = {}) {
  // Check if messages contain images and add flag to options
  const hasImages = this.hasImages(messages);
  if (hasImages) {
    options.hasImages = true;
    console.log('[ProviderManager] Detected images in messages, will use vision model');
  }

  const providerName = options.provider || (await this.getBestProvider());
  const provider = this.getProvider(providerName);
  // ...
}
```

### 2. Обновлена логика в OllamaProvider

**src/lib/modules/llm/providers/OllamaProvider.js:**

```javascript
async generateChatCompletion(messages, options = {}) {
  try {
    // Check if we need vision model (from options or by checking messages)
    const needsVision = options.hasImages || this.hasImages(messages);

    if (needsVision) {
      console.log('[Ollama] Using vision model:', this.config.VISION_MODEL);
    }

    const modelToUse = needsVision ? this.config.VISION_MODEL : options.model;

    const model = await this.resolveModel(modelToUse);
    // ...
  }
}
```

## Как это работает

### Поток выполнения:

```
1. API получает запрос с изображениями
   ↓
2. ProviderManager.generateChatCompletion(messages, options)
   ↓
3. ProviderManager проверяет: hasImages(messages)?
   ↓ Да
4. Добавляет options.hasImages = true
   ↓
5. Вызывает OllamaProvider.generateChatCompletion(messages, options)
   ↓
6. OllamaProvider проверяет: options.hasImages?
   ↓ Да
7. Использует VISION_MODEL (llava:7b) вместо MODEL (qwen2.5:7b)
   ↓
8. Отправляет запрос в Ollama с моделью llava:7b
```

## Логи

### До исправления:

```
[Ollama] resolved model: qwen2.5:7b
Response generated using provider: ollama, model: qwen2.5:7b
```

### После исправления:

```
[ProviderManager] Detected images in messages, will use vision model
[Ollama] Using vision model: llava:7b
[Ollama] resolved model: llava:7b
Response generated using provider: ollama, model: llava:7b
```

## Тестирование

### 1. Перезапустите сервер

```bash
# Остановите (Ctrl+C)
# Запустите снова
npm run dev
```

### 2. Отправьте запрос с изображением

1. Откройте чат
2. Загрузите изображение
3. Отправьте "Реши задачу"

### 3. Проверьте логи

В терминале должно быть:

```
[ProviderManager] Detected images in messages, will use vision model
[Ollama] Using vision model: llava:7b
[Ollama] resolved model: llava:7b
```

### 4. Проверьте ответ

Нейросеть должна дать конкретные расчеты с числами из изображения.

## Результат

✅ **ProviderManager определяет наличие изображений**  
✅ **OllamaProvider использует vision модель**  
✅ **LLaVA анализирует изображение**  
✅ **Нейросеть дает конкретные ответы**

Теперь система правильно выбирает модель в зависимости от типа запроса!

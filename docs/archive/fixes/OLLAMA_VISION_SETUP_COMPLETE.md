# ✅ Настройка Ollama Vision - Завершено

## Что было сделано

Добавлена поддержка бесплатного распознавания изображений через Ollama с моделью LLaVA.

## Изменения в коде

### 1. Добавлена конфигурация vision модели

**src/lib/config/llm.js:**

```javascript
export const OLLAMA_CONFIG = {
  // ...
  VISION_MODEL: import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llava:7b'
  // ...
};
```

### 2. Добавлена логика выбора модели

**src/lib/modules/llm/providers/OllamaProvider.js:**

```javascript
// Проверка наличия изображений
hasImages(messages) {
  return messages.some(m => {
    if (Array.isArray(m.content)) {
      return m.content.some(c => c.type === 'image_url');
    }
    return false;
  });
}

// Автоматический выбор модели
const needsVision = this.hasImages(messages);
const modelToUse = needsVision ? this.config.VISION_MODEL : options.model;
```

### 3. Добавлена поддержка формата vision

```javascript
// Конвертация сообщений для Ollama
const ollamaMessages = messages.map((m) => {
  if (Array.isArray(m.content)) {
    const textParts = m.content.filter((c) => c.type === 'text').map((c) => c.text);
    const imageParts = m.content.filter((c) => c.type === 'image_url');

    return {
      role: m.role,
      content: textParts.join('\n'),
      images: imageParts.map((img) => img.image_url.url)
    };
  }

  return { role: m.role, content: String(m.content) };
});
```

## Установка на сервере

### Шаг 1: Установите LLaVA

```bash
# Подключитесь к серверу
ssh user@your-server

# Установите LLaVA 7B (рекомендуется)
ollama pull llava:7b
```

### Шаг 2: Проверьте установку

```bash
ollama list
```

Должна появиться модель `llava:7b`.

### Шаг 3: Перезапустите приложение

```bash
# В директории проекта
npm run dev
```

## Как это работает

### Логика выбора модели:

```
┌─────────────────────────────────────┐
│ Пользователь отправляет сообщение   │
└──────────────┬──────────────────────┘
               │
               ▼
       ┌───────────────┐
       │ Есть          │
       │ изображения?  │
       └───┬───────┬───┘
           │       │
       Да  │       │ Нет
           │       │
           ▼       ▼
    ┌──────────┐ ┌──────────┐
    │ llava:7b │ │qwen2.5:7b│
    │ (vision) │ │  (text)  │
    └──────────┘ └──────────┘
           │       │
           └───┬───┘
               │
               ▼
       ┌───────────────┐
       │ Если ошибка   │
       │ → OpenAI      │
       │ (fallback)    │
       └───────────────┘
```

### Примеры:

**Текстовый вопрос:**

```
"Что такое физика?" → qwen2.5:7b (быстро, бесплатно)
```

**Вопрос с изображением:**

```
"Реши задачу" + [изображение] → llava:7b (vision, бесплатно)
```

**Если llava не работает:**

```
"Реши задачу" + [изображение] → gpt-4-turbo (fallback, платно)
```

## Требования

### Минимальные:

- **RAM:** 8 GB
- **Диск:** 5 GB свободного места
- **Ollama:** установлен и запущен

### Рекомендуемые:

- **RAM:** 16 GB
- **GPU:** NVIDIA с 4+ GB VRAM (опционально, для ускорения)
- **Диск:** 10 GB свободного места

## Тестирование

### 1. Проверьте установку LLaVA

```bash
ollama list
```

**Ожидаемый вывод:**

```
NAME            ID              SIZE    MODIFIED
llava:7b        abc123def       4.7 GB  2 minutes ago
qwen2.5:7b      def456ghi       4.4 GB  1 hour ago
```

### 2. Протестируйте в чате

1. Откройте чат
2. Загрузите изображение с задачей 20
3. Отправьте "Реши задачу"
4. Проверьте логи сервера

**Ожидаемые логи:**

```
[Ollama] resolved model: llava:7b
Response generated using provider: ollama, model: llava:7b
```

### 3. Проверьте ответ

**Ожидаемый результат:**

```
Для определения цены деления каждого прибора посмотрим на отметки:

1. Термометр: Между 39 и 42 градусами есть 5 делений
   Цена деления = (42 - 39) / 5 = 0.6 градуса

2. Линейка: Между 5 и 10 см есть 5 делений
   Цена деления = (10 - 5) / 5 = 1 см

3. Секундомер: Между 950 и 145 есть 20 делений
   Цена деления = (145 - 950) / 20 = -6.75 секунды

...
```

## Конфигурация через .env

```env
# Текстовые модели (по умолчанию)
VITE_OLLAMA_MODELS=qwen2.5:1.5b,qwen2.5:7b

# Vision модель для изображений
VITE_OLLAMA_VISION_MODEL=llava:7b

# Или используйте другую vision модель
# VITE_OLLAMA_VISION_MODEL=bakllava
# VITE_OLLAMA_VISION_MODEL=llava:13b
```

## Альтернативные модели

Если `llava:7b` не подходит:

### BakLLaVA (на базе Mistral):

```bash
ollama pull bakllava
```

```env
VITE_OLLAMA_VISION_MODEL=bakllava
```

### LLaVA 13B (более точная):

```bash
ollama pull llava:13b
```

```env
VITE_OLLAMA_VISION_MODEL=llava:13b
```

### LLaVA-Phi3 (более быстрая):

```bash
ollama pull llava-phi3
```

```env
VITE_OLLAMA_VISION_MODEL=llava-phi3
```

## Troubleshooting

### "model not found"

```bash
ollama pull llava:7b
```

### "connection refused"

```bash
# Проверьте Ollama
systemctl status ollama

# Или запустите
ollama serve
```

### "out of memory"

```bash
# Используйте более легкую модель
ollama pull llava
```

### Медленная работа

- Проверьте, используется ли GPU: `nvidia-smi`
- Уменьшите `NUM_CTX` в конфигурации
- Используйте более легкую модель

## Преимущества

✅ **Бесплатно** - Нет затрат на API  
✅ **Локально** - Данные не уходят в облако  
✅ **Автоматически** - Выбор модели по наличию изображений  
✅ **Fallback** - OpenAI как запасной вариант  
✅ **Быстро** - Текстовые вопросы обрабатываются qwen2.5

## Документация

- `docs/ollama-vision-setup.md` - Подробная инструкция по установке

## Следующие шаги

1. **Установите LLaVA на сервере:**

   ```bash
   ollama pull llava:7b
   ```

2. **Перезапустите приложение**

3. **Протестируйте с изображением**

4. **Проверьте логи** - должна использоваться `llava:7b`

Теперь система будет использовать бесплатную локальную модель для распознавания изображений! 🎉

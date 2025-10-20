# Установка LLaVA для распознавания изображений в Ollama

## Проблема

Ollama с моделью `qwen2.5` не поддерживает анализ изображений (vision). Нужна отдельная модель с vision capabilities.

## Решение: LLaVA

**LLaVA** (Large Language and Vision Assistant) - это бесплатная open-source модель с поддержкой vision для Ollama.

## Установка на сервере

### 1. Установите LLaVA

```bash
# Подключитесь к серверу по SSH
ssh user@your-server

# Установите LLaVA (рекомендуется версия 7b для баланса скорости и качества)
ollama pull llava:7b

# Или более точная версия 13b (требует больше RAM)
ollama pull llava:13b

# Или легкая версия (быстрее, но менее точная)
ollama pull llava
```

### 2. Проверьте установку

```bash
ollama list
```

Должна появиться модель `llava:7b` в списке.

### 3. Протестируйте модель

```bash
# Тест с текстом
ollama run llava:7b "Hello, how are you?"

# Тест с изображением (если есть локальное изображение)
ollama run llava:7b "What do you see in this image?" --image /path/to/image.png
```

## Как это работает

### Логика выбора модели:

```
Запрос без изображений → qwen2.5:7b (быстрая текстовая модель)
Запрос с изображениями  → llava:7b (vision модель)
```

### Код автоматически определяет:

1. **Есть ли изображения в запросе?**
   - Проверяет наличие `image_url` в сообщениях
   
2. **Выбирает модель:**
   - Если изображения есть → `llava:7b`
   - Если изображений нет → `qwen2.5:7b`

3. **Форматирует запрос:**
   - Для LLaVA добавляет поле `images` с base64 данными

## Конфигурация

### Изменения в коде:

**src/lib/config/llm.js:**
```javascript
export const OLLAMA_CONFIG = {
  // ...
  VISION_MODEL: import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llava:7b',
  // ...
};
```

**src/lib/modules/llm/providers/OllamaProvider.js:**
```javascript
// Автоматически выбирает vision модель при наличии изображений
const needsVision = this.hasImages(messages);
const modelToUse = needsVision ? this.config.VISION_MODEL : options.model;
```

### Переменные окружения (.env):

```env
# Основная текстовая модель
VITE_OLLAMA_MODELS=qwen2.5:1.5b,qwen2.5:7b

# Vision модель для изображений
VITE_OLLAMA_VISION_MODEL=llava:7b
```

## Требования к ресурсам

### LLaVA 7B:
- **RAM:** ~8 GB
- **VRAM:** ~4 GB (если используется GPU)
- **Диск:** ~4.7 GB

### LLaVA 13B:
- **RAM:** ~16 GB
- **VRAM:** ~8 GB (если используется GPU)
- **Диск:** ~7.4 GB

### Рекомендации:
- Для сервера с 8 GB RAM → `llava:7b`
- Для сервера с 16+ GB RAM → `llava:13b`
- Для быстрого тестирования → `llava` (самая легкая)

## Формат запроса к LLaVA

### Ollama API format:

```json
{
  "model": "llava:7b",
  "messages": [
    {
      "role": "user",
      "content": "Реши задачу\n\nExercise (from photo):\n20. Определите...",
      "images": [
        "data:image/png;base64,iVBORw0KGgo..."
      ]
    }
  ],
  "stream": false
}
```

## Тестирование

### 1. Перезапустите сервер

```bash
# Остановите (Ctrl+C)
# Запустите снова
npm run dev
```

### 2. Проверьте в чате

1. Загрузите изображение с задачей 20
2. Отправьте "Реши задачу"
3. Проверьте логи сервера

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

...
```

## Fallback к OpenAI

Если LLaVA не установлена или не работает, система автоматически переключится на OpenAI (если настроен API ключ).

### Логика fallback:

```
1. Попытка использовать llava:7b
   ↓ (если ошибка)
2. Fallback к OpenAI gpt-4-turbo
   ↓ (если нет API ключа)
3. Ошибка: "Vision model not available"
```

## Troubleshooting

### Проблема: "model not found"

```bash
# Проверьте установленные модели
ollama list

# Если llava нет, установите
ollama pull llava:7b
```

### Проблема: "connection refused"

```bash
# Проверьте, запущен ли Ollama
systemctl status ollama

# Или
ps aux | grep ollama

# Запустите Ollama
ollama serve
```

### Проблема: "out of memory"

```bash
# Используйте более легкую модель
ollama pull llava

# Или увеличьте swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Проблема: Медленная работа

```bash
# Проверьте, используется ли GPU
nvidia-smi

# Если GPU не используется, настройте CUDA
# (требует NVIDIA GPU и драйверов)
```

## Альтернативные модели

Если LLaVA не подходит, можно попробовать:

### BakLLaVA:
```bash
ollama pull bakllava
```
- Основана на Mistral
- Хорошее качество vision

### LLaVA-Phi3:
```bash
ollama pull llava-phi3
```
- Более компактная
- Быстрее работает

## Результат

После установки LLaVA:

✅ **Бесплатное распознавание изображений**  
✅ **Локальная обработка (без отправки в облако)**  
✅ **Автоматический выбор модели**  
✅ **Fallback к OpenAI при необходимости**  

Система будет использовать:
- `qwen2.5:7b` для текстовых вопросов (быстро)
- `llava:7b` для вопросов с изображениями (vision)
- `gpt-4-turbo` как fallback (если локальные модели не работают)

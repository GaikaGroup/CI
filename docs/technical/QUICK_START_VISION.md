# Quick Start: Vision Model with Ollama

## Быстрый старт для работы с изображениями

### 1. Установите llava модель

```bash
ollama pull llava:7b
```

### 2. Проверьте установку

```bash
ollama list | grep llava
```

Должно показать:
```
llava:7b    ...    4.7 GB    ...
```

### 3. Запустите приложение

```bash
npm run dev
```

### 4. Протестируйте

1. Откройте http://localhost:3004
2. Войдите в систему
3. Создайте новую сессию
4. Загрузите изображение (кнопка с иконкой изображения)
5. Задайте вопрос: "Что на этой картинке?"

### 5. Проверьте логи

В терминале должно появиться:
```
[Ollama] Using vision model: llava:7b
```

## Если не работает

### Проблема: llava не установлена
```bash
ollama pull llava:7b
```

### Проблема: Ollama не запущен
```bash
# Проверить
curl http://127.0.0.1:11434/api/tags

# Запустить (macOS)
ollama serve
```

### Проблема: Используется неправильная модель
Проверьте `.env`:
```bash
VITE_OLLAMA_VISION_MODEL=llava:7b
```

### Проблема: Изображения не обрабатываются
1. Перезапустите приложение
2. Очистите кэш браузера
3. Проверьте логи на ошибки

## Альтернативные модели

### llava:13b (лучше качество, больше памяти)
```bash
ollama pull llava:13b
```

В `.env`:
```bash
VITE_OLLAMA_VISION_MODEL=llava:13b
```

### llava:34b (максимальное качество)
```bash
ollama pull llava:34b
```

В `.env`:
```bash
VITE_OLLAMA_VISION_MODEL=llava:34b
```

## Поддерживаемые форматы

- ✅ PNG
- ✅ JPEG/JPG
- ✅ WebP
- ✅ Base64 encoded images

## Системные требования

### Минимальные (llava:7b)
- RAM: 8 GB
- Диск: 5 GB свободного места

### Рекомендуемые (llava:13b)
- RAM: 16 GB
- Диск: 10 GB свободного места

### Для llava:34b
- RAM: 32 GB
- Диск: 20 GB свободного места

## Полезные команды

```bash
# Список всех моделей
ollama list

# Удалить модель
ollama rm llava:7b

# Информация о модели
ollama show llava:7b

# Проверить Ollama API
curl http://127.0.0.1:11434/api/tags
```

## Дополнительная информация

- Техническая документация: `VISION_MODEL_FIX.md`
- Полная инструкция: `VISION_FIX_INSTRUCTIONS_RU.md`
- Результаты тестирования: `VISION_FIX_COMPLETE.md`

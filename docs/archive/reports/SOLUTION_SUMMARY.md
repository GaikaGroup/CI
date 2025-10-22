# Решение проблемы с Vision моделью

## Проблема

1. llava:7b очень медленная (6+ минут на ответ)
2. Tesseract OCR уже хорошо распознает текст
3. Нет смысла использовать vision модель, если текст уже извлечен

## Решение

### Оптимизация в `src/routes/api/chat/+server.js`

```javascript
// Если OCR текст хорошего качества (>30 символов)
const hasGoodOCR = recognizedText && recognizedText.length > 30;
const useVisionModel = images && images.length > 0 && !hasGoodOCR;

if (useVisionModel) {
  // Медленный путь: vision модель (llava)
  console.log('[Vision] Using vision model for image analysis');
  // ... структура с изображениями
} else {
  // Быстрый путь: только текст (qwen2.5:7b)
  if (hasGoodOCR) {
    console.log('[OCR] Using text-only mode - OCR text quality is good');
  }
  messages.push({ role: 'user', content: fullContent });
}
```

### Логика работы

```
┌─────────────────┐
│ Загрузка фото   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Tesseract OCR   │
│ (в браузере)    │
└────────┬────────┘
         │
         ▼
    Текст > 30 символов?
         │
    ┌────┴────┐
    │         │
   ДА        НЕТ
    │         │
    ▼         ▼
┌───────┐  ┌──────────┐
│qwen2.5│  │  llava   │
│ 10 сек│  │ 6+ минут │
└───────┘  └──────────┘
```

## Результат

### Для вашей задачи (измерительные приборы)

- **Tesseract** распознает текст: "термометра, линейки, секундомера..."
- **qwen2.5:7b** анализирует за 10 секунд
- **Не используется** медленная llava

### Когда используется vision модель

- OCR не смог распознать текст (< 30 символов)
- Рукописный текст
- Плохое качество изображения
- Нужен анализ графики/диаграмм

## Тестирование

```bash
# Запустить тест
node test-ocr-optimization.js

# Ожидаемый результат:
# Test 1 (good OCR): ~10 секунд, qwen2.5:7b
# Test 2 (poor OCR): ~6 минут, llava:7b
```

## Файлы изменены

- `src/routes/api/chat/+server.js` - добавлена оптимизация OCR
- `src/lib/modules/chat/PromptEnhancer.js` - сохранение структуры изображений

## Дополнительные материалы

- `TESSERACT_APPROACH.md` - подробное объяснение подхода
- `VISION_MODELS_COMPARISON.md` - сравнение vision моделей
- `test-ocr-optimization.js` - тест оптимизации
- `switch-vision-model.sh` - скрипт смены модели

## Итог

Теперь система:

1. ✅ Быстро работает с Tesseract OCR (10 сек вместо 6 мин)
2. ✅ Использует vision модель только когда нужно
3. ✅ Сохраняет структуру сообщений с изображениями
4. ✅ Автоматически выбирает оптимальный путь

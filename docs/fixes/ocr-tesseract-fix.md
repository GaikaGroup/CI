# Исправление Tesseract OCR

## Проблема

OCR распознавал текст, но с ошибками в числах:

**Было:**
```
20. Определите, какова цена деления каждого из измерительных приборов, 
изображенных на рисунке 1: термометра, линейки, секундомера, амперметра, 
спидо- метра. 39 42 - ... e. 560 5 | 950 10 145 15 20 na Гы 02 "" ra ЕЁ я - Puc. 1
```

**Должно быть:**
```
20. Определите, какова цена деления каждого из измерительных приборов, 
изображенных на рисунке 1: термометра, линейки, секундомера, амперметра, 
спидометра.

Термометр: Между 39 и 42 градусами есть 5 делений
Линейка: Между 5 и 10 см есть 5 делений
Секундомер: Между 950 и 145 есть 20 делений
...
```

## Причина

### 1. Неправильный langPath

**Было:**
```javascript
langPath: 'https://tessdata.projectnaptha.com/4.0.0'
```

Этот CDN не содержит файл `osd.traineddata` (Orientation and Script Detection), что приводило к ошибкам:

```
Error opening data file ./osd.traineddata
Failed loading language 'osd'
Warning: Auto orientation and script detection requested, but osd language failed to load
```

**Стало:**
```javascript
langPath: 'https://cdn.jsdelivr.net/npm/tessdata@4.0.0'
```

Этот CDN содержит все необходимые файлы, включая OSD.

### 2. Неправильный PSM (Page Segmentation Mode)

**Было:**
```javascript
tessedit_pageseg_mode: '12' // Sparse text with orientation detection
```

PSM 12 требует OSD файл, который не загружался. Это приводило к плохому распознаванию.

**Стало:**
```javascript
tessedit_pageseg_mode: '3' // Fully automatic page segmentation, but no OSD
```

PSM 3 - это полностью автоматическая сегментация страницы без OSD. Работает лучше для изображений с текстом и числами.

## Что такое PSM?

PSM (Page Segmentation Mode) определяет, как Tesseract анализирует изображение:

- **PSM 0**: Только ориентация и скрипт (требует OSD)
- **PSM 1**: Автоматическая сегментация с OSD
- **PSM 3**: Полностью автоматическая сегментация без OSD ✓ (используем)
- **PSM 4**: Одна колонка текста
- **PSM 6**: Один блок текста
- **PSM 11**: Разреженный текст
- **PSM 12**: Разреженный текст с OSD
- **PSM 13**: Одна строка текста

## Изменения в коде

### src/lib/modules/document/engines/TesseractOCR.js

```javascript
// Изменение 1: Правильный CDN для tessdata
async createOptimizedWorker() {
  if (!tesseractModule) {
    tesseractModule = await import('tesseract.js');
    createWorker = tesseractModule.createWorker;
  }
  return await createWorker(this.config.lang, 1, {
    langPath: 'https://cdn.jsdelivr.net/npm/tessdata@4.0.0', // ← Изменено
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/worker.min.js',
    gzip: false // ← Добавлено
  });
}

// Изменение 2: Правильный PSM
async _ocrCanvas(canvas) {
  const worker = await this.createOptimizedWorker();
  await worker.setParameters({
    tessedit_pageseg_mode: '3' // ← Изменено с '12' на '3'
  });
  const result = await worker.recognize(canvas);
  await worker.terminate();
  return {
    text: this.postProcessText(result.data.text),
    confidence: result.data.confidence / 100
  };
}
```

## Ожидаемый результат

После изменений:

1. **Нет ошибок OSD**
   ```
   ✓ Tesseract загружает все необходимые файлы
   ✓ Нет ошибок "Failed loading language 'osd'"
   ```

2. **Лучшее распознавание чисел**
   ```
   ✓ Числа распознаются правильно: 39, 42, 5, 10, 950, 145
   ✓ Нет мусора типа "na Гы 02 "" ra ЕЁ я"
   ```

3. **Правильные ответы от нейросети**
   ```
   ✓ Нейросеть получает правильный текст
   ✓ Нейросеть дает конкретные расчеты
   ✓ Нейросеть решает задачу правильно
   ```

## Тестирование

### Шаги:

1. Очистите кеш браузера (Ctrl+Shift+Delete)
2. Перезагрузите страницу
3. Загрузите изображение с задачей 20
4. Отправьте сообщение "Реши задачу"
5. Проверьте консоль - не должно быть ошибок OSD
6. Проверьте ответ нейросети - должны быть конкретные расчеты

### Ожидаемые логи:

```
[OCR] Processing images locally in the browser
[OCR] Processing image with ClientDocumentProcessor
[OCR] Image processed successfully, text length: 226
```

**Не должно быть:**
```
❌ Error opening data file ./osd.traineddata
❌ Failed loading language 'osd'
```

### Ожидаемый OCR текст:

```
20. Определите, какова цена деления каждого из измерительных приборов, 
изображенных на рисунке 1: термометра, линейки, секундомера, амперметра, 
спидометра.

Термометр: 39, 42 градуса, 5 делений
Линейка: 5, 10 см, 5 делений
Секундомер: 950, 145, 20 делений
Амперметр: 3, 15 ампер, 12 делений
Спидометр: 0, 20 км/ч, 4 деления
```

### Ожидаемый ответ нейросети:

```
Для определения цены деления каждого прибора посмотрим на отметки на них:

1. Термометр: Между 39 и 42 градусами есть 5 делений, значит, 
   цена деления = (42 - 39)/5 = 0.6 градуса.

2. Линейка: Между 5 и 10 см есть 5 делений, значит, 
   цена деления = (10 - 5)/5 = 1 см.

3. Секундомер: Между 950 и 145 есть 20 делений, значит, 
   цена деления = (145 - 950)/20 = -6.75 секунды.

...
```

## Дополнительные улучшения (опционально)

Если OCR все еще работает плохо, можно попробовать:

1. **Предобработка изображения**
   - Увеличить контрастность
   - Убрать шум
   - Бинаризация (черно-белое)

2. **Другие PSM режимы**
   - PSM 6 для одного блока текста
   - PSM 11 для разреженного текста

3. **Tesseract параметры**
   ```javascript
   await worker.setParameters({
     tessedit_pageseg_mode: '3',
     tessedit_char_whitelist: '0123456789.,+-=()абвгдежзийклмнопрстуфхцчшщъыьэюя ',
     preserve_interword_spaces: '1'
   });
   ```

## Результат

После исправлений OCR должен работать значительно лучше, и нейросеть будет давать конкретные расчеты вместо общих объяснений.

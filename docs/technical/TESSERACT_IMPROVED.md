# Улучшенная конфигурация Tesseract OCR

## Что изменено

### Файл: `src/lib/modules/document/engines/TesseractOCR.js`

### Было:

```javascript
tessedit_pageseg_mode: '3'; // Fully automatic page segmentation
```

### Стало:

```javascript
tessedit_pageseg_mode: '11', // Sparse text - для разрозненных цифр
tessedit_char_whitelist: '0123456789.,°CАампервтсекундлинйкмч...',
classify_bln_numeric_mode: '1' // Улучшенное распознавание цифр
```

## Что это дает

### PSM 11 (Sparse text)

- Лучше распознает разрозненные цифры на шкалах
- Не требует связного текста
- Идеально для измерительных приборов

### Whitelist символов

- Ограничивает распознавание только нужными символами
- Уменьшает ошибки (не путает 0 с O, 1 с I)
- Включает: цифры, точки, градусы, единицы измерения

### classify_bln_numeric_mode

- Специальный режим для цифр
- Улучшает точность распознавания чисел

## Ожидаемый результат

### Было:

```
20. Определите, какова цена деления...
```

### Станет:

```
20. Определите, какова цена деления...
35 37 39 41 термометр
0 1 2 3 см линейка
0 5 10 15 секундомер
0 2 4 6 8 А амперметр
0 50 100 150 200 км/ч спидометр
```

## Тестирование

1. Перезапустите приложение:

```bash
npm run dev
```

2. Загрузите изображение с измерительными приборами

3. Проверьте распознанный текст в консоли браузера:

```
[OCR] Image processed successfully, text length: XXX
```

4. Текст должен содержать все цифры со шкал

## Если не помогло

### Дополнительные улучшения:

1. **Предобработка изображения** (увеличение контраста):

```javascript
// В ImagePreprocessor.js
ctx.filter = 'contrast(150%) brightness(110%)';
```

2. **Увеличение размера** (для мелких цифр):

```javascript
// Масштабировать изображение x2 перед OCR
canvas.width = img.width * 2;
canvas.height = img.height * 2;
```

3. **Несколько проходов** (разные PSM режимы):

```javascript
// Попробовать PSM 6, 11, 13
const results = await Promise.all([
  recognizeWithPSM(6),
  recognizeWithPSM(11),
  recognizeWithPSM(13)
]);
// Объединить результаты
```

## Альтернатива

Если Tesseract все равно плохо распознает, используйте GPT-4 Vision:

```bash
# В .env
VITE_DEFAULT_LLM_PROVIDER=openai
VITE_OPENAI_API_KEY=your_key_here
```

GPT-4 Vision:

- Время: 5-10 секунд
- Точность: 95%+
- Стоимость: ~$0.01 за запрос

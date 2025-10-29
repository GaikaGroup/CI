# Voice Mode PDF Fix

## Проблема

При загрузке PDF файлов в voice mode возникала ошибка 400 Bad Request, так как `enhancedServices.js` отправлял объекты вместо base64 строк в API.

## Решение

Исправлен `src/lib/modules/chat/enhancedServices.js`:

### Изменения:

1. **Добавлено поле `type` в объект изображения** (строка 103):

   ```javascript
   resolve({
     data: reader.result,
     blob,
     name: `image_${index + 1}.${blob.type.split('/')[1] || 'png'}`,
     type: blob.type // ДОБАВЛЕНО
   });
   ```

2. **Разделение изображений и PDF файлов** (строки 125-130):

   ```javascript
   // Separate images and PDFs
   const imageFiles = validImageData.filter((data) => data.type.startsWith('image/'));
   const pdfFiles = validImageData.filter((data) => data.type === 'application/pdf');

   console.log(`[OCR] Found ${imageFiles.length} images and ${pdfFiles.length} PDFs`);
   ```

3. **Обработка только изображений через OCR** (строки 132-158):
   - Изображения обрабатываются локально через OCR
   - PDF файлы просто отмечаются как прикреплённые (обработка на сервере)

4. **Правильная отправка в API** (строки 161-163):
   ```javascript
   // Extract base64 strings for API call (only the data field, not the whole object)
   const base64Images = validImageData.map((img) => img.data);
   ```

## Результат

- ✅ PDF файлы корректно загружаются в voice mode
- ✅ Изображения обрабатываются через OCR как и раньше
- ✅ API получает правильный формат данных (массив base64 строк)
- ✅ Нет ошибок 400 Bad Request

## Тестирование

1. Откройте сессию в voice mode
2. Загрузите PDF файл
3. Отправьте голосовое сообщение
4. Проверьте, что PDF отображается корректно и нет ошибок в консоли

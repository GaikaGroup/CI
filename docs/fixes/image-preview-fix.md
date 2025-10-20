# Исправление отображения превью изображений

## Проблема

Изображения в чате отображались как текст "Uploaded image 1" вместо превью самого изображения. Это происходило из-за того, что blob URLs (временные ссылки) не конвертировались в base64 перед сохранением в store и базу данных.

## Решение

### 1. Конвертация blob URLs в base64

В `src/routes/sessions/[id]/+page.svelte` добавлена конвертация изображений из blob URLs в base64 перед добавлением в store:

```javascript
// Convert blob URLs to base64 for storage
let base64Images = [];
if (imageUrls.length > 0) {
  const imageDataPromises = imageUrls.map(async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  });
  
  const results = await Promise.all(imageDataPromises);
  base64Images = results.filter(img => img !== null);
}

// Add message with base64 images
addMessage(MESSAGE_TYPES.USER, content, base64Images, messageId);
```

### 2. Почему это важно

- **Blob URLs** - это временные ссылки вида `blob:http://localhost:3000/...`, которые существуют только в текущей сессии браузера
- **Base64** - это постоянное представление изображения в виде строки, которое можно сохранить в базе данных
- Без конвертации изображения теряются после перезагрузки страницы

### 3. Улучшенное отображение

В `MessageList.svelte` изображения теперь отображаются как полноценные превью:

```svelte
{#if message.images && message.images.length > 0}
  <div class="mb-3 flex flex-col gap-2">
    {#each message.images as img, index}
      <div class="image-preview-container">
        <img 
          src={img} 
          alt="Uploaded image {index + 1}" 
          class="message-image rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          on:click={() => window.open(img, '_blank')}
        />
      </div>
    {/each}
  </div>
{/if}
```

## Результат

- ✅ Изображения отображаются как превью, а не как текст
- ✅ Изображения сохраняются в базе данных
- ✅ Изображения остаются видимыми после перезагрузки
- ✅ Можно кликнуть на изображение для просмотра в полном размере
- ✅ OCR текст отображается отдельно под изображением

## Тестирование

1. Загрузите изображение в чат
2. Отправьте сообщение
3. Убедитесь, что видите превью изображения (не текст "Uploaded image 1")
4. Перезагрузите страницу
5. Убедитесь, что изображение все еще отображается

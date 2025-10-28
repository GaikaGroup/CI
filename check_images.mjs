import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const sessionId = 'cmh1xm4da0059dufsrd06c0m0';

const session = await prisma.session.findUnique({
  where: { id: sessionId },
  include: {
    messages: {
      orderBy: { createdAt: 'asc' }
    }
  }
});

if (!session) {
  console.log('❌ Сессия не найдена');
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`\n✅ Сессия найдена: ${sessionId}`);
console.log(`📝 Всего сообщений: ${session.messages.length}`);

const messagesWithImages = session.messages.filter((m) => {
  try {
    const metadata = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
    return metadata?.images && metadata.images.length > 0;
  } catch {
    return false;
  }
});

console.log(`🖼️  Сообщений с изображениями: ${messagesWithImages.length}\n`);

if (messagesWithImages.length > 0) {
  messagesWithImages.forEach((msg, idx) => {
    const metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
    console.log(`📨 Сообщение ${idx + 1}:`);
    console.log(`   ID: ${msg.id}`);
    console.log(`   Тип: ${msg.type}`);
    console.log(`   Время: ${msg.createdAt}`);
    console.log(`   Изображений: ${metadata.images.length}`);

    metadata.images.forEach((img, imgIdx) => {
      console.log(`\n   🖼️  Изображение ${imgIdx + 1}:`);
      if (img.url) {
        const isDataURL = img.url.startsWith('data:');
        const isHTTP = img.url.startsWith('http');
        console.log(
          `      Тип URL: ${isDataURL ? 'Data URL (base64)' : isHTTP ? 'HTTP URL' : 'Другое'}`
        );
        console.log(`      Длина: ${img.url.length} символов`);
        console.log(`      Начало: ${img.url.substring(0, 60)}...`);
      }
      console.log(`      OCR данные: ${img.ocrData ? '✅ Да' : '❌ Нет'}`);
      if (img.ocrData) {
        console.log(`      OCR текст (100 символов): ${img.ocrData.text?.substring(0, 100)}...`);
      }
    });
    console.log('');
  });

  console.log('\n📊 Итог:');
  console.log(`   ✅ Изображения СОХРАНЕНЫ в базе данных`);
  console.log(`   📍 Место хранения: поле metadata в таблице Message`);
  console.log(
    `   💾 Формат: ${messagesWithImages[0].metadata.images[0].url.startsWith('data:') ? 'Base64 Data URL' : 'HTTP URL'}`
  );
} else {
  console.log('❌ Изображений в сессии НЕ НАЙДЕНО');
}

await prisma.$disconnect();

# Быстрый старт: SEO-friendly URL для курсов

## Что изменилось?

**Было:**

```
http://localhost:3000/learn/cmgwvky3b00a3duwxipmf24wi
```

**Стало:**

```
http://localhost:3000/learn/kak-vospitat-koshku-cmgwvky3b
```

## Установка (3 команды)

```bash
# 1. Применить миграцию базы данных
npx prisma migrate dev --name add_course_slug

# 2. Сгенерировать slug для существующих курсов
node scripts/generate-course-slugs.js

# 3. Обновить Prisma Client
npx prisma generate
```

Готово! Перезапустите приложение.

## Как это работает?

1. При создании курса автоматически генерируется slug из названия
2. Кириллица транслитерируется: "Как воспитать кошку" → "kak-vospitat-koshku"
3. Добавляется короткий ID для уникальности: "kak-vospitat-koshku-cmgwvky3b"
4. Старые ссылки с ID продолжают работать

## Примеры

| Название курса          | Slug                              |
| ----------------------- | --------------------------------- |
| Как воспитать кошку     | kak-vospitat-koshku-abc12345      |
| Основы программирования | osnovy-programmirovaniya-def67890 |
| Learn English           | learn-english-ghi34567            |

## Преимущества для SEO

✅ Читаемые URL  
✅ Ключевые слова в адресе  
✅ Лучше индексируются поисковиками  
✅ Красивые превью в соцсетях

## Обратная совместимость

Оба формата работают:

- `/learn/kak-vospitat-koshku-abc12345` ✅ (новый, slug)
- `/learn/cmgwvky3b00a3duwxipmf24wi` ✅ (старый, ID)

Старые ссылки не сломаются!

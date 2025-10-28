# Quick Fix: Database Connection Issues

## Если видишь ошибку "too many clients already"

### Быстрое решение (30 секунд):

```bash
# 1. Останови все процессы
pkill -f "node.*dev"
pkill -f "vite"

# 2. Освободи порты
lsof -ti:3000-3015 | xargs kill -9 2>/dev/null || true

# 3. Очисти соединения с БД
npm run db:cleanup --force

# 4. Запусти сервер
npm run dev
```

## Что было исправлено:

### ✅ Singleton Prisma Client

- Теперь используется `globalThis.__prisma` для единственного экземпляра
- Переживает hot reload без создания новых соединений

### ✅ Vite Configuration

- Prisma исключен из оптимизации
- Уменьшен overhead от file watching

### ✅ Cleanup Script

- `npm run db:cleanup` - убивает idle соединения
- `npm run db:cleanup --force` - убивает все соединения

## Профилактика:

### Перед началом работы:

```bash
npm run db:cleanup
npm run dev
```

### Если сервер завис:

1. `Ctrl+C` (не `kill -9`!)
2. `npm run db:cleanup`
3. `npm run dev`

### Перед запуском тестов:

```bash
npm run db:cleanup
npm run test:run
```

## Мониторинг соединений:

```bash
# Проверить количество соединений
psql -U mak -d postgres -t -c "
  SELECT count(*)
  FROM pg_stat_activity
  WHERE datname = 'ai_tutor_sessions';
"

# Должно быть < 10 во время разработки
```

## Почему это происходило:

1. **HMR (Hot Module Replacement)** - Vite перезагружает модули при изменениях
2. **Множественные экземпляры** - Каждый reload создавал новый Prisma Client
3. **Незакрытые соединения** - Старые соединения не закрывались сразу
4. **Исчерпание пула** - PostgreSQL имеет лимит соединений (100 по умолчанию)

## Решение:

- ✅ **Singleton паттерн** - только один Prisma Client
- ✅ **Global storage** - хранится в `globalThis`
- ✅ **Правильная очистка** - disconnect при выходе
- ✅ **Лимиты соединений** - `connection_limit=5` в DATABASE_URL
- ✅ **Vite оптимизация** - Prisma исключен из HMR

## Проверка что все работает:

```bash
# Терминал 1: Мониторинг
watch -n 2 "psql -U mak -d postgres -t -c \"
  SELECT count(*) FROM pg_stat_activity
  WHERE datname = 'ai_tutor_sessions';
\""

# Терминал 2: Запуск сервера
npm run dev

# Соединений должно быть < 10
```

## Критерии успеха:

- ✅ Соединений < 10 во время разработки
- ✅ Нет ошибок "too many clients"
- ✅ Сервер запускается на порту 3000
- ✅ HMR работает без утечек соединений
- ✅ Тесты запускаются без ошибок

---

**Подробная документация:** `.kiro/steering/database-connection-management.md`

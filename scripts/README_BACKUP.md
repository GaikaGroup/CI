# Database Backup System

Система автоматического резервного копирования базы данных PostgreSQL.

## Быстрый старт

### Создать бэкап

```bash
npm run db:backup
```

### Создать бэкап перед миграцией

```bash
npm run db:backup:pre-migration
```

### Восстановить из бэкапа

```bash
npm run db:restore backups/backup_20241019_223000.sql.gz
```

## Команды

### `npm run db:backup`

Создает полный бэкап базы данных:

- Сохраняет в `backups/backup_YYYYMMDD_HHMMSS.sql.gz`
- Автоматически сжимает (gzip)
- Хранит последние 30 бэкапов
- Автоматически удаляет старые бэкапы

### `npm run db:backup:pre-migration`

Создает бэкап перед миграцией:

- Сохраняет в `backups/pre-migration/pre_migration_YYYYMMDD_HHMMSS.sql.gz`
- **Используйте ВСЕГДА перед `prisma migrate`**
- Не удаляет старые бэкапы автоматически

### `npm run db:restore <файл>`

Восстанавливает базу данных из бэкапа:

- **ВНИМАНИЕ**: Удаляет все текущие данные!
- Требует подтверждения (введите 'yes')
- Автоматически распаковывает .gz файлы

## Примеры использования

### Перед миграцией

```bash
# 1. Создать бэкап
npm run db:backup:pre-migration

# 2. Выполнить миграцию
npm run db:migrate

# 3. Если что-то пошло не так - восстановить
npm run db:restore backups/pre-migration/pre_migration_20241019_223000.sql.gz
```

### Регулярный бэкап

```bash
# Создать бэкап вручную
npm run db:backup

# Посмотреть список бэкапов
ls -lh backups/
```

### Восстановление

```bash
# Посмотреть доступные бэкапы
npm run db:restore

# Восстановить конкретный бэкап
npm run db:restore backups/backup_20241019_223000.sql.gz
```

## Автоматизация

### Настроить ежедневный бэкап (cron)

Добавьте в crontab:

```bash
# Открыть crontab
crontab -e

# Добавить строку (бэкап каждый день в 2:00 ночи)
0 2 * * * cd /path/to/project && npm run db:backup
```

### Настроить бэкап перед каждой миграцией

Создайте алиас в `~/.zshrc` или `~/.bashrc`:

```bash
alias migrate='npm run db:backup:pre-migration && npm run db:migrate'
```

Теперь вместо `npm run db:migrate` используйте `migrate`.

## Структура папок

```
backups/
├── backup_20241019_223000.sql.gz      # Регулярные бэкапы
├── backup_20241019_230000.sql.gz
├── backup_20241020_020000.sql.gz
└── pre-migration/                      # Бэкапы перед миграциями
    ├── pre_migration_20241019_223000.sql.gz
    └── pre_migration_20241020_100000.sql.gz
```

## Требования

- PostgreSQL установлен
- Команды `pg_dump`, `psql`, `createdb`, `dropdb` доступны
- Права на чтение/запись в папку `backups/`

## Размер бэкапов

Типичные размеры (сжатые):

- Пустая база: ~5 KB
- С тестовыми данными: ~50 KB
- Production (1000 пользователей): ~5 MB
- Production (10000 пользователей): ~50 MB

## Безопасность

⚠️ **Важно:**

- Бэкапы содержат все данные, включая пароли (хешированные)
- Не коммитьте папку `backups/` в git (уже в .gitignore)
- Храните бэкапы в безопасном месте
- Регулярно проверяйте возможность восстановления

## Troubleshooting

### "Database not found"

```bash
# Проверьте имя базы в .env
cat .env | grep DATABASE_URL

# Проверьте существующие базы
psql -l
```

### "Permission denied"

```bash
# Сделайте скрипты исполняемыми
chmod +x scripts/*.sh
```

### "Command not found: pg_dump"

```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

## Восстановление после катастрофы

Если вы случайно удалили все данные:

1. **Не паникуйте**
2. Найдите последний бэкап: `ls -lt backups/`
3. Восстановите: `npm run db:restore backups/backup_LATEST.sql.gz`
4. Проверьте данные в приложении
5. Создайте новый бэкап: `npm run db:backup`

## Рекомендации

✅ **Делайте:**

- Бэкап перед каждой миграцией
- Регулярные автоматические бэкапы (ежедневно)
- Проверяйте бэкапы раз в месяц (пробуйте восстановить)
- Храните бэкапы в нескольких местах

❌ **Не делайте:**

- Миграции без бэкапа
- `prisma migrate reset` на production
- Удаление папки backups/
- Коммит бэкапов в git

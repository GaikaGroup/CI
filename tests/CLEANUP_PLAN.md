# План очистки и реорганизации тестов

## Проблемы

1. **E2E тесты смешаны:** В `tests/e2e/` есть и Playwright и Vitest тесты
2. **Дублирование:** `tests/session/` дублирует `tests/integration/session/`
3. **Не тесты:** `tests/manual/` и `tests/diagnostics/` не автотесты
4. **API тесты требуют ручного запуска сервера**

## Решение

### Шаг 1: Разделить E2E тесты

**Playwright E2E (оставить в tests/e2e/):**

- `tests/e2e/catalogue/CatalogueUserJourney.test.js` ✅
- `tests/e2e/catalogue/CourseNavigationFix.test.js` ✅
- `tests/e2e/navigation/studentTutorNavigation.test.js` ✅
- `tests/e2e/voiceModeUxValidation.test.js` ✅

**Vitest тесты (переместить в tests/integration/):**

- `tests/e2e/admin/AdminSessionManagement.test.js` → `tests/integration/admin/`
- `tests/e2e/admin/ConsoleNavigation.test.js` → `tests/integration/admin/`
- `tests/e2e/LearnModeDeleteRestriction.test.js` → `tests/integration/courses/`
- `tests/e2e/login-redirect-navigation.test.js` → `tests/integration/auth/`
- `tests/e2e/sessionsPageTextMode.test.js` → `tests/integration/session/`
- `tests/e2e/userExperienceValidation.test.js` → `tests/integration/chat/`
- `tests/e2e/voiceChatFlow.test.js` → `tests/integration/chat/`

### Шаг 2: Удалить дубликаты

```bash
# tests/session/ дублирует tests/integration/session/
rm -rf tests/session/
```

### Шаг 3: Переместить не-тесты

```bash
# Manual тесты → документация
mkdir -p docs/manual-testing
mv tests/manual/* docs/manual-testing/
rm -rf tests/manual

# Diagnostics → scripts
mkdir -p scripts/diagnostics
mv tests/diagnostics/* scripts/diagnostics/
rm -rf tests/diagnostics
```

### Шаг 4: Решить проблему с API тестами

**Вариант А: Удалить** (рекомендуется)

- API тесты покрываются E2E тестами
- Проще в поддержке
- Не нужен отдельный запуск сервера

**Вариант Б: Автоматизировать**

- Создать helper для автозапуска сервера
- Использовать динамический порт
- Больше работы, но более детальное тестирование

## Команды для выполнения

```bash
# 1. Создать новые директории
mkdir -p tests/integration/admin
mkdir -p tests/integration/courses
mkdir -p docs/manual-testing
mkdir -p scripts/diagnostics

# 2. Переместить Vitest тесты из e2e в integration
mv tests/e2e/admin/*.test.js tests/integration/admin/
mv tests/e2e/LearnModeDeleteRestriction.test.js tests/integration/courses/
mv tests/e2e/login-redirect-navigation.test.js tests/integration/auth/
mv tests/e2e/sessionsPageTextMode.test.js tests/integration/session/
mv tests/e2e/userExperienceValidation.test.js tests/integration/chat/
mv tests/e2e/voiceChatFlow.test.js tests/integration/chat/

# 3. Удалить пустые директории
rmdir tests/e2e/admin 2>/dev/null || true

# 4. Удалить дубликаты
rm -rf tests/session

# 5. Переместить не-тесты
mv tests/manual/* docs/manual-testing/ 2>/dev/null || true
mv tests/diagnostics/* scripts/diagnostics/ 2>/dev/null || true
rm -rf tests/manual tests/diagnostics

# 6. Обновить playwright.config.js чтобы игнорировать не-Playwright тесты
```

## После очистки

### Структура tests/:

```
tests/
├── unit/                    # 54 файла - Unit тесты
├── integration/             # ~50 файлов - Integration с БД
│   ├── admin/
│   ├── api/
│   ├── auth/
│   ├── chat/
│   ├── courses/
│   ├── session/
│   └── ...
├── e2e/                     # 4 файла - Playwright E2E
│   ├── catalogue/
│   └── navigation/
├── api/                     # 1 файл - HTTP API тесты
└── smoke/                   # 4 файла - Smoke тесты
```

### Команды:

```bash
# Unit тесты (Vitest)
npm run test:unit

# Integration тесты (Vitest + БД)
npm run test:integration

# E2E тесты (Playwright)
npm run test:e2e

# Smoke тесты (Vitest)
npm run test:smoke

# Все Vitest тесты
npm run test:run

# Все тесты (Vitest + Playwright)
npm run test:all
```

## Ожидаемый результат

### До:

- 117 файлов
- 65 падают (56%)
- Смешанные типы тестов
- Ручной запуск сервера

### После:

- ~110 файлов (удалим ~7 ненужных)
- Четкое разделение по типам
- E2E автоматически запускают сервер
- Проще поддерживать и запускать

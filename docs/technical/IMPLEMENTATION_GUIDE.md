# Руководство по внедрению миграции данных в БД

## Обзор

Этот документ содержит пошаговые инструкции по переводу всех данных из localStorage в PostgreSQL базу данных.

## Подготовка

### 1. Обновление схемы базы данных

```bash
# Генерация и применение миграций Prisma
npx prisma generate
npx prisma db push

# Или создание миграции
npx prisma migrate dev --name add-course-enrollment-preferences
```

### 2. Проверка подключения к БД

```bash
# Проверка статуса БД
npm run start-db

# Тест подключения
npx prisma studio
```

## Этап 1: Создание новых моделей данных

### ✅ Обновленная схема Prisma

Файл `prisma/schema.prisma` уже обновлен с новыми моделями:
- `Course` - курсы/предметы
- `Enrollment` - подписки пользователей
- `UserPreference` - настройки пользователя
- `CourseReport` - отчеты модерации
- `SystemLog` - системные логи

### ✅ Новые сервисы

Созданы сервисы для работы с БД:
- `CourseService` - управление курсами
- `EnrollmentService` - управление подписками
- `UserPreferenceService` - настройки пользователя

### ✅ API endpoints

Созданы новые API endpoints:
- `/api/courses` - CRUD операции с курсами
- `/api/enrollments` - управление подписками
- `/api/preferences` - настройки пользователя

## Этап 2: Миграция данных

### Шаг 1: Подготовка миграции

```bash
# Создание резервной копии localStorage (в браузере)
# Откройте консоль браузера (F12) и выполните:
const backup = {};
Object.keys(localStorage).forEach(key => {
  backup[key] = localStorage.getItem(key);
});
console.log('Backup:', JSON.stringify(backup, null, 2));
# Сохраните вывод в файл
```

### Шаг 2: Запуск миграции

#### Вариант A: Миграция в браузере (рекомендуется)

1. Откройте приложение в браузере
2. Войдите как администратор
3. Откройте консоль браузера (F12)
4. Загрузите скрипт миграции:

```javascript
// Загрузка и запуск миграции
import('/scripts/migrate-localStorage-to-db.js').then(module => {
  window.runMigration = module.runMigration;
  console.log('Migration script loaded. Run window.runMigration() to start.');
});

// Запуск миграции
window.runMigration();
```

#### Вариант B: Серверная миграция

```bash
# Если у вас есть экспорт данных localStorage
node scripts/migrate-localStorage-to-db.js
```

### Шаг 3: Проверка миграции

```sql
-- Проверка количества мигрированных записей
SELECT 
  (SELECT COUNT(*) FROM courses) as courses_count,
  (SELECT COUNT(*) FROM enrollments) as enrollments_count,
  (SELECT COUNT(*) FROM user_preferences) as preferences_count,
  (SELECT COUNT(*) FROM course_reports) as reports_count,
  (SELECT COUNT(*) FROM system_logs) as logs_count;
```

## Этап 3: Обновление кода приложения

### Шаг 1: Замена stores

```javascript
// Старый импорт
import { coursesStore } from '$lib/stores/courses.js';

// Новый импорт
import { coursesStore } from '$lib/stores/coursesDB.js';
```

### Шаг 2: Обновление компонентов

Замените прямые обращения к localStorage на API вызовы:

```javascript
// Старый код
localStorage.setItem('theme', 'dark');

// Новый код
await fetch('/api/preferences', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'theme', value: 'dark' })
});
```

### Шаг 3: Обновление настроек темы и языка

```javascript
// src/routes/+layout.svelte
import { onMount } from 'svelte';
import { selectedLanguage, darkMode } from '$lib/modules/i18n/stores';

onMount(async () => {
  // Загрузка настроек из БД вместо localStorage
  try {
    const response = await fetch('/api/preferences');
    const data = await response.json();
    
    if (data.preferences.theme) {
      $darkMode = data.preferences.theme === 'dark';
    }
    
    if (data.preferences.language) {
      $selectedLanguage = data.preferences.language;
    }
  } catch (error) {
    console.warn('Failed to load preferences from database:', error);
    // Fallback to localStorage for backward compatibility
    const savedTheme = localStorage.getItem('theme');
    const savedLanguage = localStorage.getItem('language');
    
    if (savedTheme) $darkMode = savedTheme === 'dark';
    if (savedLanguage) $selectedLanguage = savedLanguage;
  }
});
```

## Этап 4: Тестирование

### Функциональные тесты

1. **Курсы/предметы**:
   - ✅ Создание нового курса
   - ✅ Редактирование курса
   - ✅ Удаление курса
   - ✅ Поиск курсов
   - ✅ Фильтрация курсов

2. **Подписки**:
   - ✅ Подписка на курс
   - ✅ Отписка от курса
   - ✅ Отслеживание прогресса
   - ✅ Статистика подписок

3. **Настройки**:
   - ✅ Смена темы
   - ✅ Смена языка
   - ✅ Сохранение настроек между сессиями

### Тесты производительности

```bash
# Запуск тестов
npm run test

# Тесты API endpoints
npm run test:api

# E2E тесты
npm run test:e2e
```

## Этап 5: Очистка и оптимизация

### Шаг 1: Удаление старого кода

После успешной миграции и тестирования:

```bash
# Удаление скриптов очистки localStorage
rm scripts/clear-courses-localStorage.js
rm scripts/clear-enrollments-localStorage.js

# Удаление старых store файлов (после замены импортов)
# rm src/lib/stores/courses.js (оставить как fallback)
```

### Шаг 2: Оптимизация БД

```sql
-- Создание дополнительных индексов для производительности
CREATE INDEX CONCURRENTLY idx_courses_search ON courses USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX CONCURRENTLY idx_enrollments_user_status ON enrollments(user_id, status);
CREATE INDEX CONCURRENTLY idx_user_preferences_lookup ON user_preferences(user_id, key);
```

### Шаг 3: Настройка кэширования

```javascript
// src/lib/stores/coursesDB.js
// Добавить кэширование для часто запрашиваемых данных
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут
let coursesCache = null;
let cacheTimestamp = 0;

async function getCachedCourses() {
  const now = Date.now();
  if (coursesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return coursesCache;
  }
  
  const result = await loadCourses();
  if (result.success) {
    coursesCache = result.courses;
    cacheTimestamp = now;
  }
  
  return result;
}
```

## Этап 6: Мониторинг и поддержка

### Настройка логирования

```javascript
// src/lib/services/SystemLogService.js
export class SystemLogService {
  static async logError(error, userId = null, category = 'general') {
    try {
      await fetch('/api/system-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          category,
          message: error.message,
          metadata: {
            stack: error.stack,
            userAgent: navigator.userAgent,
            url: window.location.href
          },
          userId
        })
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
}
```

### Мониторинг производительности

```javascript
// src/lib/utils/performance.js
export function trackAPICall(endpoint, duration, success) {
  // Отправка метрик в систему мониторинга
  if (typeof gtag !== 'undefined') {
    gtag('event', 'api_call', {
      endpoint,
      duration,
      success,
      custom_parameter: 'database_migration'
    });
  }
}
```

## Rollback план

В случае проблем с миграцией:

### Шаг 1: Восстановление localStorage

```javascript
// Восстановление из резервной копии
const backup = /* вставить сохраненный backup */;
Object.entries(backup).forEach(([key, value]) => {
  localStorage.setItem(key, value);
});
```

### Шаг 2: Откат кода

```bash
# Возврат к старым store файлам
git checkout HEAD~1 -- src/lib/stores/courses.js
git checkout HEAD~1 -- src/routes/+layout.svelte
```

### Шаг 3: Очистка БД (если необходимо)

```sql
-- Очистка мигрированных данных
TRUNCATE TABLE course_reports, enrollments, courses, user_preferences, system_logs CASCADE;
```

## Контрольный список

### Перед миграцией
- [ ] Резервная копия localStorage
- [ ] Резервная копия БД
- [ ] Тестирование на dev окружении
- [ ] Проверка всех зависимостей

### Во время миграции
- [ ] Мониторинг процесса миграции
- [ ] Проверка логов на ошибки
- [ ] Валидация мигрированных данных
- [ ] Тестирование основных функций

### После миграции
- [ ] Функциональное тестирование
- [ ] Тестирование производительности
- [ ] Проверка всех пользовательских сценариев
- [ ] Мониторинг ошибок в production

## Поддержка

При возникновении проблем:

1. Проверьте логи приложения
2. Проверьте логи БД
3. Используйте инструменты разработчика браузера
4. Обратитесь к документации Prisma
5. Создайте issue с подробным описанием проблемы

## Заключение

Миграция данных из localStorage в PostgreSQL обеспечит:

- ✅ Персистентность данных между устройствами
- ✅ Лучшую производительность при больших объемах данных
- ✅ Возможность создания аналитики и отчетов
- ✅ Централизованное управление данными
- ✅ Масштабируемость системы
- ✅ Резервное копирование и восстановление данных

Следуйте этому руководству поэтапно для успешной миграции.
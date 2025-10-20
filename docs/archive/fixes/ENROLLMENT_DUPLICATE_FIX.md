# Исправление проблемы дублирования записи на курсы

## Проблема

При попытке записаться на курс пользователь получал ошибку:
```
Failed to join course: User is already enrolled in this course
```

Даже если пользователь не был записан на курс в базе данных.

## Причина

В приложении использовались **два разных сервиса** для управления записями на курсы:

1. **UserEnrollmentService** (`src/lib/modules/courses/services/UserEnrollmentService.js`)
   - Хранит данные в localStorage
   - Устаревший подход
   - Не синхронизируется с базой данных

2. **EnrollmentService** (`src/lib/services/EnrollmentService.js`)
   - Работает с базой данных через Prisma
   - Правильный подход
   - Используется в API endpoints

Проблема возникала из-за того, что:
- Фронтенд использовал старый `enrollmentStore` из `$modules/courses/stores/enrollmentStore.js`
- Этот store использовал localStorage через UserEnrollmentService
- В localStorage могли быть старые/некорректные данные
- API использовал базу данных, где записи не было

## Решение

Заменили все импорты старого `enrollmentStore` на новый `enrollmentDB`, который работает с API:

### Измененные файлы:

1. **src/routes/catalogue/+page.svelte**
   - Изменен импорт с `$modules/courses/stores/enrollmentStore.js` на `$lib/stores/enrollmentDB.js`
   - Изменен вызов `enrollInCourse($user.id, course.id)` на `enrollInCourse(course.id)`

2. **src/routes/student/+page.svelte**
   - Изменен импорт с `$modules/courses/stores/enrollmentStore.js` на `$lib/stores/enrollmentDB.js`
   - Изменен вызов `enrollInCourse($user.id, course.id)` на `enrollInCourse(course.id)`

3. **src/lib/modules/navigation/components/MyCoursesDropdown.svelte**
   - Изменен импорт `enrollmentStats`

4. **src/routes/debug-enrollments/+page.svelte**
   - Изменены импорты `activeEnrollments` и `enrollmentStats`

5. **src/routes/my-subjects/+page.svelte**
   - Изменены импорты `activeEnrollments` и `enrollmentStats`

6. **src/routes/learn/[courseId]/progress/+page.svelte**
   - Изменены импорты `activeEnrollments` и `enrollmentStats`

7. **src/lib/modules/courses/services/CourseService.js**
   - Изменен импорт `enrollmentStore`

## Преимущества нового подхода

1. **Единый источник истины** - все данные хранятся в базе данных
2. **Синхронизация** - данные всегда актуальны
3. **Надежность** - нет конфликтов между localStorage и БД
4. **Масштабируемость** - данные доступны на всех устройствах пользователя

## Тестирование

После исправления необходимо проверить:

1. ✅ Запись на новый курс работает корректно
2. ✅ Повторная попытка записи на тот же курс показывает правильную ошибку
3. ✅ Список "My Learning" отображает записанные курсы
4. ✅ Статистика записей обновляется корректно
5. ✅ Навигация между страницами работает без ошибок

## Дальнейшие действия

Рекомендуется:

1. Удалить старый `UserEnrollmentService` и `enrollmentStore` из `$modules/courses/stores/`
2. Очистить localStorage пользователей от старых данных о записях
3. Добавить миграцию для переноса данных из localStorage в БД (если необходимо)

## API Endpoints

Используемые endpoints:

- `POST /api/enrollments` - Запись на курс
- `GET /api/enrollments` - Получение списка записей
- `PUT /api/enrollments/[id]` - Обновление записи
- `DELETE /api/enrollments/[id]` - Удаление записи

## Дата исправления

19 октября 2025

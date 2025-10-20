# Console Menu Fix

## Проблема

Раздел "Console" не отображался в навигационном меню для администраторов.

## Причина

Несоответствие между структурой данных пользователя и проверками в коде:

1. **API возвращает поле `type`**: В `/api/auth/login` возвращается `user.type` (admin/student)
2. **Код проверял поле `role`**: Навигация и другие компоненты проверяли `$user?.role === 'admin'`
3. **Auth store удалял данные с `role`**: В `src/lib/modules/auth/stores.js` была логика очистки устаревших данных с полем `role`

## Решение

Заменены все проверки `$user?.role` на `$user?.type` в следующих файлах:

### Навигация
- `src/lib/modules/navigation/components/Navigation.svelte`
  - Desktop menu: `{#if $user?.type === 'admin'}`
  - Mobile menu: `{#if $user?.type === 'admin'}`

### Редакторы
- `src/lib/modules/courses/components/CourseEditor.svelte`
  - `creatorRole: $user?.type || 'user'`
- `src/lib/modules/subjects/components/SubjectEditor.svelte`
  - `creatorRole: $user?.type || 'user'`

### Модерация
- `src/lib/modules/courses/components/ModerationQueue.svelte`
  - `{#if report.status === REPORT_STATUS.PENDING && $user?.type === 'admin'}`
- `src/lib/modules/subjects/components/ModerationQueue.svelte`
  - `{#if report.status === REPORT_STATUS.PENDING && $user?.type === 'admin'}`

## Структура данных пользователя

```javascript
{
  id: string,
  name: string,
  email: string,
  type: 'admin' | 'student' | 'tutor'
}
```

## Проверка

После исправлений:
1. Перезагрузите страницу
2. Console menu должно появиться в навигации для администраторов
3. Выпадающее меню содержит: Statistics, Sessions, Users, Finance, Analytics

## Дополнительное исправление: Dropdown меню

### Проблема
Dropdown меню "Admin User" оставалось открытым при переходе на другие страницы.

### Решение
Обновлён компонент `src/lib/modules/auth/components/AuthButton.svelte`:

1. **Добавлено отслеживание URL**: Dropdown автоматически закрывается при изменении `$page.url.pathname`
2. **Клик вне компонента**: Добавлен обработчик `handleClickOutside` для закрытия при клике вне dropdown
3. **Явное закрытие**: Добавлен `on:click={closeDropdown}` на ссылки Profile и Settings
4. **Z-index**: Увеличен z-index до 50 для корректного отображения поверх других элементов

```javascript
// Автоматическое закрытие при навигации
$: if ($page.url.pathname) {
  showDropdown = false;
}
```

## Дата исправления

16 октября 2025

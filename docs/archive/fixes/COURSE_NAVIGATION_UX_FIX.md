# Course Navigation UX Fix

## Проблема

Была обнаружена несогласованность в пользовательском опыте при навигации к курсам:

### Вариант 1 (Правильный)

- Зарегистрированный пользователь Admin переходит напрямую на страницу курса
- Открывается `http://localhost:3001/learn/course-1`
- Пользователь видит интерфейс обучения

### Вариант 2 (Неправильный - исправлен)

- Пользователь заходит в каталог `http://localhost:3001/catalogue`
- Нажимает кнопку "Learn" на курсе
- Ранее: оставался в каталоге с параметрами URL
- Теперь: переходит на `http://localhost:3001/learn/course-1`

## Исправление

### Изменения в `src/routes/catalogue/+page.svelte`

1. **handleLearnCourse**: Теперь выполняет прямой переход на страницу обучения

```javascript
const handleLearnCourse = (event) => {
  const { course } = event.detail;
  if (!course) {
    return;
  }

  // Navigate directly to the learn page instead of staying in catalogue
  goto(`/learn/${course.id}`);
};
```

2. **handleJoinCourse**: После успешной записи на курс переходит на страницу обучения

```javascript
if (result.success) {
  console.log('Successfully enrolled, navigating to learn page');
  // Navigate directly to the learn page instead of staying in catalogue
  goto(`/learn/${course.id}`);
}
```

3. **handleCourseSelect**: Также переходит на страницу обучения

```javascript
const handleCourseSelect = (event) => {
  const { course, mode } = event.detail;
  if (!course || !mode) {
    return;
  }

  // Navigate directly to the learn page
  goto(`/learn/${course.id}`);
};
```

### Улучшения UX

- **Консистентность**: Все пути навигации к курсу теперь ведут на одну и ту же страницу
- **Ожидаемое поведение**: Кнопка "Learn" действительно переводит пользователя в режим обучения
- **Упрощение**: Убрана сложная логика управления состоянием каталога при обучении

### Тестирование

Добавлены тесты для проверки:

- Корректности URL навигации
- Консистентности поведения разных путей навигации
- Валидации параметров курса

### Файлы изменены

- `src/routes/catalogue/+page.svelte` - основные исправления навигации
- `src/lib/modules/learn/components/CourseSelection.svelte` - добавлен data-testid для тестирования
- `tests/integration/catalogue/CourseNavigationFix.test.js` - тесты для проверки исправления

## Результат

Теперь оба варианта навигации приводят к одинаковому результату:

- Прямой переход: `http://localhost:3001/learn/course-1`
- Через каталог: `http://localhost:3001/learn/course-1`

Пользователи получают консистентный опыт независимо от того, как они попали к курсу.

# 🧹 ФИНАЛЬНАЯ ОЧИСТКА КАТАЛОГА КУРСОВ

## Проблема

В каталоге все еще отображается курс "Introduction to Mathematics", хотя мы очистили код.

## ✅ РЕШЕНИЕ

### Шаг 1: Откройте консоль браузера

1. Нажмите **F12** (или Cmd+Option+I на Mac)
2. Перейдите на вкладку **Console**

### Шаг 2: Выполните финальный скрипт очистки

Скопируйте и вставьте этот код:

```javascript
console.log('🧹 FINAL CLEANUP - Clearing ALL course data...');

// Clear ALL localStorage
const allKeys = Object.keys(localStorage);
console.log('Found localStorage keys:', allKeys);

// Remove all course/subject/enrollment related keys
const keysToRemove = allKeys.filter(
  (key) =>
    key.includes('course') ||
    key.includes('Course') ||
    key.includes('subject') ||
    key.includes('Subject') ||
    key.includes('enrollment') ||
    key.includes('Enrollment') ||
    key.includes('learn') ||
    key.includes('Learn')
);

console.log('Removing keys:', keysToRemove);
keysToRemove.forEach((key) => {
  localStorage.removeItem(key);
  console.log(`✅ Removed: ${key}`);
});

// Force set empty arrays
localStorage.setItem('learnModeCourses', '[]');
localStorage.setItem('learnModeSubjects', '[]');
localStorage.setItem('userEnrollments', '[]');

// Clear memory cache
if (typeof window !== 'undefined') {
  if (window.coursesStore) {
    try {
      window.coursesStore.set([]);
      console.log('✅ Cleared window.coursesStore');
    } catch (e) {
      console.log('ℹ️ Could not clear window.coursesStore');
    }
  }
}

// Clear browser cache
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      caches.delete(name);
    });
    console.log('✅ Cleared browser cache');
  });
}

console.log('🎉 FINAL CLEANUP COMPLETE!');
console.log('🔄 Force reloading page...');

// Force reload with cache bypass
setTimeout(() => {
  window.location.href = window.location.href + '?t=' + Date.now();
}, 1000);
```

### Шаг 3: Дождитесь перезагрузки

Страница автоматически перезагрузится через 1 секунду.

## ✨ Результат

После выполнения скрипта:

- ✅ Каталог курсов будет пустым
- ✅ "My Courses" покажет 0 курсов
- ✅ Все статистики будут обнулены
- ✅ Полностью чистая среда для тестирования

## 🔄 Если проблема остается

Если курсы все еще отображаются:

1. Попробуйте открыть приложение в **режиме инкогнито**
2. Или очистите весь кэш браузера через настройки
3. Или используйте другой браузер

## 📁 Готовые файлы

- `scripts/final-cleanup.js` - готовый скрипт для копирования

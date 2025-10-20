# 🧹 Инструкция по полной очистке курсов

## Проблема
Курсы автоматически восстанавливаются из кода по умолчанию, даже если localStorage очищен.

## ✅ РЕШЕНИЕ - Режим тестирования

### Шаг 1: Откройте консоль браузера
1. Нажмите F12 (или Cmd+Option+I на Mac)
2. Перейдите на вкладку **Console**

### Шаг 2: Включите режим тестирования
Скопируйте и вставьте этот код:

```javascript
console.log('🧪 Enabling test mode...');

// Set test mode flag
localStorage.setItem('testMode', 'true');
localStorage.setItem('skipDefaultCourses', 'true');

// Clear all course data
localStorage.removeItem('learnModeCourses');
localStorage.removeItem('learnModeSubjects');

// Set empty arrays
localStorage.setItem('learnModeCourses', '[]');
localStorage.setItem('learnModeSubjects', '[]');

// Clear enrollment data
localStorage.removeItem('userEnrollments');
localStorage.removeItem('courseEnrollments');

// Clear admin data
localStorage.removeItem('adminSubjects');
localStorage.removeItem('adminCourses');
localStorage.removeItem('moderationQueue');
localStorage.removeItem('moderationData');

console.log('✅ Test mode enabled');
console.log('✅ All course data cleared');
console.log('🔄 Refresh the page to see empty catalog');

// Reload the page
window.location.reload();
```

### Шаг 3: Проверьте результат
После перезагрузки страницы каталог курсов должен быть пустым.

## 🔄 Восстановление обычного режима

Когда закончите тестирование, выполните этот код:

```javascript
console.log('🔄 Disabling test mode...');

// Remove test mode flags
localStorage.removeItem('testMode');
localStorage.removeItem('skipDefaultCourses');

// Clear empty arrays
localStorage.removeItem('learnModeCourses');
localStorage.removeItem('learnModeSubjects');

console.log('✅ Test mode disabled');
console.log('🔄 Refresh the page to see default courses');

// Reload the page
window.location.reload();
```

## 📁 Готовые скрипты

Вы также можете использовать готовые файлы:
- `scripts/enable-test-mode.js` - включить режим тестирования
- `scripts/disable-test-mode.js` - выключить режим тестирования
- `scripts/clear-courses-localStorage.js` - полная очистка без режима тестирования

## ✨ Готово!

Теперь вы можете тестировать создание курсов с полностью пустой базой.
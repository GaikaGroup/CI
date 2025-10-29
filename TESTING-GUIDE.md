# Руководство по тестированию исправлений

## Что было исправлено

### 1. ✅ Поддержка кириллицы в Divergence Detection

- **Проблема**: Второе мнение показывало "Significant Differences" для одинаковых ответов на русском
- **Исправление**: Изменен regex на Unicode-aware `/[^\p{L}\p{N}\s]/gu`
- **Тесты**: 44 новых теста добавлено

### 2. ✅ Waiting phrases появляются ПОСЛЕ ответа

- **Проблема**: В TEXT mode waiting phrases появлялись после получения ответа из-за `setTimeout`
- **Исправление**: Добавлена функция `cancelWaitingPhrases()` которая отменяет все активные таймеры
- **Результат**: Waiting phrases теперь корректно отменяются когда приходит ответ

### 3. ✅ Множественные dev серверы

- **Проблема**: Запускалось много dev серверов на разных портах (3000, 3001, 3002...)
- **Исправление**:
  - Создан скрипт `npm run dev:single`
  - `vite.config.js`: `strictPort: true`, `port: 3005`
- **Результат**: Только ОДИН сервер на порту 3005

## Как тестировать

### Запуск dev сервера

```bash
# Используйте этот скрипт вместо npm run dev
npm run dev:single
```

Откройте браузер: **http://localhost:3005**

### Тест 1: Waiting phrases в TEXT mode

1. Откройте любую сессию
2. Отправьте короткий вопрос: "столица России?"
3. **Ожидаемое поведение**:
   - ✅ Waiting phrase появляется ДО ответа
   - ✅ Когда приходит ответ, waiting phrase исчезает
   - ✅ Waiting phrase НЕ появляется ПОСЛЕ ответа

4. **Неправильное поведение (было раньше)**:
   - ❌ Ответ приходит
   - ❌ Потом появляются части waiting phrase

### Тест 2: Второе мнение на русском языке

1. Откройте любую сессию
2. Отправьте вопрос на русском: "Столица Франции?"
3. Дождитесь ответа (например: "Столица Франции — Париж.")
4. Нажмите кнопку "Second Opinion" (иконка с двумя пузырями)
5. **Ожидаемое поведение**:
   - ✅ Второе мнение генерируется успешно
   - ✅ Показывается divergence alert: "Minor differences" или "Low divergence"
   - ✅ НЕ показывается "Significant Differences" для похожих ответов

6. **Неправильное поведение (было раньше)**:
   - ❌ Показывалось "Significant Differences" даже для идентичных ответов

### Тест 3: Второе мнение на английском

1. Отправьте вопрос на английском: "What is the capital of France?"
2. Нажмите "Second Opinion"
3. **Ожидаемое поведение**:
   - ✅ Работает так же как на русском
   - ✅ Корректно определяет divergence

### Тест 4: Только один dev сервер

1. Проверьте что запущен только один процесс:

   ```bash
   ps aux | grep "vite dev" | grep -v grep
   ```

   Должна быть только ОДНА строка

2. Проверьте порт:

   ```bash
   lsof -ti:3005
   ```

   Должен быть только ОДИН процесс

3. Попробуйте запустить второй dev сервер:
   ```bash
   npm run dev
   ```
   **Ожидаемое поведение**:
   - ✅ Должна быть ошибка "Port 3005 is already in use"
   - ✅ Сервер НЕ запустится на порту 3006

## Проверка тестов

```bash
# Все тесты
npm run test:run

# Только waiting phrases
npm run test:run tests/unit/chat/waitingPhrasesService.test.js

# Только divergence detection
npm run test:run tests/unit/chat/DivergenceDetector.test.js

# Regression test для кириллицы
npm run test:run tests/unit/bugfixes/issue-cyrillic-divergence.test.js
```

Все тесты должны проходить ✅

## Известные проблемы

### Второе мнение возвращает 500 ошибку

Если вы видите ошибку 500 при запросе второго мнения:

1. Проверьте логи сервера в терминале
2. Убедитесь что Ollama запущен (если используется)
3. Проверьте что есть альтернативный провайдер

### Waiting phrase все еще появляется после ответа

Если проблема осталась:

1. Проверьте что изменения применились:

   ```bash
   grep -n "cancelWaitingPhrases" src/lib/modules/chat/services.js
   ```

   Должно быть несколько совпадений

2. Перезапустите dev сервер:

   ```bash
   npm run dev:single
   ```

3. Очистите кэш браузера (Cmd+Shift+R на Mac)

## Логи для отладки

В консоли браузера вы должны видеть:

```
waitingPhrasesService.js: Selected phrase: "..."
voiceServices.js: Voice mode inactive, skipping speech synthesis
services.js: sendMessage called with content: ...
```

Если waiting phrase появляется после ответа, вы увидите:

```
addMessage called AFTER response received  ← ❌ Это баг
```

## Контакты

Если что-то не работает:

1. Проверьте логи в консоли браузера (F12)
2. Проверьте логи dev сервера в терминале
3. Запустите тесты: `npm run test:run`

## Полезные команды

```bash
# Остановить все dev серверы
pkill -f "node.*vite dev"

# Очистить порты
lsof -ti:3000-3015 | xargs kill -9

# Очистить БД соединения
npm run db:cleanup --force

# Запустить один dev сервер
npm run dev:single

# Проверить что работает
curl http://localhost:3005/api/health
```

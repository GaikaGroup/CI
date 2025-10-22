# Testing Requirements - Обязательное тестирование

## КРИТИЧЕСКОЕ ПРАВИЛО: Тесты обязательны для каждого изменения

**НИКОГДА не добавляйте новый функционал без тестов!**

При любом изменении кода:

1. ✅ Сначала запустите существующие тесты
2. ✅ Добавьте новые тесты для нового функционала
3. ✅ Запустите все тесты перед завершением
4. ✅ Убедитесь, что покрытие не уменьшилось

## Обязательный процесс разработки

### 1. Перед началом работы

```bash
# Запустите все тесты чтобы убедиться что всё работает
npm run test:run
```

### 2. Во время разработки

**Для каждого нового функционала создайте тесты:**

#### Новый API endpoint → Интеграционный тест

```javascript
// tests/integration/api/my-endpoint.test.js
describe('POST /api/my-endpoint', () => {
  it('should create resource successfully', async () => {
    // Test implementation
  });

  it('should return 401 for unauthenticated users', async () => {
    // Test implementation
  });

  it('should validate required fields', async () => {
    // Test implementation
  });
});
```

#### Новый сервис → Unit тест

```javascript
// tests/unit/my-feature/myService.test.js
describe('MyService', () => {
  it('should process data correctly', () => {
    // Test implementation
  });

  it('should handle errors gracefully', () => {
    // Test implementation
  });
});
```

#### Новый компонент → Component тест

```javascript
// tests/unit/components/MyComponent.test.js
describe('MyComponent', () => {
  it('should render with props', () => {
    // Test implementation
  });

  it('should handle user interactions', () => {
    // Test implementation
  });
});
```

#### Новый user flow → E2E тест

```javascript
// tests/e2e/myFeatureFlow.test.js
describe('My Feature Flow', () => {
  it('should complete full user journey', async () => {
    // Test implementation
  });
});
```

### 3. После завершения разработки

```bash
# Запустите все тесты
npm run test:run

# Проверьте покрытие
npm run test:coverage

# Проверьте качество кода
npm run lint
npm run format

# Если покрытие упало - добавьте больше тестов!
# Если есть ошибки lint - исправьте их!
```

## Минимальные требования к тестам

### Для каждого API endpoint:

- ✅ Успешный сценарий (200/201)
- ✅ Проверка аутентификации (401)
- ✅ Проверка авторизации (403)
- ✅ Валидация входных данных (400)
- ✅ Обработка ошибок (500)

### Для каждого сервиса:

- ✅ Основная функциональность
- ✅ Граничные случаи
- ✅ Обработка ошибок
- ✅ Валидация данных

### Для каждого компонента:

- ✅ Рендеринг с разными props
- ✅ Обработка событий
- ✅ Условный рендеринг
- ✅ Состояния загрузки/ошибок

### Для критических user flows:

- ✅ E2E тест полного сценария
- ✅ Проверка всех шагов
- ✅ Обработка ошибок

## Структура тестов

```
tests/
├── unit/                    # Unit тесты
│   ├── auth/
│   ├── chat/
│   ├── courses/
│   └── [module]/
├── integration/             # Интеграционные тесты
│   ├── api/
│   ├── chat/
│   └── [module]/
└── e2e/                     # E2E тесты
    ├── authFlow.test.js
    ├── courseFlow.test.js
    └── [feature]Flow.test.js
```

## Правила написания тестов

### 1. Тесты должны быть изолированными

```javascript
// Good: Каждый тест независим
describe('MyService', () => {
  beforeEach(() => {
    // Свежее состояние для каждого теста
  });

  it('test 1', () => {});
  it('test 2', () => {});
});

// Bad: Тесты зависят друг от друга
let sharedState;
it('test 1', () => {
  sharedState = 'value';
});
it('test 2', () => {
  expect(sharedState).toBe('value');
});
```

### 2. Тесты должны быть понятными

```javascript
// Good: Понятное описание
it('should return 401 when user is not authenticated', () => {
  // ...
});

// Bad: Непонятное описание
it('works', () => {
  // ...
});
```

### 3. Используйте AAA паттерн

```javascript
it('should calculate total correctly', () => {
  // Arrange - подготовка
  const items = [{ price: 10 }, { price: 20 }];

  // Act - действие
  const total = calculateTotal(items);

  // Assert - проверка
  expect(total).toBe(30);
});
```

### 4. Мокайте внешние зависимости

```javascript
// Good: Мокаем внешние API
vi.mock('$lib/services/OpenAIService', () => ({
  chat: vi.fn().mockResolvedValue({ text: 'response' })
}));

// Bad: Реальные вызовы к внешним API
const response = await fetch('https://api.openai.com/...');
```

## Регрессионное тестирование

### При исправлении бага:

1. Создайте тест, который воспроизводит баг
2. Убедитесь, что тест падает
3. Исправьте баг
4. Убедитесь, что тест проходит
5. Тест остаётся в кодовой базе навсегда

```javascript
// tests/unit/bugfixes/issue-123.test.js
describe('Bug #123: User cannot login with email', () => {
  it('should allow login with email containing +', async () => {
    const email = 'user+test@example.com';
    const result = await AuthService.login(email, 'password');
    expect(result.success).toBe(true);
  });
});
```

## Continuous Integration

### Pre-commit hook

```bash
# .husky/pre-commit
npm run lint
npm run format
npm run test:run
```

### Pre-push hook

```bash
# .husky/pre-push
npm run lint
npm run test:run
npm run test:coverage
```

## Качество кода

### ESLint

Проверяет код на ошибки и соблюдение стандартов:

```bash
npm run lint
```

Исправляет автоматически исправимые проблемы:

```bash
npm run lint -- --fix
```

### Prettier

Форматирует код согласно стандартам:

```bash
npm run format
```

### Обязательно перед коммитом:

1. Код должен быть отформатирован
2. Не должно быть ошибок ESLint
3. Не должно быть предупреждений TypeScript
4. Все тесты должны проходить

## Метрики качества

### Целевые показатели:

- **Unit тесты**: 80%+ покрытие
- **Integration тесты**: Все API endpoints
- **E2E тесты**: Все критические user flows
- **Время выполнения**: < 30 секунд для unit, < 2 минут для всех

### Проверка покрытия:

```bash
npm run test:coverage

# Должно показать:
# Statements   : 80% ( 400/500 )
# Branches     : 75% ( 150/200 )
# Functions    : 85% ( 170/200 )
# Lines        : 80% ( 380/475 )
```

## Что делать если тесты падают

### 1. НЕ игнорируйте падающие тесты!

```javascript
// НИКОГДА не делайте так:
it.skip('broken test', () => {}); // ❌
```

### 2. Исправьте немедленно:

- Если тест падает из-за бага → исправьте баг
- Если тест устарел → обновите тест
- Если тест некорректен → перепишите тест

### 3. Если нужно время на исправление:

- Создайте issue с описанием проблемы
- Добавьте TODO комментарий
- Исправьте в течение 24 часов

## Примеры обязательных тестов

### Новый модуль чата:

```javascript
// Unit тесты
tests / unit / chat / messageService.test.js;
tests / unit / chat / voiceService.test.js;
tests / unit / chat / translationService.test.js;

// Integration тесты
tests / integration / chat / chatFlow.test.js;
tests / integration / chat / voiceIntegration.test.js;

// E2E тесты
tests / e2e / chatUserFlow.test.js;
```

### Новый API endpoint:

```javascript
// Integration тест
tests/integration/api/courses/create.test.js
tests/integration/api/courses/update.test.js
tests/integration/api/courses/delete.test.js
```

### Новый компонент:

```javascript
// Component тест
tests / unit / components / CourseCard.test.js;
tests / unit / components / EnrollButton.test.js;
```

## Чеклист перед коммитом

- [ ] Все существующие тесты проходят (`npm run test:run`)
- [ ] Добавлены тесты для нового функционала
- [ ] Покрытие не уменьшилось (`npm run test:coverage`)
- [ ] Нет skip/todo тестов без issue
- [ ] Тесты выполняются быстро (< 30 сек)
- [ ] Нет console.log в тестах
- [ ] Моки очищаются после тестов
- [ ] Код отформатирован (`npm run format`)
- [ ] Нет ошибок ESLint (`npm run lint`)
- [ ] Нет ошибок TypeScript/диагностики

## Полезные команды

```bash
# Тестирование
npm run test:run                    # Запустить все тесты один раз
npm run test                        # Запустить тесты в watch режиме
npm run test:coverage               # Запустить тесты с покрытием
npm run test:run tests/unit         # Только unit тесты
npm run test:run tests/integration  # Только integration тесты
npm run test:e2e                    # Только e2e тесты

# Качество кода
npm run lint                        # Проверить ESLint
npm run format                      # Отформатировать код (Prettier)

# Полная проверка перед коммитом
npm run test:run && npm run lint && npm run format
```

## Помните

**Тесты - это не опциональная часть разработки!**

- Тесты защищают от регрессий
- Тесты документируют поведение
- Тесты ускоряют разработку в долгосрочной перспективе
- Тесты дают уверенность в изменениях

**Каждый новый функционал = новые тесты = больше защиты = меньше багов**

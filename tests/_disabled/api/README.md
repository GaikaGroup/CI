# Real API Tests

Эти тесты делают **реальные HTTP запросы** к запущенному серверу.

## Требования

1. **Сервер должен быть запущен:**

   ```bash
   npm run dev
   # Сервер должен работать на http://localhost:3002
   ```

2. **Пользователи должны существовать в базе:**
   - AdminLogin (admin)
   - Другие тестовые пользователи

## Как получить cookie для тестов

### Вариант 1: Из браузера (для ручного тестирования)

1. Открой http://localhost:3002
2. Залогинься как AdminLogin
3. Открой DevTools (F12) → Application → Cookies
4. Скопируй значение cookie `user`
5. Вставь в тест:
   ```javascript
   const ADMIN_COOKIE = 'user=<скопированное значение>';
   ```

### Вариант 2: Программно (для автоматических тестов)

Используй helper для логина:

```javascript
import { loginAsAdmin, loginAsUser } from './helpers/auth.js';

describe('My API Test', () => {
  let adminCookie;

  beforeAll(async () => {
    adminCookie = await loginAsAdmin();
  });

  it('should work with admin', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: adminCookie }
    });
    // ...
  });
});
```

## Запуск тестов

```bash
# Убедись что сервер запущен
npm run dev

# В другом терминале запусти тесты
npm run test:run tests/api/
```

## Структура тестов

- `admin-endpoints.test.js` - тесты admin API
- `auth-endpoints.test.js` - тесты аутентификации
- `courses-endpoints.test.js` - тесты курсов
- `sessions-endpoints.test.js` - тесты сессий
- `helpers/` - вспомогательные функции

## Что тестируем

✅ **Реальные HTTP запросы** к работающему серверу
✅ **Реальная аутентификация** через cookies
✅ **Реальная база данных** (не моки)
✅ **Реальные ответы** от API

❌ **НЕ тестируем:**

- Внутреннюю логику (это unit тесты)
- UI/браузер (это E2E тесты)
- Моки и стабы

## Примеры

### Тест без аутентификации

```javascript
it('should return 401 without auth', async () => {
  const response = await fetch(`${BASE_URL}/api/admin/users`);
  expect(response.status).toBe(401);
});
```

### Тест с аутентификацией

```javascript
it('should return data for admin', async () => {
  const response = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Cookie: adminCookie }
  });
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.users).toBeDefined();
});
```

### Тест POST запроса

```javascript
it('should create resource', async () => {
  const response = await fetch(`${BASE_URL}/api/courses`, {
    method: 'POST',
    headers: {
      Cookie: adminCookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Course',
      language: 'en'
    })
  });
  expect(response.status).toBe(201);
});
```

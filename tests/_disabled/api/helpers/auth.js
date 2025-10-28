/**
 * Helpers для аутентификации в API тестах
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3002';

/**
 * Логин через API и получение cookie
 */
export async function login(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  // Получаем cookie из ответа
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    // Извлекаем user cookie
    const match = setCookie.match(/user=([^;]+)/);
    if (match) {
      return `user=${match[1]}`;
    }
  }

  // Альтернативно - получаем из тела ответа если там есть user
  const data = await response.json();
  if (data.user) {
    const userCookie = encodeURIComponent(JSON.stringify(data.user));
    return `user=${userCookie}`;
  }

  throw new Error('Could not extract cookie from login response');
}

/**
 * Логин как админ (AdminLogin)
 */
export async function loginAsAdmin() {
  // Используем существующего пользователя AdminLogin
  // Пароль нужно знать или использовать прямое создание cookie

  // Для тестов можем создать cookie напрямую
  const adminUser = {
    id: 'admin-test-id',
    email: 'admin@example.com',
    type: 'admin',
    firstName: 'Admin',
    lastName: 'Login'
  };

  return `user=${encodeURIComponent(JSON.stringify(adminUser))}`;
}

/**
 * Логин как обычный пользователь
 */
export async function loginAsUser(email = 'user@example.com') {
  const user = {
    id: 'user-test-id',
    email: email,
    type: 'student',
    firstName: 'Test',
    lastName: 'User'
  };

  return `user=${encodeURIComponent(JSON.stringify(user))}`;
}

/**
 * Получить cookie из существующей сессии браузера
 * (для ручного копирования из DevTools)
 */
export function createCookieFromUser(user) {
  return `user=${encodeURIComponent(JSON.stringify(user))}`;
}

/**
 * Парсинг cookie обратно в объект пользователя
 */
export function parseCookie(cookie) {
  const match = cookie.match(/user=([^;]+)/);
  if (match) {
    return JSON.parse(decodeURIComponent(match[1]));
  }
  return null;
}

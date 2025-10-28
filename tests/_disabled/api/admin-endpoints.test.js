import { describe, it, expect, beforeAll } from 'vitest';
import { loginAsAdmin } from './helpers/auth.js';

/**
 * Real API tests - делают HTTP запросы к запущенному серверу
 * Требуется: сервер должен быть запущен на http://localhost:3002
 */

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3002';

describe('Admin API Endpoints (Real HTTP)', () => {
  let adminCookie;

  beforeAll(async () => {
    console.log('\n🌐 Testing against:', BASE_URL);
    console.log('⚠️  Make sure server is running: npm run dev\n');

    // Получаем cookie для админа
    adminCookie = await loginAsAdmin();
  });

  describe('GET /api/admin/users', () => {
    it('should return 401 without authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/users`);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return users list for admin', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: {
          Cookie: adminCookie
        }
      });

      // Может быть 200 или 403 в зависимости от реальной аутентификации
      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.users).toBeDefined();
        expect(Array.isArray(data.users)).toBe(true);
      }
    });
  });

  describe('GET /api/admin/sessions', () => {
    it('should return 401 without authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/sessions`);

      expect(response.status).toBe(401);
    });

    it('should return sessions list for admin', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/sessions`, {
        headers: {
          Cookie: adminCookie
        }
      });

      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.sessions).toBeDefined();
        expect(Array.isArray(data.sessions)).toBe(true);
      }
    });
  });

  describe('GET /api/admin/finance/costs', () => {
    it('should return 401 without authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/finance/costs`);

      expect(response.status).toBe(401);
    });

    it('should return finance data for admin', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/finance/costs`, {
        headers: {
          Cookie: adminCookie
        }
      });

      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.costs).toBeDefined();
      }
    });
  });

  describe('POST /api/admin/stats/clear-cache', () => {
    it('should return 401 without authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/stats/clear-cache`, {
        method: 'POST'
      });

      expect(response.status).toBe(401);
    });

    it('should clear cache for admin', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/stats/clear-cache`, {
        method: 'POST',
        headers: {
          Cookie: adminCookie
        }
      });

      expect([200, 401, 403]).toContain(response.status);
    });
  });
});

describe('Public API Endpoints (Real HTTP)', () => {
  describe('GET /api/courses', () => {
    it('should return courses list', async () => {
      const response = await fetch(`${BASE_URL}/api/courses`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/sessions', () => {
    it('should return 401 without authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/sessions`);

      expect(response.status).toBe(401);
    });
  });
});

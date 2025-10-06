import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../../../src/lib/database/index.js', () => ({
  db: {
    session: {
      groupBy: vi.fn(),
      count: vi.fn(),
    }
  }
}));

// Mock constants
vi.mock('../../../src/lib/shared/utils/constants.js', () => ({
  STORAGE_KEYS: {
    USER: 'user'
  }
}));

// Import after mocking
import { GET as getUsersHandler } from '../../../src/routes/api/admin/users/+server.js';
import { db } from '../../../src/lib/database/index.js';

describe('Users API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return users and statistics for admin user', async () => {
      const mockSessionGroups = [
        {
          userId: 'user1@test.com',
          _count: { id: 5 },
          _sum: { messageCount: 23 },
          _min: { createdAt: new Date('2025-01-15') }
        },
        {
          userId: 'user2@test.com',
          _count: { id: 3 },
          _sum: { messageCount: 12 },
          _min: { createdAt: new Date('2025-01-10') }
        }
      ];

      db.session.groupBy.mockResolvedValue(mockSessionGroups);
      db.session.count.mockResolvedValue(8);

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await getUsersHandler({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.users[0].email).toBe('user1@test.com');
      expect(data.users[0].sessionCount).toBe(5);
      expect(data.users[0].messageCount).toBe(23);
      expect(data.statistics.totalUsers).toBe(2);
      expect(data.statistics.totalSessions).toBe(8);
    });

    it('should sort users by registration date descending', async () => {
      const mockSessionGroups = [
        {
          userId: 'user1@test.com',
          _count: { id: 5 },
          _sum: { messageCount: 23 },
          _min: { createdAt: new Date('2025-01-10') }
        },
        {
          userId: 'user2@test.com',
          _count: { id: 3 },
          _sum: { messageCount: 12 },
          _min: { createdAt: new Date('2025-01-15') }
        }
      ];

      db.session.groupBy.mockResolvedValue(mockSessionGroups);
      db.session.count.mockResolvedValue(8);

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await getUsersHandler({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(data.users[0].email).toBe('user2@test.com'); // Newer date first
      expect(data.users[1].email).toBe('user1@test.com');
    });

    it('should return 401 if user is not authenticated', async () => {
      const mockLocals = { user: null };
      const mockCookies = {
        get: vi.fn().mockReturnValue(null)
      };

      const response = await getUsersHandler({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 if user is not admin', async () => {
      const mockLocals = {
        user: { id: 'user1', email: 'user@test.com', role: 'student' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await getUsersHandler({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should handle database errors gracefully', async () => {
      db.session.groupBy.mockRejectedValue(new Error('Database error'));

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await getUsersHandler({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch user data');
    });

    it('should handle null message counts', async () => {
      const mockSessionGroups = [
        {
          userId: 'user1@test.com',
          _count: { id: 5 },
          _sum: { messageCount: null }, // No messages
          _min: { createdAt: new Date('2025-01-15') }
        }
      ];

      db.session.groupBy.mockResolvedValue(mockSessionGroups);
      db.session.count.mockResolvedValue(5);

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await getUsersHandler({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(data.users[0].messageCount).toBe(0);
    });

    it('should authenticate from cookie if locals.user is not set', async () => {
      const mockSessionGroups = [
        {
          userId: 'user1@test.com',
          _count: { id: 5 },
          _sum: { messageCount: 23 },
          _min: { createdAt: new Date('2025-01-15') }
        }
      ];

      db.session.groupBy.mockResolvedValue(mockSessionGroups);
      db.session.count.mockResolvedValue(5);

      const mockLocals = { user: null };
      const mockCookies = {
        get: vi.fn().mockReturnValue(JSON.stringify({ id: 'admin', email: 'admin@test.com', role: 'admin' }))
      };

      const response = await getUsersHandler({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock database
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

import { db } from '../../../src/lib/database/index.js';

describe('Users Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Full Page Load Flow', () => {
    it('should load users page with data for admin user', async () => {
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

      // Import API handler
      const { GET } = await import('../../../src/routes/api/admin/users/+server.js');

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await GET({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      // Verify API response
      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.statistics.totalUsers).toBe(2);
      expect(data.statistics.totalSessions).toBe(8);

      // Verify data structure matches page expectations
      expect(data.users[0]).toHaveProperty('email');
      expect(data.users[0]).toHaveProperty('registrationDate');
      expect(data.users[0]).toHaveProperty('sessionCount');
      expect(data.users[0]).toHaveProperty('messageCount');
    });

    it('should handle API errors gracefully', async () => {
      db.session.groupBy.mockRejectedValue(new Error('Database connection failed'));

      const { GET } = await import('../../../src/routes/api/admin/users/+server.js');

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await GET({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch user data');
    });
  });

  describe('Search Functionality', () => {
    it('should filter users by email in real-time', async () => {
      const mockSessionGroups = [
        {
          userId: 'alice@test.com',
          _count: { id: 5 },
          _sum: { messageCount: 23 },
          _min: { createdAt: new Date('2025-01-15') }
        },
        {
          userId: 'bob@test.com',
          _count: { id: 3 },
          _sum: { messageCount: 12 },
          _min: { createdAt: new Date('2025-01-10') }
        },
        {
          userId: 'charlie@test.com',
          _count: { id: 7 },
          _sum: { messageCount: 35 },
          _min: { createdAt: new Date('2025-01-12') }
        }
      ];

      db.session.groupBy.mockResolvedValue(mockSessionGroups);
      db.session.count.mockResolvedValue(15);

      const { GET } = await import('../../../src/routes/api/admin/users/+server.js');

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await GET({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      // Simulate client-side filtering
      const searchQuery = 'alice';
      const filteredUsers = data.users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filteredUsers).toHaveLength(1);
      expect(filteredUsers[0].email).toBe('alice@test.com');
    });

    it('should return empty array when no users match search', async () => {
      const mockSessionGroups = [
        {
          userId: 'alice@test.com',
          _count: { id: 5 },
          _sum: { messageCount: 23 },
          _min: { createdAt: new Date('2025-01-15') }
        }
      ];

      db.session.groupBy.mockResolvedValue(mockSessionGroups);
      db.session.count.mockResolvedValue(5);

      const { GET } = await import('../../../src/routes/api/admin/users/+server.js');

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await GET({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      // Simulate client-side filtering with no matches
      const searchQuery = 'nonexistent';
      const filteredUsers = data.users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filteredUsers).toHaveLength(0);
    });
  });

  describe('Access Control', () => {
    it('should deny access to non-admin users', async () => {
      const { GET } = await import('../../../src/routes/api/admin/users/+server.js');

      const mockLocals = {
        user: { id: 'user1', email: 'user@test.com', role: 'student' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await GET({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should deny access to unauthenticated users', async () => {
      const { GET } = await import('../../../src/routes/api/admin/users/+server.js');

      const mockLocals = { user: null };
      const mockCookies = {
        get: vi.fn().mockReturnValue(null)
      };

      const response = await GET({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Data Aggregation', () => {
    it('should correctly aggregate user statistics', async () => {
      const mockSessionGroups = [
        {
          userId: 'user1@test.com',
          _count: { id: 10 },
          _sum: { messageCount: 50 },
          _min: { createdAt: new Date('2025-01-01') }
        },
        {
          userId: 'user2@test.com',
          _count: { id: 5 },
          _sum: { messageCount: 25 },
          _min: { createdAt: new Date('2025-01-05') }
        }
      ];

      db.session.groupBy.mockResolvedValue(mockSessionGroups);
      db.session.count.mockResolvedValue(15);

      const { GET } = await import('../../../src/routes/api/admin/users/+server.js');

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await GET({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      // Verify aggregation (users are sorted by registration date descending, so user2 comes first)
      expect(data.users[0].email).toBe('user2@test.com');
      expect(data.users[0].sessionCount).toBe(5);
      expect(data.users[0].messageCount).toBe(25);
      expect(data.users[1].email).toBe('user1@test.com');
      expect(data.users[1].sessionCount).toBe(10);
      expect(data.users[1].messageCount).toBe(50);
      expect(data.statistics.totalSessions).toBe(15);
    });

    it('should handle users with no messages', async () => {
      const mockSessionGroups = [
        {
          userId: 'user1@test.com',
          _count: { id: 5 },
          _sum: { messageCount: null },
          _min: { createdAt: new Date('2025-01-15') }
        }
      ];

      db.session.groupBy.mockResolvedValue(mockSessionGroups);
      db.session.count.mockResolvedValue(5);

      const { GET } = await import('../../../src/routes/api/admin/users/+server.js');

      const mockLocals = {
        user: { id: 'admin', email: 'admin@test.com', role: 'admin' }
      };

      const mockCookies = {
        get: vi.fn()
      };

      const response = await GET({ locals: mockLocals, cookies: mockCookies });
      const data = await response.json();

      expect(data.users[0].messageCount).toBe(0);
    });
  });
});

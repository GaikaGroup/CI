import { json } from '@sveltejs/kit';
import { db } from '$lib/database/index.js';
import { STORAGE_KEYS } from '$shared/utils/constants';

/**
 * Get all users with statistics
 * GET /api/admin/users
 * 
 * Returns:
 * - users: Array of user objects with email, registration date, session count, message count
 * - statistics: Total users and total sessions
 */
export async function GET({ locals, cookies }) {
  try {
    // Check authentication
    let user = locals.user;

    if (!user) {
      const cookieUser = cookies.get(STORAGE_KEYS.USER);
      if (cookieUser) {
        try {
          user = JSON.parse(cookieUser);
        } catch (error) {
          console.error('Failed to parse user cookie in users API', error);
        }
      }
    }

    if (!user) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin role
    if (user.role !== 'admin') {
      return json({ error: 'Admin access required' }, { status: 403 });
    }

    // Query sessions grouped by userId
    const sessionGroups = await db.session.groupBy({
      by: ['userId'],
      _count: {
        id: true
      },
      _sum: {
        messageCount: true
      },
      _min: {
        createdAt: true
      }
    });

    // Transform to user data
    const users = sessionGroups.map(group => ({
      userId: group.userId,
      email: group.userId, // In mock auth, userId is the email
      registrationDate: group._min.createdAt,
      sessionCount: group._count.id,
      messageCount: group._sum.messageCount || 0
    }));

    // Sort by registration date descending (newest first)
    users.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));

    // Calculate statistics
    const totalSessions = await db.session.count();
    const statistics = {
      totalUsers: users.length,
      totalSessions: totalSessions
    };

    return json({ users, statistics });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}

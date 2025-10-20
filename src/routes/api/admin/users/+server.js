import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import { UserRoleService } from '$lib/modules/auth/services/UserRoleService.js';

/**
 * Get all users with statistics
 * GET /api/admin/users
 */
export async function GET({ locals, cookies }) {
  try {
    // Check authentication
    let user = locals.user;

    if (!user) {
      const cookieUser = cookies.get('user');
      if (cookieUser) {
        try {
          user = JSON.parse(decodeURIComponent(cookieUser));
        } catch (error) {
          console.error('Failed to parse user cookie', error);
        }
      }
    }

    if (!user) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin type
    if (user.type !== 'admin') {
      return json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users from database
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        type: true,
        createdAt: true,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get session statistics
    const sessionGroups = await db.session.groupBy({
      by: ['userId'],
      _count: {
        id: true
      },
      _sum: {
        messageCount: true
      }
    });

    // Create session stats map
    const sessionStats = new Map();
    sessionGroups.forEach((group) => {
      sessionStats.set(group.userId, {
        sessionCount: group._count.id,
        messageCount: group._sum.messageCount || 0
      });
    });

    // Get user roles for all users
    const userIds = users.map(u => u.id);
    const userRoles = await UserRoleService.getUserRolesBatch(userIds);

    // Format users data with dynamic roles
    const formattedUsers = users.map((user) => {
      const stats = sessionStats.get(user.id) || { sessionCount: 0, messageCount: 0 };
      const roleInfo = userRoles.get(user.id) || { roles: ['Regular'] };
      
      return {
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        type: user.type, // Admin or Regular
        roles: roleInfo.roles, // Student, Tutor, or both
        registrationDate: user.createdAt,
        sessionCount: stats.sessionCount,
        messageCount: stats.messageCount,
        isActive: user.isActive
      };
    });

    // Get total sessions
    const totalSessions = await db.session.count();

    const statistics = {
      totalUsers: formattedUsers.length,
      totalSessions: totalSessions
    };

    return json({ 
      users: formattedUsers, 
      statistics 
    });

  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}
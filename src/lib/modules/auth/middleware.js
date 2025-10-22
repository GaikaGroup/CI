import jwt from 'jsonwebtoken';
import { securityConfig } from '$lib/config/environment.js';
import { db } from '$lib/database/connection.js';

/**
 * JWT Authentication middleware for SvelteKit
 * Verifies JWT tokens and loads user data
 */
export async function authenticateUser(event) {
  try {
    // Get token from cookie or Authorization header
    let token = event.cookies.get('auth_token');

    if (!token) {
      const authHeader = event.request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, securityConfig.jwtSecret);

    // Load user from database
    const user = await db.user.findUnique({
      where: {
        id: decoded.userId,
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        type: true,
        createdAt: true
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      type: user.type,
      createdAt: user.createdAt
    };
  } catch (error) {
    // If JWT is invalid, clear the cookie to prevent repeated errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      event.cookies.delete('auth_token', { path: '/' });
      event.cookies.delete('user', { path: '/' });
    }
    return null;
  }
}

/**
 * Check if user has admin role
 */
export function isAdmin(user) {
  return user && user.type === 'admin';
}

/**
 * Require authentication middleware
 */
export function requireAuth(user) {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Require admin role middleware
 */
export function requireAdmin(user) {
  requireAuth(user);
  if (!isAdmin(user)) {
    throw new Error('Admin access required');
  }
  return user;
}

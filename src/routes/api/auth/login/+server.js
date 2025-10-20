import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { securityConfig } from '$lib/config/environment.js';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Login user
 * POST /api/auth/login
 */
export async function POST({ request, cookies }) {
  try {
    const { email, password } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email (try both original and lowercase)
    let user = await db.user.findUnique({
      where: { 
        email: email.trim(),
        isActive: true
      }
    });

    // If not found, try lowercase
    if (!user) {
      user = await db.user.findUnique({
        where: { 
          email: email.toLowerCase().trim(),
          isActive: true
        }
      });
    }

    if (!user) {
      return json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        type: user.type
      },
      securityConfig.jwtSecret,
      { expiresIn: '7d' }
    );

    // Set secure cookie
    cookies.set('auth_token', token, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    // Set user data cookie for client-side access
    const userData = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      type: user.type
    };

    cookies.set('user', JSON.stringify(userData), {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return json({
      success: true,
      message: 'Login successful',
      user: userData,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
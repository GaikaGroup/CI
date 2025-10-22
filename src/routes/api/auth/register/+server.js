import { json } from '@sveltejs/kit';
import { db } from '$lib/database/connection.js';
import bcrypt from 'bcryptjs';

/**
 * Register new user
 * POST /api/auth/register
 */
export async function POST({ request }) {
  try {
    const { firstName, lastName, email, password } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await db.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        type: 'regular'
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

    return json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        type: user.type
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return json({ error: 'User with this email already exists' }, { status: 409 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

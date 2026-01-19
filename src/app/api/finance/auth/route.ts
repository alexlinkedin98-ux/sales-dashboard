import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

// Simple hash function for password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/finance/auth - Login or create user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, password, action } = body;

    if (!name || !password) {
      return NextResponse.json(
        { error: 'Name and password are required' },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);

    if (action === 'register') {
      // Check if user already exists
      const existingUser = await prisma.financeUser.findUnique({
        where: { name },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists. Please login instead.' },
          { status: 400 }
        );
      }

      // Create new user
      const user = await prisma.financeUser.create({
        data: {
          name,
          passwordHash,
        },
      });

      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name },
      });
    } else {
      // Login - find user and verify password
      const user = await prisma.financeUser.findUnique({
        where: { name },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found. Please register first.' },
          { status: 404 }
        );
      }

      if (user.passwordHash !== passwordHash) {
        return NextResponse.json(
          { error: 'Incorrect password' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name },
      });
    }
  } catch (error) {
    console.error('Error in finance auth:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// GET /api/finance/auth - Get all user names (for dropdown, no passwords)
export async function GET() {
  try {
    const users = await prisma.financeUser.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching finance users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

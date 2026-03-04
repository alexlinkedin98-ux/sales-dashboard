import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await prisma.gmailConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!config) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      email: config.emailAddress,
      tokenExpired: config.tokenExpiresAt < new Date(),
      connectedAt: config.connectedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    return NextResponse.json({ connected: false });
  }
}

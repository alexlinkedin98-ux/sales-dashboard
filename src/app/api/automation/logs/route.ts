import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sequenceId = searchParams.get('sequenceId');
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const where: Record<string, unknown> = {};
    if (sequenceId) where.sequenceId = sequenceId;

    const logs = await prisma.automationLog.findMany({
      where,
      include: {
        sequence: {
          select: { contactName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching automation logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

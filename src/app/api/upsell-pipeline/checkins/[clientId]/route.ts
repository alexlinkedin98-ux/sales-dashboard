import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    const checkIns = await prisma.upsellCheckIn.findMany({
      where: { clientId },
      orderBy: { checkInDate: 'desc' },
    });

    return NextResponse.json(checkIns);
  } catch (error) {
    console.error('Error fetching check-in history:', error);
    return NextResponse.json({ error: 'Failed to fetch check-in history' }, { status: 500 });
  }
}

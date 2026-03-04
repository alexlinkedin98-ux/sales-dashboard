import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, analystName, status, notes } = body;

    if (!clientId || !analystName || !status) {
      return NextResponse.json(
        { error: 'Client ID, analyst name, and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['ready', 'not_yet', 'maybe'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const checkIn = await prisma.upsellCheckIn.create({
      data: {
        clientId,
        analystName,
        status,
        notes: notes || null,
        checkInDate: new Date(),
      },
      include: {
        client: true,
      },
    });

    return NextResponse.json(checkIn, { status: 201 });
  } catch (error) {
    console.error('Error creating check-in:', error);
    return NextResponse.json({ error: 'Failed to create check-in' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// DELETE an entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.weeklyEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}

// PUT update an entry
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      introCallsScheduled,
      introCallsTaken,
      accountsAudited,
      proposalsPitched,
      dealsClosed,
      mrr,
    } = body;

    const entry = await prisma.weeklyEntry.update({
      where: { id },
      data: {
        introCallsScheduled: introCallsScheduled ?? undefined,
        introCallsTaken: introCallsTaken ?? undefined,
        accountsAudited: accountsAudited ?? undefined,
        proposalsPitched: proposalsPitched ?? undefined,
        dealsClosed: dealsClosed ?? undefined,
        mrr: mrr ?? undefined,
      },
      include: { salesRep: true },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logChange } from '@/lib/changeLog';

// DELETE an entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the entry before deleting for the change log
    const entry = await prisma.weeklyEntry.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.weeklyEntry.delete({
      where: { id },
    });

    // Log the change
    await logChange({
      entityType: 'WeeklyEntry',
      entityId: id,
      action: 'delete',
      previousData: entry,
      description: `Deleted sales entry for ${entry.salesRep.name} - ${entry.weekLabel}`,
      relatedName: entry.salesRep.name,
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

    // Get the entry before updating for the change log
    const previousEntry = await prisma.weeklyEntry.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!previousEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

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

    // Log the change
    await logChange({
      entityType: 'WeeklyEntry',
      entityId: id,
      action: 'update',
      previousData: previousEntry,
      newData: entry,
      description: `Updated sales entry for ${entry.salesRep.name} - ${entry.weekLabel}`,
      relatedName: entry.salesRep.name,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

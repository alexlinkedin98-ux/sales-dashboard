import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logChange } from '@/lib/changeLog';

// GET all entries (with optional filtering by rep)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get('repId');

    const entries = await prisma.weeklyEntry.findMany({
      where: repId ? { salesRepId: repId } : undefined,
      include: { salesRep: true },
      orderBy: { weekStartDate: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

// POST create a new entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      salesRepId,
      weekStartDate,
      weekLabel,
      introCallsScheduled,
      introCallsTaken,
      accountsAudited,
      proposalsPitched,
      dealsClosed,
      mrr,
    } = body;

    if (!salesRepId || !weekStartDate) {
      return NextResponse.json(
        { error: 'Sales rep and week start date are required' },
        { status: 400 }
      );
    }

    const entry = await prisma.weeklyEntry.create({
      data: {
        salesRepId,
        weekStartDate: new Date(weekStartDate),
        weekLabel: weekLabel || new Date(weekStartDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        introCallsScheduled: introCallsScheduled || 0,
        introCallsTaken: introCallsTaken || 0,
        accountsAudited: accountsAudited || 0,
        proposalsPitched: proposalsPitched || 0,
        dealsClosed: dealsClosed || 0,
        mrr: mrr || 0,
      },
      include: { salesRep: true },
    });

    // Log the change
    await logChange({
      entityType: 'WeeklyEntry',
      entityId: entry.id,
      action: 'create',
      newData: entry,
      description: `Added sales entry for ${entry.salesRep.name} - ${entry.weekLabel}`,
      relatedName: entry.salesRep.name,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating entry:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An entry for this rep and week already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logChange } from '@/lib/changeLog';

function getWeekLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function GET() {
  try {
    const entries = await prisma.marketingEntry.findMany({
      include: { channel: true },
      orderBy: { weekStartDate: 'desc' },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching marketing entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekDate = searchParams.get('weekDate');

    if (!weekDate) {
      return NextResponse.json(
        { error: 'Week date is required' },
        { status: 400 }
      );
    }

    // Get entries before deleting for the change log
    const entries = await prisma.marketingEntry.findMany({
      where: {
        weekStartDate: new Date(weekDate),
      },
      include: { channel: true },
    });

    // Delete all entries for this week
    const deleted = await prisma.marketingEntry.deleteMany({
      where: {
        weekStartDate: new Date(weekDate),
      },
    });

    // Log each deletion
    for (const entry of entries) {
      await logChange({
        entityType: 'MarketingEntry',
        entityId: entry.id,
        action: 'delete',
        previousData: entry,
        description: `Deleted marketing entry for ${entry.channel.name} - ${entry.weekLabel}`,
        relatedName: entry.channel.name,
      });
    }

    return NextResponse.json({ success: true, count: deleted.count });
  } catch (error) {
    console.error('Error deleting marketing entries:', error);
    return NextResponse.json(
      { error: 'Failed to delete entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, weekStartDate, leadsGenerated } = body;

    if (!channelId || !weekStartDate) {
      return NextResponse.json(
        { error: 'Channel and week start date are required' },
        { status: 400 }
      );
    }

    const weekDate = new Date(weekStartDate);
    const weekLabel = getWeekLabel(weekDate);

    const entry = await prisma.marketingEntry.create({
      data: {
        channelId,
        weekStartDate: weekDate,
        weekLabel,
        leadsGenerated: leadsGenerated || 0,
      },
      include: { channel: true },
    });

    // Log the change
    await logChange({
      entityType: 'MarketingEntry',
      entityId: entry.id,
      action: 'create',
      newData: entry,
      description: `Added marketing entry for ${entry.channel.name} - ${entry.weekLabel}`,
      relatedName: entry.channel.name,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating marketing entry:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An entry for this channel and week already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    );
  }
}

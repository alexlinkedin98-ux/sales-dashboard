import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logChange } from '@/lib/changeLog';

// GET all marketing triage entries
export async function GET() {
  try {
    const entries = await prisma.marketingTriageEntry.findMany({
      include: {
        channel: true,
      },
      orderBy: [
        { weekStartDate: 'desc' },
        { channel: { name: 'asc' } },
      ],
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching marketing triage entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing triage entries' },
      { status: 500 }
    );
  }
}

// POST create a new marketing triage entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      channelId,
      weekStartDate,
      leadsReceived,
      leadsContacted,
      leadsQualified,
    } = body;

    // Validate required fields
    if (!channelId || !weekStartDate) {
      return NextResponse.json(
        { error: 'Channel and week start date are required' },
        { status: 400 }
      );
    }

    // Generate week label
    const date = new Date(weekStartDate);
    const weekLabel = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Check if entry exists (for logging purposes)
    const existingEntry = await prisma.marketingTriageEntry.findUnique({
      where: {
        channelId_weekStartDate: {
          channelId,
          weekStartDate: new Date(weekStartDate),
        },
      },
      include: { channel: true },
    });

    // Create or update (upsert) the entry
    const entry = await prisma.marketingTriageEntry.upsert({
      where: {
        channelId_weekStartDate: {
          channelId,
          weekStartDate: new Date(weekStartDate),
        },
      },
      update: {
        leadsReceived: leadsReceived || 0,
        leadsContacted: leadsContacted || 0,
        leadsQualified: leadsQualified || 0,
      },
      create: {
        channelId,
        weekStartDate: new Date(weekStartDate),
        weekLabel,
        leadsReceived: leadsReceived || 0,
        leadsContacted: leadsContacted || 0,
        leadsQualified: leadsQualified || 0,
      },
      include: {
        channel: true,
      },
    });

    // Log the change
    await logChange({
      entityType: 'MarketingTriageEntry',
      entityId: entry.id,
      action: existingEntry ? 'update' : 'create',
      previousData: existingEntry,
      newData: entry,
      description: existingEntry
        ? `Updated marketing triage for ${entry.channel.name} - ${entry.weekLabel}`
        : `Added marketing triage for ${entry.channel.name} - ${entry.weekLabel}`,
      relatedName: entry.channel.name,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating marketing triage entry:', error);
    return NextResponse.json(
      { error: 'Failed to create marketing triage entry' },
      { status: 500 }
    );
  }
}

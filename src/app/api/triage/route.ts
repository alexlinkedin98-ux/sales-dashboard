import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logChange } from '@/lib/changeLog';

// GET all triage entries
export async function GET() {
  try {
    const entries = await prisma.triageEntry.findMany({
      include: {
        salesRep: true,
      },
      orderBy: [
        { weekStartDate: 'desc' },
        { salesRep: { name: 'asc' } },
      ],
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching triage entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch triage entries' },
      { status: 500 }
    );
  }
}

// POST create a new triage entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      salesRepId,
      weekStartDate,
      triageBooked,
      triageTaken,
      qualifiedForIntro,
    } = body;

    // Validate required fields
    if (!salesRepId || !weekStartDate) {
      return NextResponse.json(
        { error: 'Sales rep and week start date are required' },
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
    const existingEntry = await prisma.triageEntry.findUnique({
      where: {
        salesRepId_weekStartDate: {
          salesRepId,
          weekStartDate: new Date(weekStartDate),
        },
      },
      include: { salesRep: true },
    });

    // Create or update (upsert) the entry
    const entry = await prisma.triageEntry.upsert({
      where: {
        salesRepId_weekStartDate: {
          salesRepId,
          weekStartDate: new Date(weekStartDate),
        },
      },
      update: {
        triageBooked: triageBooked || 0,
        triageTaken: triageTaken || 0,
        qualifiedForIntro: qualifiedForIntro || 0,
      },
      create: {
        salesRepId,
        weekStartDate: new Date(weekStartDate),
        weekLabel,
        triageBooked: triageBooked || 0,
        triageTaken: triageTaken || 0,
        qualifiedForIntro: qualifiedForIntro || 0,
      },
      include: {
        salesRep: true,
      },
    });

    // Log the change
    await logChange({
      entityType: 'TriageEntry',
      entityId: entry.id,
      action: existingEntry ? 'update' : 'create',
      previousData: existingEntry,
      newData: entry,
      description: existingEntry
        ? `Updated triage entry for ${entry.salesRep.name} - ${entry.weekLabel}`
        : `Added triage entry for ${entry.salesRep.name} - ${entry.weekLabel}`,
      relatedName: entry.salesRep.name,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating triage entry:', error);
    return NextResponse.json(
      { error: 'Failed to create triage entry' },
      { status: 500 }
    );
  }
}

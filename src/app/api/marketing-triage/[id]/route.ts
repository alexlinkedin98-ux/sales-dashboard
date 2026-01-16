import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logChange } from '@/lib/changeLog';

// GET single marketing triage entry
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await prisma.marketingTriageEntry.findUnique({
      where: { id },
      include: {
        channel: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Marketing triage entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching marketing triage entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing triage entry' },
      { status: 500 }
    );
  }
}

// PUT update marketing triage entry
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      leadsReceived,
      leadsContacted,
      leadsQualified,
    } = body;

    // Get the entry before updating for the change log
    const previousEntry = await prisma.marketingTriageEntry.findUnique({
      where: { id },
      include: { channel: true },
    });

    if (!previousEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entry = await prisma.marketingTriageEntry.update({
      where: { id },
      data: {
        leadsReceived: leadsReceived ?? undefined,
        leadsContacted: leadsContacted ?? undefined,
        leadsQualified: leadsQualified ?? undefined,
      },
      include: {
        channel: true,
      },
    });

    // Log the change
    await logChange({
      entityType: 'MarketingTriageEntry',
      entityId: id,
      action: 'update',
      previousData: previousEntry,
      newData: entry,
      description: `Updated marketing triage for ${entry.channel.name} - ${entry.weekLabel}`,
      relatedName: entry.channel.name,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating marketing triage entry:', error);
    return NextResponse.json(
      { error: 'Failed to update marketing triage entry' },
      { status: 500 }
    );
  }
}

// DELETE marketing triage entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the entry before deleting for the change log
    const entry = await prisma.marketingTriageEntry.findUnique({
      where: { id },
      include: { channel: true },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.marketingTriageEntry.delete({
      where: { id },
    });

    // Log the change
    await logChange({
      entityType: 'MarketingTriageEntry',
      entityId: id,
      action: 'delete',
      previousData: entry,
      description: `Deleted marketing triage for ${entry.channel.name} - ${entry.weekLabel}`,
      relatedName: entry.channel.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting marketing triage entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete marketing triage entry' },
      { status: 500 }
    );
  }
}

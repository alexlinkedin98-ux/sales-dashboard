import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logChange } from '@/lib/changeLog';

// GET single triage entry
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await prisma.triageEntry.findUnique({
      where: { id },
      include: {
        salesRep: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Triage entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching triage entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch triage entry' },
      { status: 500 }
    );
  }
}

// PUT update triage entry
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      triageBooked,
      triageTaken,
      qualifiedForIntro,
    } = body;

    // Get the entry before updating for the change log
    const previousEntry = await prisma.triageEntry.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!previousEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entry = await prisma.triageEntry.update({
      where: { id },
      data: {
        triageBooked: triageBooked ?? undefined,
        triageTaken: triageTaken ?? undefined,
        qualifiedForIntro: qualifiedForIntro ?? undefined,
      },
      include: {
        salesRep: true,
      },
    });

    // Log the change
    await logChange({
      entityType: 'TriageEntry',
      entityId: id,
      action: 'update',
      previousData: previousEntry,
      newData: entry,
      description: `Updated triage entry for ${entry.salesRep.name} - ${entry.weekLabel}`,
      relatedName: entry.salesRep.name,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating triage entry:', error);
    return NextResponse.json(
      { error: 'Failed to update triage entry' },
      { status: 500 }
    );
  }
}

// DELETE triage entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the entry before deleting for the change log
    const entry = await prisma.triageEntry.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.triageEntry.delete({
      where: { id },
    });

    // Log the change
    await logChange({
      entityType: 'TriageEntry',
      entityId: id,
      action: 'delete',
      previousData: entry,
      description: `Deleted triage entry for ${entry.salesRep.name} - ${entry.weekLabel}`,
      relatedName: entry.salesRep.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting triage entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete triage entry' },
      { status: 500 }
    );
  }
}

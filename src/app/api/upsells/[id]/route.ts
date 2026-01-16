import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logChange } from '@/lib/changeLog';

// GET single upsell entry
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await prisma.upsellEntry.findUnique({
      where: { id },
      include: {
        salesRep: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Upsell entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching upsell entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upsell entry' },
      { status: 500 }
    );
  }
}

// PUT update upsell entry
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      outreachCount,
      meetingsBooked,
      proposalsMade,
      dealsClosed,
      upsellRevenue,
    } = body;

    // Get the entry before updating for the change log
    const previousEntry = await prisma.upsellEntry.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!previousEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entry = await prisma.upsellEntry.update({
      where: { id },
      data: {
        outreachCount: outreachCount ?? undefined,
        meetingsBooked: meetingsBooked ?? undefined,
        proposalsMade: proposalsMade ?? undefined,
        dealsClosed: dealsClosed ?? undefined,
        upsellRevenue: upsellRevenue ?? undefined,
      },
      include: {
        salesRep: true,
      },
    });

    // Log the change
    await logChange({
      entityType: 'UpsellEntry',
      entityId: id,
      action: 'update',
      previousData: previousEntry,
      newData: entry,
      description: `Updated upsell entry for ${entry.salesRep.name} - ${entry.weekLabel}`,
      relatedName: entry.salesRep.name,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating upsell entry:', error);
    return NextResponse.json(
      { error: 'Failed to update upsell entry' },
      { status: 500 }
    );
  }
}

// DELETE upsell entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the entry before deleting for the change log
    const entry = await prisma.upsellEntry.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.upsellEntry.delete({
      where: { id },
    });

    // Log the change
    await logChange({
      entityType: 'UpsellEntry',
      entityId: id,
      action: 'delete',
      previousData: entry,
      description: `Deleted upsell entry for ${entry.salesRep.name} - ${entry.weekLabel}`,
      relatedName: entry.salesRep.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting upsell entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete upsell entry' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET single review entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await prisma.reviewEntry.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching review entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review entry' },
      { status: 500 }
    );
  }
}

// PUT update review entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reviewsRequested, googleReviews, clutchReviews } = body;

    // Get existing entry for change log
    const existing = await prisma.reviewEntry.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entry = await prisma.reviewEntry.update({
      where: { id },
      data: {
        reviewsRequested: reviewsRequested ?? existing.reviewsRequested,
        googleReviews: googleReviews ?? existing.googleReviews,
        clutchReviews: clutchReviews ?? existing.clutchReviews,
      },
      include: { salesRep: true },
    });

    // Log the change
    await prisma.changeLog.create({
      data: {
        entityType: 'ReviewEntry',
        entityId: entry.id,
        action: 'update',
        previousData: JSON.stringify(existing),
        newData: JSON.stringify(entry),
        description: `Updated review entry for ${entry.monthLabel} - ${entry.salesRep.name}`,
        relatedName: entry.salesRep.name,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating review entry:', error);
    return NextResponse.json(
      { error: 'Failed to update review entry' },
      { status: 500 }
    );
  }
}

// DELETE review entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get existing entry for change log
    const existing = await prisma.reviewEntry.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    await prisma.reviewEntry.delete({
      where: { id },
    });

    // Log the change
    await prisma.changeLog.create({
      data: {
        entityType: 'ReviewEntry',
        entityId: id,
        action: 'delete',
        previousData: JSON.stringify(existing),
        description: `Deleted review entry for ${existing.monthLabel} - ${existing.salesRep.name}`,
        relatedName: existing.salesRep.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete review entry' },
      { status: 500 }
    );
  }
}

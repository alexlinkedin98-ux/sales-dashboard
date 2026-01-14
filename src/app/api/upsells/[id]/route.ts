import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    await prisma.upsellEntry.delete({
      where: { id },
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

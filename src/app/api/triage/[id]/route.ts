import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    await prisma.triageEntry.delete({
      where: { id },
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

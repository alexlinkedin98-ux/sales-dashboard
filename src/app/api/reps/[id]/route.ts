import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// DELETE a sales rep
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.salesRep.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rep:', error);
    return NextResponse.json({ error: 'Failed to delete rep' }, { status: 500 });
  }
}

// PUT update a sales rep
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const rep = await prisma.salesRep.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(rep);
  } catch (error) {
    console.error('Error updating rep:', error);
    return NextResponse.json({ error: 'Failed to update rep' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch single client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.clientPortfolio.findUnique({
      where: { id },
      include: {
        feeHistory: {
          orderBy: { monthStartDate: 'desc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT - Update client
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      clientName,
      clientType,
      dateAcquired,
      churned,
      churnMonth,
      fupSequenceActive,
      notes,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientType !== undefined) updateData.clientType = clientType;
    if (fupSequenceActive !== undefined) updateData.fupSequenceActive = fupSequenceActive;
    if (notes !== undefined) updateData.notes = notes;

    // Handle date acquired update
    if (dateAcquired !== undefined) {
      const acquiredDate = new Date(dateAcquired);
      updateData.dateAcquired = acquiredDate;
      updateData.dateAcquiredLabel = acquiredDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    // Handle churn status
    if (churned !== undefined) {
      updateData.churned = churned;
      updateData.isActive = !churned;
      if (churned) {
        updateData.churnMonth = churnMonth || null;
        updateData.churnDate = new Date();
      } else {
        updateData.churnMonth = null;
        updateData.churnDate = null;
      }
    }

    const client = await prisma.clientPortfolio.update({
      where: { id },
      data: updateData,
      include: {
        feeHistory: {
          orderBy: { monthStartDate: 'desc' },
        },
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'A client with this name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE - Delete client
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if client exists
    const client = await prisma.clientPortfolio.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Delete (cascades to fee history)
    await prisma.clientPortfolio.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}

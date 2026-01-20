import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Fetch all clients with their fee history
export async function GET() {
  try {
    const clients = await prisma.clientPortfolio.findMany({
      include: {
        feeHistory: {
          orderBy: { monthStartDate: 'desc' },
        },
      },
      orderBy: { dateAcquired: 'desc' },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST - Create a new client
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientName,
      clientType,
      dateAcquired,
      initialFee,
      fupSequenceActive,
      notes,
    } = body;

    // Validate required fields
    if (!clientName || !clientType) {
      return NextResponse.json(
        { error: 'Client name and type are required' },
        { status: 400 }
      );
    }

    // Parse date
    const acquiredDate = dateAcquired ? new Date(dateAcquired) : new Date();
    const dateLabel = acquiredDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Create client
    const client = await prisma.clientPortfolio.create({
      data: {
        clientName,
        clientType,
        dateAcquired: acquiredDate,
        dateAcquiredLabel: dateLabel,
        fupSequenceActive: fupSequenceActive ?? true,
        notes: notes || null,
      },
    });

    // If initial fee is provided, create the first fee entry
    if (initialFee && initialFee > 0) {
      const monthStart = new Date(acquiredDate.getFullYear(), acquiredDate.getMonth(), 1);
      const monthLabel = monthStart.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      await prisma.clientFeeEntry.create({
        data: {
          clientId: client.id,
          monthStartDate: monthStart,
          monthLabel,
          monthlyFee: initialFee,
          commission: initialFee * 0.1, // 10% commission
        },
      });
    }

    // Fetch the client with fee history
    const clientWithHistory = await prisma.clientPortfolio.findUnique({
      where: { id: client.id },
      include: { feeHistory: true },
    });

    return NextResponse.json(clientWithHistory, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'A client with this name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}

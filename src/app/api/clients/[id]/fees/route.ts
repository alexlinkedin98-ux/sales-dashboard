import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST - Add a fee entry for a client
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();
    const { monthStartDate, monthlyFee } = body;

    // Validate required fields
    if (!monthStartDate || monthlyFee === undefined) {
      return NextResponse.json(
        { error: 'Month and fee are required' },
        { status: 400 }
      );
    }

    // Check if client exists
    const client = await prisma.clientPortfolio.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Parse month date
    const monthDate = new Date(monthStartDate);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthLabel = monthStart.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // Upsert fee entry (update if exists, create if not)
    const feeEntry = await prisma.clientFeeEntry.upsert({
      where: {
        clientId_monthStartDate: {
          clientId,
          monthStartDate: monthStart,
        },
      },
      update: {
        monthlyFee,
        commission: monthlyFee * 0.1,
      },
      create: {
        clientId,
        monthStartDate: monthStart,
        monthLabel,
        monthlyFee,
        commission: monthlyFee * 0.1,
      },
    });

    return NextResponse.json(feeEntry, { status: 201 });
  } catch (error) {
    console.error('Error adding fee entry:', error);
    return NextResponse.json(
      { error: 'Failed to add fee entry' },
      { status: 500 }
    );
  }
}

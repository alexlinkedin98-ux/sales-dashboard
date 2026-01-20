import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get total client commission for a specific month
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // Expected format: YYYY-MM-DD or ISO string

    if (!monthParam) {
      return NextResponse.json(
        { error: 'month parameter is required' },
        { status: 400 }
      );
    }

    // Parse the month and get the first day of that month
    const date = new Date(monthParam);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);

    // Get all fee entries for this month
    const feeEntries = await prisma.clientFeeEntry.findMany({
      where: {
        monthStartDate: monthStart,
      },
      include: {
        client: {
          select: {
            clientName: true,
            isActive: true,
            churned: true,
          },
        },
      },
    });

    // Calculate totals
    let totalFees = 0;
    let totalCommission = 0;
    const breakdown: {
      clientName: string;
      fee: number;
      commission: number;
      isActive: boolean;
    }[] = [];

    feeEntries.forEach((entry) => {
      totalFees += entry.monthlyFee;
      totalCommission += entry.commission;
      breakdown.push({
        clientName: entry.client.clientName,
        fee: entry.monthlyFee,
        commission: entry.commission,
        isActive: entry.client.isActive && !entry.client.churned,
      });
    });

    // Sort breakdown by commission descending
    breakdown.sort((a, b) => b.commission - a.commission);

    return NextResponse.json({
      month: monthStart.toISOString(),
      monthLabel: monthStart.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      totalFees,
      totalCommission,
      clientCount: feeEntries.length,
      breakdown,
    });
  } catch (error) {
    console.error('Error fetching client commission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client commission' },
      { status: 500 }
    );
  }
}

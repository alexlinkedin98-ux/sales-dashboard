import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfMonth, format, subMonths } from 'date-fns';

// GET /api/finance/entries - Get finance entries for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const months = parseInt(searchParams.get('months') || '12');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get entries for the last N months
    const cutoffDate = startOfMonth(subMonths(new Date(), months));

    const entries = await prisma.financeEntry.findMany({
      where: {
        userId,
        monthStartDate: {
          gte: cutoffDate,
        },
      },
      orderBy: { monthStartDate: 'desc' },
    });

    // Calculate stats
    const stats = {
      totalSales: 0,
      totalExpenses: 0,
      netTotal: 0,
      avgMonthlySales: 0,
      avgMonthlyExpenses: 0,
      monthCount: entries.length,
    };

    entries.forEach((entry) => {
      stats.totalSales += entry.salesTotal;
      stats.totalExpenses += entry.expensesTotal;
      stats.netTotal += entry.netTotal;
    });

    if (entries.length > 0) {
      stats.avgMonthlySales = stats.totalSales / entries.length;
      stats.avgMonthlyExpenses = stats.totalExpenses / entries.length;
    }

    return NextResponse.json({ entries, stats });
  } catch (error) {
    console.error('Error fetching finance entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finance entries' },
      { status: 500 }
    );
  }
}

// POST /api/finance/entries - Create or update a finance entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      monthStartDate,
      salesItems,
      reviewsExpense,
      paidAuditsExpense,
      lpExpense,
      bookingsExpense,
      tenPercentExpense,
      otherExpenses,
      notes,
    } = body;

    if (!userId || !monthStartDate) {
      return NextResponse.json(
        { error: 'userId and monthStartDate are required' },
        { status: 400 }
      );
    }

    // Parse the month start date
    const monthStart = new Date(monthStartDate);
    const monthLabel = format(monthStart, 'MMMM yyyy');

    // Calculate sales total from items
    let salesTotal = 0;
    if (salesItems && Array.isArray(salesItems)) {
      salesTotal = salesItems.reduce(
        (sum: number, item: { amount: number }) => sum + (item.amount || 0),
        0
      );
    }

    // Calculate expenses total
    const expensesTotal =
      (reviewsExpense || 0) +
      (paidAuditsExpense || 0) +
      (lpExpense || 0) +
      (bookingsExpense || 0) +
      (tenPercentExpense || 0);

    // Calculate net total
    const netTotal = salesTotal - expensesTotal;

    // Upsert the entry
    const entry = await prisma.financeEntry.upsert({
      where: {
        userId_monthStartDate: {
          userId,
          monthStartDate: monthStart,
        },
      },
      update: {
        salesItems: salesItems ? JSON.stringify(salesItems) : null,
        salesTotal,
        reviewsExpense: reviewsExpense || 0,
        paidAuditsExpense: paidAuditsExpense || 0,
        lpExpense: lpExpense || 0,
        bookingsExpense: bookingsExpense || 0,
        tenPercentExpense: tenPercentExpense || 0,
        otherExpenses: otherExpenses ? JSON.stringify(otherExpenses) : null,
        expensesTotal,
        netTotal,
        notes,
      },
      create: {
        userId,
        monthStartDate: monthStart,
        monthLabel,
        salesItems: salesItems ? JSON.stringify(salesItems) : null,
        salesTotal,
        reviewsExpense: reviewsExpense || 0,
        paidAuditsExpense: paidAuditsExpense || 0,
        lpExpense: lpExpense || 0,
        bookingsExpense: bookingsExpense || 0,
        tenPercentExpense: tenPercentExpense || 0,
        otherExpenses: otherExpenses ? JSON.stringify(otherExpenses) : null,
        expensesTotal,
        netTotal,
        notes,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error saving finance entry:', error);
    return NextResponse.json(
      { error: 'Failed to save finance entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/finance/entries - Delete a finance entry
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.financeEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting finance entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete finance entry' },
      { status: 500 }
    );
  }
}

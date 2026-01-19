import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfWeek, format } from 'date-fns';

// GET /api/checklist/completions - Get completions for a sales rep for current week
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const salesRepId = searchParams.get('salesRepId');
    const weekParam = searchParams.get('week'); // Optional: specific week date

    if (!salesRepId) {
      return NextResponse.json(
        { error: 'salesRepId is required' },
        { status: 400 }
      );
    }

    // Get the Monday of the specified week or current week
    const weekDate = weekParam ? new Date(weekParam) : new Date();
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 }); // Monday

    // Get all active items for this rep
    const items = await prisma.checklistItem.findMany({
      where: {
        salesRepId,
        isActive: true,
      },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
      ],
    });

    // Get completions for this week
    const completions = await prisma.checklistCompletion.findMany({
      where: {
        salesRepId,
        weekStartDate: weekStart,
      },
    });

    // Map completions to items
    const completionMap = new Map(completions.map(c => [c.itemId, c]));

    const itemsWithStatus = items.map(item => ({
      ...item,
      completed: completionMap.get(item.id)?.completed || false,
      completedAt: completionMap.get(item.id)?.completedAt || null,
    }));

    // Calculate stats
    const totalItems = items.length;
    const completedItems = itemsWithStatus.filter(i => i.completed).length;
    const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return NextResponse.json({
      weekStartDate: weekStart,
      weekLabel: format(weekStart, 'MMM d, yyyy'),
      items: itemsWithStatus,
      stats: {
        totalItems,
        completedItems,
        completionRate: Math.round(completionRate),
      },
    });
  } catch (error) {
    console.error('Error fetching completions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completions' },
      { status: 500 }
    );
  }
}

// POST /api/checklist/completions - Toggle completion status
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { salesRepId, itemId, completed } = body;

    if (!salesRepId || !itemId || completed === undefined) {
      return NextResponse.json(
        { error: 'salesRepId, itemId, and completed are required' },
        { status: 400 }
      );
    }

    // Get current week's Monday
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    // Upsert the completion record
    const completion = await prisma.checklistCompletion.upsert({
      where: {
        salesRepId_itemId_weekStartDate: {
          salesRepId,
          itemId,
          weekStartDate: weekStart,
        },
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        salesRepId,
        itemId,
        weekStartDate: weekStart,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    // Update weekly history
    await updateWeeklyHistory(salesRepId, weekStart);

    return NextResponse.json(completion);
  } catch (error) {
    console.error('Error updating completion:', error);
    return NextResponse.json(
      { error: 'Failed to update completion' },
      { status: 500 }
    );
  }
}

// Helper function to update weekly history
async function updateWeeklyHistory(salesRepId: string, weekStart: Date) {
  // Get all active items for this rep
  const items = await prisma.checklistItem.findMany({
    where: {
      salesRepId,
      isActive: true,
    },
  });

  // Get completions for this week
  const completions = await prisma.checklistCompletion.findMany({
    where: {
      salesRepId,
      weekStartDate: weekStart,
      completed: true,
    },
  });

  const totalItems = items.length;
  const completedItems = completions.length;
  const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Upsert history record
  await prisma.weeklyChecklistHistory.upsert({
    where: {
      salesRepId_weekStartDate: {
        salesRepId,
        weekStartDate: weekStart,
      },
    },
    update: {
      totalItems,
      completedItems,
      completionRate,
    },
    create: {
      salesRepId,
      weekStartDate: weekStart,
      weekLabel: format(weekStart, 'MMM d, yyyy'),
      totalItems,
      completedItems,
      completionRate,
    },
  });
}

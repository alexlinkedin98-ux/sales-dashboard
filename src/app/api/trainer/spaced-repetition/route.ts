import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/trainer/spaced-repetition - Get due items for a trainee
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const traineeId = searchParams.get('traineeId');
    const level = searchParams.get('level');

    if (!traineeId) {
      return NextResponse.json(
        { error: 'traineeId is required' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Build where clause
    const where: {
      traineeId: string;
      level?: number;
      nextReviewAt?: { lte: Date };
    } = { traineeId };

    if (level) {
      where.level = parseInt(level);
    }

    // Get items due for review
    where.nextReviewAt = { lte: now };

    const dueItems = await prisma.spacedRepetition.findMany({
      where,
      orderBy: [
        { nextReviewAt: 'asc' },  // Most overdue first
        { totalAttempts: 'asc' },  // Prefer items with fewer attempts
      ],
    });

    // Also get items not yet reviewed (no spaced repetition entry)
    // These are question types at this level that haven't been practiced
    const existingTypes = new Set(dueItems.map(d => `${d.questionType}-${d.level}`));
    const allTypes = ['S', 'P', 'I', 'N'];
    const targetLevel = level ? parseInt(level) : 1;

    const newItems = allTypes
      .filter(type => !existingTypes.has(`${type}-${targetLevel}`))
      .map(type => ({
        questionType: type,
        level: targetLevel,
        isNew: true,
        priority: 100,  // New items get high priority
      }));

    // Calculate priority for due items
    const dueItemsWithPriority = dueItems.map(item => {
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - item.nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        ...item,
        isNew: false,
        daysOverdue,
        priority: daysOverdue * 10 + (item.totalAttempts === 0 ? 50 : 0),
      };
    });

    // Combine and sort by priority
    const allItems = [...dueItemsWithPriority, ...newItems];
    allItems.sort((a, b) => b.priority - a.priority);

    return NextResponse.json({
      dueItems: allItems,
      totalDue: allItems.length,
      breakdown: {
        S: allItems.filter(i => i.questionType === 'S').length,
        P: allItems.filter(i => i.questionType === 'P').length,
        I: allItems.filter(i => i.questionType === 'I').length,
        N: allItems.filter(i => i.questionType === 'N').length,
      },
    });
  } catch (error) {
    console.error('Error fetching spaced repetition data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spaced repetition data' },
      { status: 500 }
    );
  }
}

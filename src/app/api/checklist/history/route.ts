import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/checklist/history - Get weekly completion history for a sales rep
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const salesRepId = searchParams.get('salesRepId');
    const limit = parseInt(searchParams.get('limit') || '12'); // Default: last 12 weeks

    if (!salesRepId) {
      return NextResponse.json(
        { error: 'salesRepId is required' },
        { status: 400 }
      );
    }

    const history = await prisma.weeklyChecklistHistory.findMany({
      where: { salesRepId },
      orderBy: { weekStartDate: 'desc' },
      take: limit,
    });

    // Calculate averages
    const avgCompletionRate = history.length > 0
      ? history.reduce((sum, h) => sum + h.completionRate, 0) / history.length
      : 0;

    // Count weeks meeting different thresholds
    const weeksAbove50 = history.filter(h => h.completionRate >= 50).length;
    const weeksAbove75 = history.filter(h => h.completionRate >= 75).length;
    const weeksAt100 = history.filter(h => h.completionRate === 100).length;

    // Get streak (consecutive weeks at 50%+)
    let currentStreak = 0;
    for (const week of history) {
      if (week.completionRate >= 50) {
        currentStreak++;
      } else {
        break;
      }
    }

    return NextResponse.json({
      history: history.reverse(), // Chronological order for charts
      stats: {
        avgCompletionRate: Math.round(avgCompletionRate),
        weeksAbove50,
        weeksAbove75,
        weeksAt100,
        currentStreak,
        totalWeeks: history.length,
      },
    });
  } catch (error) {
    console.error('Error fetching checklist history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist history' },
      { status: 500 }
    );
  }
}

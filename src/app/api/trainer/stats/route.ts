import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/trainer/stats - Get stats for all trainees
export async function GET() {
  try {
    const stats = await prisma.trainerStats.findMany({
      include: {
        trainee: {
          select: { id: true, name: true },
        },
      },
      orderBy: { totalXp: 'desc' },
    });

    // Also get trainees without stats (new trainees)
    const traineesWithStats = new Set(stats.map(s => s.traineeId));
    const allTrainees = await prisma.salesRep.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const traineesWithoutStats = allTrainees.filter(t => !traineesWithStats.has(t.id));

    return NextResponse.json({
      stats,
      traineesWithoutStats,
    });
  } catch (error) {
    console.error('Error fetching trainer stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainer stats' },
      { status: 500 }
    );
  }
}

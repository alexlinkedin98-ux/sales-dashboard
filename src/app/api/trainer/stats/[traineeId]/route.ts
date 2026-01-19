import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/trainer/stats/[traineeId] - Get stats for a specific trainee
export async function GET(
  request: Request,
  { params }: { params: Promise<{ traineeId: string }> }
) {
  try {
    const { traineeId } = await params;

    // Get or create stats
    let stats = await prisma.trainerStats.findUnique({
      where: { traineeId },
      include: {
        trainee: {
          select: { id: true, name: true },
        },
      },
    });

    if (!stats) {
      // Create default stats for this trainee
      stats = await prisma.trainerStats.create({
        data: { traineeId },
        include: {
          trainee: {
            select: { id: true, name: true },
          },
        },
      });
    }

    // Get recent sessions
    const recentSessions = await prisma.trainingSession.findMany({
      where: { traineeId },
      orderBy: { startedAt: 'desc' },
      take: 10,
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });

    // Get spaced repetition data
    const spacedRepData = await prisma.spacedRepetition.findMany({
      where: { traineeId },
      orderBy: [{ questionType: 'asc' }, { level: 'asc' }],
    });

    // Calculate accuracy by question type from recent responses
    const recentResponses = await prisma.trainingResponse.findMany({
      where: {
        session: { traineeId },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const typeAccuracy: Record<string, { correct: number; total: number }> = {
      S: { correct: 0, total: 0 },
      P: { correct: 0, total: 0 },
      I: { correct: 0, total: 0 },
      N: { correct: 0, total: 0 },
    };

    recentResponses.forEach(r => {
      if (r.expectedType && typeAccuracy[r.expectedType]) {
        typeAccuracy[r.expectedType].total++;
        if (r.typeCorrect) {
          typeAccuracy[r.expectedType].correct++;
        }
      }
    });

    const accuracyByType = {
      situation: typeAccuracy.S.total > 0 ? (typeAccuracy.S.correct / typeAccuracy.S.total) * 100 : null,
      problem: typeAccuracy.P.total > 0 ? (typeAccuracy.P.correct / typeAccuracy.P.total) * 100 : null,
      implication: typeAccuracy.I.total > 0 ? (typeAccuracy.I.correct / typeAccuracy.I.total) * 100 : null,
      needPayoff: typeAccuracy.N.total > 0 ? (typeAccuracy.N.correct / typeAccuracy.N.total) * 100 : null,
    };

    return NextResponse.json({
      stats,
      recentSessions,
      spacedRepData,
      accuracyByType,
    });
  } catch (error) {
    console.error('Error fetching trainee stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainee stats' },
      { status: 500 }
    );
  }
}

// PATCH /api/trainer/stats/[traineeId] - Update trainee settings
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ traineeId: string }> }
) {
  try {
    const { traineeId } = await params;
    const body = await request.json();
    const { pomodoroMinutes } = body;

    // Validate pomodoro duration
    if (pomodoroMinutes !== undefined && (pomodoroMinutes < 5 || pomodoroMinutes > 60)) {
      return NextResponse.json(
        { error: 'Pomodoro duration must be between 5 and 60 minutes' },
        { status: 400 }
      );
    }

    const stats = await prisma.trainerStats.upsert({
      where: { traineeId },
      update: { pomodoroMinutes },
      create: { traineeId, pomodoroMinutes: pomodoroMinutes || 15 },
      include: {
        trainee: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error updating trainee settings:', error);
    return NextResponse.json(
      { error: 'Failed to update trainee settings' },
      { status: 500 }
    );
  }
}

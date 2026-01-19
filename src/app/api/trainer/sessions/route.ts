import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/trainer/sessions - List sessions for a trainee
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const traineeId = searchParams.get('traineeId');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where = traineeId ? { traineeId } : {};

    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        trainee: {
          select: { id: true, name: true },
        },
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching training sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training sessions' },
      { status: 500 }
    );
  }
}

// POST /api/trainer/sessions - Start a new training session
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { traineeId, mode, level, timerDuration, vertical } = body;

    // Validate required fields
    if (!traineeId || !mode || !level || !vertical) {
      return NextResponse.json(
        { error: 'Missing required fields: traineeId, mode, level, vertical' },
        { status: 400 }
      );
    }

    // Validate mode
    if (!['learn', 'practice', 'live_sim'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be: learn, practice, or live_sim' },
        { status: 400 }
      );
    }

    // Validate level
    if (level < 1 || level > 5) {
      return NextResponse.json(
        { error: 'Invalid level. Must be 1-5' },
        { status: 400 }
      );
    }

    // Validate vertical
    if (!['ecommerce', 'leadgen', 'local_services'].includes(vertical)) {
      return NextResponse.json(
        { error: 'Invalid vertical. Must be: ecommerce, leadgen, or local_services' },
        { status: 400 }
      );
    }

    // Verify trainee exists
    const trainee = await prisma.salesRep.findUnique({
      where: { id: traineeId },
    });

    if (!trainee) {
      return NextResponse.json(
        { error: 'Trainee not found' },
        { status: 404 }
      );
    }

    // Get or create trainer stats for this trainee
    let stats = await prisma.trainerStats.findUnique({
      where: { traineeId },
    });

    if (!stats) {
      stats = await prisma.trainerStats.create({
        data: { traineeId },
      });
    }

    // Use timer duration from request or trainee's saved preference
    const duration = timerDuration ?? (stats.pomodoroMinutes * 60);

    // Create the session
    const session = await prisma.trainingSession.create({
      data: {
        traineeId,
        mode,
        level,
        timerDuration: duration,
        vertical,
      },
      include: {
        trainee: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error creating training session:', error);
    return NextResponse.json(
      { error: 'Failed to create training session' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateXP } from '@/lib/trainer/xpCalculator';
import { calculateSM2, gradeToQuality } from '@/lib/trainer/spacedRepetition';
import { Grade } from '@/lib/trainer/gradeCalculator';

// POST /api/trainer/responses - Submit a training response
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      questionNumber,
      promptType,
      promptContext,
      expectedType,
      traineeResponse,
      responseTimeMs,
      // AI grading results (passed from client after calling /api/trainer/ai/grade)
      identifiedType,
      typeCorrect,
      qualityScore,
      naturalnessScore,
      aiFeedback,
      grade,
      // Prospect response (for interactive modes)
      prospectResponse,
      informationRevealed,
    } = body;

    // Validate required fields
    if (!sessionId || questionNumber === undefined || !promptType || !promptContext || !traineeResponse) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get session to calculate XP
    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        trainee: {
          include: {
            trainerStats: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Calculate XP for this response
    const currentStreak = session.trainee.trainerStats?.currentStreak || 0;
    const xpAwarded = grade ? calculateXP({
      level: session.level,
      mode: session.mode as 'learn' | 'practice' | 'live_sim',
      grade: grade as Grade,
      currentStreak,
      responseTimeMs,
      timerDurationMs: session.mode === 'learn' ? 0 : (session.mode === 'practice' ? 30000 : 15000),
    }) : 0;

    // Create the response
    const response = await prisma.trainingResponse.create({
      data: {
        sessionId,
        questionNumber,
        promptType,
        promptContext,
        expectedType,
        traineeResponse,
        responseTimeMs,
        identifiedType,
        typeCorrect,
        qualityScore,
        naturalnessScore,
        aiFeedback,
        grade,
        xpAwarded,
        prospectResponse,
        informationRevealed,
      },
    });

    // Update session question count
    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        questionsAnswered: { increment: 1 },
        correctAnswers: typeCorrect ? { increment: 1 } : undefined,
      },
    });

    // Update spaced repetition if we have a grade and expected type
    if (grade && expectedType) {
      const quality = gradeToQuality(grade as Grade);

      // Find or create spaced repetition entry
      const existingSR = await prisma.spacedRepetition.findUnique({
        where: {
          traineeId_questionType_level: {
            traineeId: session.traineeId,
            questionType: expectedType,
            level: session.level,
          },
        },
      });

      if (existingSR) {
        const sm2Result = calculateSM2({
          quality,
          currentEF: existingSR.easeFactor,
          currentInterval: existingSR.intervalDays,
          currentReps: existingSR.repetitions,
        });

        await prisma.spacedRepetition.update({
          where: { id: existingSR.id },
          data: {
            easeFactor: sm2Result.easeFactor,
            intervalDays: sm2Result.intervalDays,
            repetitions: sm2Result.repetitions,
            lastReviewedAt: new Date(),
            nextReviewAt: sm2Result.nextReviewAt,
            totalAttempts: { increment: 1 },
            correctAttempts: typeCorrect ? { increment: 1 } : undefined,
          },
        });
      } else {
        // Create new spaced repetition entry
        const sm2Result = calculateSM2({
          quality,
          currentEF: 2.5,
          currentInterval: 1,
          currentReps: 0,
        });

        await prisma.spacedRepetition.create({
          data: {
            traineeId: session.traineeId,
            questionType: expectedType,
            level: session.level,
            easeFactor: sm2Result.easeFactor,
            intervalDays: sm2Result.intervalDays,
            repetitions: sm2Result.repetitions,
            lastReviewedAt: new Date(),
            nextReviewAt: sm2Result.nextReviewAt,
            totalAttempts: 1,
            correctAttempts: typeCorrect ? 1 : 0,
          },
        });
      }
    }

    return NextResponse.json({
      ...response,
      xpAwarded,
    });
  } catch (error) {
    console.error('Error creating training response:', error);
    return NextResponse.json(
      { error: 'Failed to create training response' },
      { status: 500 }
    );
  }
}

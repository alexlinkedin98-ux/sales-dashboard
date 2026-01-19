import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateGrade } from '@/lib/trainer/gradeCalculator';
import { levelFromXP, checkLevelUp } from '@/lib/trainer/xpCalculator';

// GET /api/trainer/sessions/[id] - Get session details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: {
        trainee: {
          select: { id: true, name: true },
        },
        responses: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// PATCH /api/trainer/sessions/[id] - Update session (complete, add response, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: {
        responses: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === 'complete') {
      // Calculate final session stats
      const responses = session.responses;
      const totalQuestions = responses.length;
      const correctAnswers = responses.filter(r => r.typeCorrect).length;

      // Calculate averages
      const avgTypeAccuracy = totalQuestions > 0
        ? responses.reduce((sum, r) => sum + (r.typeCorrect ? 100 : 0), 0) / totalQuestions
        : 0;
      const avgQualityScore = totalQuestions > 0
        ? responses.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / totalQuestions
        : 0;
      const avgNaturalness = totalQuestions > 0
        ? responses.reduce((sum, r) => sum + (r.naturalnessScore || 0), 0) / totalQuestions
        : 0;

      // Calculate overall grade
      const { grade } = calculateGrade({
        typeAccuracy: avgTypeAccuracy,
        qualityScore: avgQualityScore,
        naturalnessScore: avgNaturalness,
      });

      // Calculate total XP earned
      const xpEarned = responses.reduce((sum, r) => sum + r.xpAwarded, 0);

      // Update session
      const updatedSession = await prisma.trainingSession.update({
        where: { id },
        data: {
          completedAt: new Date(),
          questionsAnswered: totalQuestions,
          correctAnswers,
          avgTypeAccuracy,
          avgQualityScore,
          avgNaturalness,
          overallGrade: grade,
          xpEarned,
        },
      });

      // Update trainee stats
      const stats = await prisma.trainerStats.findUnique({
        where: { traineeId: session.traineeId },
      });

      if (stats) {
        const previousXP = stats.totalXp;
        const newXP = previousXP + xpEarned;
        const { leveledUp, newLevel } = checkLevelUp(previousXP, newXP);

        // Calculate time spent (in seconds)
        const timeSpent = session.completedAt
          ? Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000)
          : Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000);

        // Update streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastTraining = stats.lastTrainingDate ? new Date(stats.lastTrainingDate) : null;
        lastTraining?.setHours(0, 0, 0, 0);

        let newStreak = stats.currentStreak;
        if (!lastTraining) {
          newStreak = 1;
        } else {
          const daysDiff = Math.floor((today.getTime() - lastTraining.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            newStreak = stats.currentStreak + 1;
          } else if (daysDiff > 1) {
            newStreak = 1;  // Streak broken
          }
          // daysDiff === 0 means same day, keep streak
        }

        // Update grade distribution
        let gradeDistribution: Record<string, number> = {};
        try {
          gradeDistribution = stats.gradeDistribution ? JSON.parse(stats.gradeDistribution) : {};
        } catch {
          gradeDistribution = {};
        }
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;

        await prisma.trainerStats.update({
          where: { traineeId: session.traineeId },
          data: {
            totalXp: newXP,
            currentLevel: newLevel,
            currentStreak: newStreak,
            longestStreak: Math.max(stats.longestStreak, newStreak),
            lastTrainingDate: new Date(),
            totalSessions: stats.totalSessions + 1,
            totalQuestionsAnswered: stats.totalQuestionsAnswered + totalQuestions,
            totalTimeSpentSeconds: stats.totalTimeSpentSeconds + timeSpent,
            gradeDistribution: JSON.stringify(gradeDistribution),
          },
        });

        return NextResponse.json({
          ...updatedSession,
          leveledUp,
          newLevel,
          xpEarned,
          newTotalXP: newXP,
          streak: newStreak,
        });
      }

      return NextResponse.json(updatedSession);
    }

    // Default: update session fields
    const updatedSession = await prisma.trainingSession.update({
      where: { id },
      data,
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

// DELETE /api/trainer/sessions/[id] - Delete a session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.trainingSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

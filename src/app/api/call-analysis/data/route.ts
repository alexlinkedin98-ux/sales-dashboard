import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfWeek, format, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

interface WeeklyAggregation {
  weekStart: Date;
  weekLabel: string;
  totalCalls: number;
  avgSituationQuestions: number;
  avgProblemQuestions: number;
  avgImplicationQuestions: number;
  avgNeedPayoffQuestions: number;
  avgChallenges: number;
  avgDataPoints: number;
  avgInsights: number;
  avgAiScoreOverall: number | null;
  avgRepScoreOverall: number | null;
}

interface CallAnalysisData {
  id: string;
  callDate: Date;
  callLabel: string;
  transcript: string | null;
  situationQuestions: number;
  problemQuestions: number;
  implicationQuestions: number;
  needPayoffQuestions: number;
  challengesPresented: number;
  dataPointsShared: number;
  insightsShared: number;
  aiScoreSpin: number | null;
  aiScoreChallenger: number | null;
  aiScoreInsight: number | null;
  aiScoreOverall: number | null;
  aiFeedback: string | null;
  repScoreSpin: number | null;
  repScoreChallenger: number | null;
  repScoreInsight: number | null;
  repScoreOverall: number | null;
  repNotes: string | null;
  callDuration: number | null;
  outcome: string | null;
  createdAt: Date;
}

interface RepCallData {
  repId: string;
  repName: string;
  calls: CallAnalysisData[];
  weeklyTrends: WeeklyAggregation[];
  totals: {
    totalCalls: number;
    avgSituationQuestions: number;
    avgProblemQuestions: number;
    avgImplicationQuestions: number;
    avgNeedPayoffQuestions: number;
    avgChallenges: number;
    avgDataPoints: number;
    avgInsights: number;
    avgAiScoreOverall: number | null;
    avgRepScoreOverall: number | null;
  };
}

function groupByWeek(calls: CallAnalysisData[]): WeeklyAggregation[] {
  const weekMap = new Map<string, CallAnalysisData[]>();

  for (const call of calls) {
    const weekStart = startOfWeek(call.callDate, { weekStartsOn: 1 }); // Monday start
    const weekKey = weekStart.toISOString();

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(call);
  }

  const weeks: WeeklyAggregation[] = [];

  for (const [weekKey, weekCalls] of weekMap) {
    const weekStart = parseISO(weekKey);
    const count = weekCalls.length;

    const aiScores = weekCalls
      .map((c) => c.aiScoreOverall)
      .filter((s): s is number => s !== null);
    const repScores = weekCalls
      .map((c) => c.repScoreOverall)
      .filter((s): s is number => s !== null);

    weeks.push({
      weekStart,
      weekLabel: format(weekStart, 'MMM d, yyyy'),
      totalCalls: count,
      avgSituationQuestions:
        weekCalls.reduce((s, c) => s + c.situationQuestions, 0) / count,
      avgProblemQuestions:
        weekCalls.reduce((s, c) => s + c.problemQuestions, 0) / count,
      avgImplicationQuestions:
        weekCalls.reduce((s, c) => s + c.implicationQuestions, 0) / count,
      avgNeedPayoffQuestions:
        weekCalls.reduce((s, c) => s + c.needPayoffQuestions, 0) / count,
      avgChallenges:
        weekCalls.reduce((s, c) => s + c.challengesPresented, 0) / count,
      avgDataPoints:
        weekCalls.reduce((s, c) => s + c.dataPointsShared, 0) / count,
      avgInsights: weekCalls.reduce((s, c) => s + c.insightsShared, 0) / count,
      avgAiScoreOverall:
        aiScores.length > 0
          ? aiScores.reduce((s, v) => s + v, 0) / aiScores.length
          : null,
      avgRepScoreOverall:
        repScores.length > 0
          ? repScores.reduce((s, v) => s + v, 0) / repScores.length
          : null,
    });
  }

  return weeks.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

function calculateTotals(calls: CallAnalysisData[]) {
  const count = calls.length;
  if (count === 0) {
    return {
      totalCalls: 0,
      avgSituationQuestions: 0,
      avgProblemQuestions: 0,
      avgImplicationQuestions: 0,
      avgNeedPayoffQuestions: 0,
      avgChallenges: 0,
      avgDataPoints: 0,
      avgInsights: 0,
      avgAiScoreOverall: null,
      avgRepScoreOverall: null,
    };
  }

  const aiScores = calls
    .map((c) => c.aiScoreOverall)
    .filter((s): s is number => s !== null);
  const repScores = calls
    .map((c) => c.repScoreOverall)
    .filter((s): s is number => s !== null);

  return {
    totalCalls: count,
    avgSituationQuestions:
      calls.reduce((s, c) => s + c.situationQuestions, 0) / count,
    avgProblemQuestions:
      calls.reduce((s, c) => s + c.problemQuestions, 0) / count,
    avgImplicationQuestions:
      calls.reduce((s, c) => s + c.implicationQuestions, 0) / count,
    avgNeedPayoffQuestions:
      calls.reduce((s, c) => s + c.needPayoffQuestions, 0) / count,
    avgChallenges:
      calls.reduce((s, c) => s + c.challengesPresented, 0) / count,
    avgDataPoints: calls.reduce((s, c) => s + c.dataPointsShared, 0) / count,
    avgInsights: calls.reduce((s, c) => s + c.insightsShared, 0) / count,
    avgAiScoreOverall:
      aiScores.length > 0
        ? aiScores.reduce((s, v) => s + v, 0) / aiScores.length
        : null,
    avgRepScoreOverall:
      repScores.length > 0
        ? repScores.reduce((s, v) => s + v, 0) / repScores.length
        : null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get('repId');

    // Fetch all reps with their call analyses
    const reps = await prisma.salesRep.findMany({
      where: repId ? { id: repId } : undefined,
      include: {
        callAnalyses: {
          orderBy: { callDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform to dashboard format
    const repData: RepCallData[] = reps.map((rep) => {
      const calls: CallAnalysisData[] = rep.callAnalyses.map((call) => ({
        id: call.id,
        callDate: call.callDate,
        callLabel: call.callLabel,
        transcript: call.transcript,
        situationQuestions: call.situationQuestions,
        problemQuestions: call.problemQuestions,
        implicationQuestions: call.implicationQuestions,
        needPayoffQuestions: call.needPayoffQuestions,
        challengesPresented: call.challengesPresented,
        dataPointsShared: call.dataPointsShared,
        insightsShared: call.insightsShared,
        aiScoreSpin: call.aiScoreSpin,
        aiScoreChallenger: call.aiScoreChallenger,
        aiScoreInsight: call.aiScoreInsight,
        aiScoreOverall: call.aiScoreOverall,
        aiFeedback: call.aiFeedback,
        repScoreSpin: call.repScoreSpin,
        repScoreChallenger: call.repScoreChallenger,
        repScoreInsight: call.repScoreInsight,
        repScoreOverall: call.repScoreOverall,
        repNotes: call.repNotes,
        callDuration: call.callDuration,
        outcome: call.outcome,
        createdAt: call.createdAt,
      }));

      return {
        repId: rep.id,
        repName: rep.name,
        calls,
        weeklyTrends: groupByWeek(calls),
        totals: calculateTotals(calls),
      };
    });

    // Calculate overall stats across all reps
    const allCalls = repData.flatMap((r) => r.calls);
    const overallTotals = calculateTotals(allCalls);

    return NextResponse.json({
      reps: repData,
      overall: overallTotals,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching call analysis data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call analysis data' },
      { status: 500 }
    );
  }
}

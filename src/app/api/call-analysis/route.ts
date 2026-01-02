import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET all call analyses (with optional filtering)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get('repId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: {
      salesRepId?: string;
      callDate?: { gte?: Date; lte?: Date };
    } = {};

    if (repId) {
      where.salesRepId = repId;
    }

    if (startDate || endDate) {
      where.callDate = {};
      if (startDate) where.callDate.gte = new Date(startDate);
      if (endDate) where.callDate.lte = new Date(endDate);
    }

    const analyses = await prisma.callAnalysis.findMany({
      where,
      include: { salesRep: true },
      orderBy: { callDate: 'desc' },
    });

    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Error fetching call analyses:', error);
    return NextResponse.json({ error: 'Failed to fetch call analyses' }, { status: 500 });
  }
}

// POST create a new call analysis (single or bulk)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if bulk import (array) or single entry
    if (Array.isArray(body)) {
      // Bulk import
      const analyses = await Promise.all(
        body.map(async (entry) => {
          return prisma.callAnalysis.create({
            data: {
              salesRepId: entry.salesRepId,
              callDate: new Date(entry.callDate),
              callLabel: entry.callLabel,
              crmLink: entry.crmLink || null,
              transcript: entry.transcript || null,
              situationQuestions: entry.situationQuestions || 0,
              problemQuestions: entry.problemQuestions || 0,
              implicationQuestions: entry.implicationQuestions || 0,
              needPayoffQuestions: entry.needPayoffQuestions || 0,
              challengesPresented: entry.challengesPresented || 0,
              dataPointsShared: entry.dataPointsShared || 0,
              insightsShared: entry.insightsShared || 0,
              aiScoreSpin: entry.aiScoreSpin || null,
              aiScoreChallenger: entry.aiScoreChallenger || null,
              aiScoreInsight: entry.aiScoreInsight || null,
              aiScoreOverall: entry.aiScoreOverall || null,
              aiFeedback: entry.aiFeedback || null,
              repScoreSpin: entry.repScoreSpin || null,
              repScoreChallenger: entry.repScoreChallenger || null,
              repScoreInsight: entry.repScoreInsight || null,
              repScoreOverall: entry.repScoreOverall || null,
              repNotes: entry.repNotes || null,
              callDuration: entry.callDuration || null,
              outcome: entry.outcome || null,
            },
            include: { salesRep: true },
          });
        })
      );

      return NextResponse.json(analyses, { status: 201 });
    }

    // Single entry
    const {
      salesRepId,
      callDate,
      callLabel,
      crmLink,
      transcript,
      situationQuestions,
      problemQuestions,
      implicationQuestions,
      needPayoffQuestions,
      challengesPresented,
      dataPointsShared,
      insightsShared,
      aiScoreSpin,
      aiScoreChallenger,
      aiScoreInsight,
      aiScoreOverall,
      aiFeedback,
      repScoreSpin,
      repScoreChallenger,
      repScoreInsight,
      repScoreOverall,
      repNotes,
      callDuration,
      outcome,
    } = body;

    if (!salesRepId || !callDate || !callLabel) {
      return NextResponse.json(
        { error: 'Sales rep, call date, and call label are required' },
        { status: 400 }
      );
    }

    const analysis = await prisma.callAnalysis.create({
      data: {
        salesRepId,
        callDate: new Date(callDate),
        callLabel,
        crmLink: crmLink || null,
        transcript: transcript || null,
        situationQuestions: situationQuestions || 0,
        problemQuestions: problemQuestions || 0,
        implicationQuestions: implicationQuestions || 0,
        needPayoffQuestions: needPayoffQuestions || 0,
        challengesPresented: challengesPresented || 0,
        dataPointsShared: dataPointsShared || 0,
        insightsShared: insightsShared || 0,
        aiScoreSpin: aiScoreSpin || null,
        aiScoreChallenger: aiScoreChallenger || null,
        aiScoreInsight: aiScoreInsight || null,
        aiScoreOverall: aiScoreOverall || null,
        aiFeedback: aiFeedback || null,
        repScoreSpin: repScoreSpin || null,
        repScoreChallenger: repScoreChallenger || null,
        repScoreInsight: repScoreInsight || null,
        repScoreOverall: repScoreOverall || null,
        repNotes: repNotes || null,
        callDuration: callDuration || null,
        outcome: outcome || null,
      },
      include: { salesRep: true },
    });

    return NextResponse.json(analysis, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating call analysis:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A call analysis for this rep, date, and label already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create call analysis' }, { status: 500 });
  }
}

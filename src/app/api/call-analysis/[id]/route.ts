import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET single call analysis
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysis = await prisma.callAnalysis.findUnique({
      where: { id },
      include: { salesRep: true },
    });

    if (!analysis) {
      return NextResponse.json({ error: 'Call analysis not found' }, { status: 404 });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error fetching call analysis:', error);
    return NextResponse.json({ error: 'Failed to fetch call analysis' }, { status: 500 });
  }
}

// PUT update call analysis (including AI scores after rep assessment)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if analysis exists
    const existing = await prisma.callAnalysis.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Call analysis not found' }, { status: 404 });
    }

    const analysis = await prisma.callAnalysis.update({
      where: { id },
      data: {
        callDate: body.callDate ? new Date(body.callDate) : undefined,
        callLabel: body.callLabel,
        crmLink: body.crmLink,
        transcript: body.transcript,
        situationQuestions: body.situationQuestions,
        problemQuestions: body.problemQuestions,
        implicationQuestions: body.implicationQuestions,
        needPayoffQuestions: body.needPayoffQuestions,
        challengesPresented: body.challengesPresented,
        dataPointsShared: body.dataPointsShared,
        insightsShared: body.insightsShared,
        aiScoreSpin: body.aiScoreSpin,
        aiScoreChallenger: body.aiScoreChallenger,
        aiScoreInsight: body.aiScoreInsight,
        aiScoreOverall: body.aiScoreOverall,
        aiFeedback: body.aiFeedback,
        repScoreSpin: body.repScoreSpin,
        repScoreChallenger: body.repScoreChallenger,
        repScoreInsight: body.repScoreInsight,
        repScoreOverall: body.repScoreOverall,
        repNotes: body.repNotes,
        callDuration: body.callDuration,
        outcome: body.outcome,
      },
      include: { salesRep: true },
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error updating call analysis:', error);
    return NextResponse.json({ error: 'Failed to update call analysis' }, { status: 500 });
  }
}

// DELETE call analysis
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if analysis exists
    const existing = await prisma.callAnalysis.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Call analysis not found' }, { status: 404 });
    }

    await prisma.callAnalysis.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Call analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting call analysis:', error);
    return NextResponse.json({ error: 'Failed to delete call analysis' }, { status: 500 });
  }
}

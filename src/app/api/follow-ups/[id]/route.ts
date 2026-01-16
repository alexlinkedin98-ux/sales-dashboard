import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET single follow-up sequence
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sequence = await prisma.followUpSequence.findUnique({
      where: { id },
      include: {
        callAnalysis: {
          include: {
            salesRep: true,
          },
        },
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Follow-up sequence not found' }, { status: 404 });
    }

    return NextResponse.json(sequence);
  } catch (error) {
    console.error('Error fetching follow-up sequence:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-up sequence' }, { status: 500 });
  }
}

// PATCH update follow-up sequence (mark emails as sent, update notes, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.followUpSequence.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Follow-up sequence not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Handle marking emails as sent
    if (body.markEmail1Sent && !existing.email1Sent) {
      updateData.email1Sent = true;
      // Set email2 due date (2 days from now)
      const email2Due = new Date();
      email2Due.setDate(email2Due.getDate() + 2);
      updateData.email2Due = email2Due;
    }

    if (body.markEmail2Sent && !existing.email2Sent) {
      updateData.email2Sent = true;
      // Set email3 due date (2 days from now)
      const email3Due = new Date();
      email3Due.setDate(email3Due.getDate() + 2);
      updateData.email3Due = email3Due;
    }

    if (body.markEmail3Sent && !existing.email3Sent) {
      updateData.email3Sent = true;
      // Set up next cooldown cycle
      const nextCooldownEnd = new Date();
      nextCooldownEnd.setMonth(nextCooldownEnd.getMonth() + 3);
      updateData.nextCooldownEnd = nextCooldownEnd;
      updateData.status = 'cooling';
      updateData.cooldownEndDate = nextCooldownEnd;
      updateData.currentCycle = existing.currentCycle + 1;
      // Reset email tracking for next cycle
      updateData.email1Sent = false;
      updateData.email2Sent = false;
      updateData.email3Sent = false;
      updateData.email1Content = null;
      updateData.email1Due = nextCooldownEnd;
      updateData.email2Due = null;
      updateData.email3Due = null;
    }

    // Handle other updates
    if (body.email1Content !== undefined) {
      updateData.email1Content = body.email1Content;
    }
    if (body.contactEmail !== undefined) {
      updateData.contactEmail = body.contactEmail;
    }
    if (body.contactName !== undefined) {
      updateData.contactName = body.contactName;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
      // If marking as won, also update the call analysis outcome
      if (body.status === 'won') {
        await prisma.callAnalysis.update({
          where: { id: existing.callAnalysisId },
          data: { outcome: 'won' },
        });
      }
    }

    const sequence = await prisma.followUpSequence.update({
      where: { id },
      data: updateData,
      include: {
        callAnalysis: {
          include: {
            salesRep: true,
          },
        },
      },
    });

    return NextResponse.json(sequence);
  } catch (error) {
    console.error('Error updating follow-up sequence:', error);
    return NextResponse.json({ error: 'Failed to update follow-up sequence' }, { status: 500 });
  }
}

// DELETE follow-up sequence
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.followUpSequence.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Follow-up sequence not found' }, { status: 404 });
    }

    // Also reset the call analysis outcome
    await prisma.callAnalysis.update({
      where: { id: existing.callAnalysisId },
      data: { outcome: null },
    });

    await prisma.followUpSequence.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Follow-up sequence deleted successfully' });
  } catch (error) {
    console.error('Error deleting follow-up sequence:', error);
    return NextResponse.json({ error: 'Failed to delete follow-up sequence' }, { status: 500 });
  }
}

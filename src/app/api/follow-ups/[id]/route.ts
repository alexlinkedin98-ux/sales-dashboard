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

// PATCH update follow-up sequence (mark steps as done, update notes, etc.)
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

    // Handle marking steps as done (6-step sequence)
    // Step 1: Email 1 (AI-generated)
    if (body.markStep1Done && !existing.step1Done) {
      updateData.step1Done = true;
      const step2Due = new Date();
      step2Due.setDate(step2Due.getDate() + 1);
      updateData.step2Due = step2Due;
    }

    // Step 2: WhatsApp
    if (body.markStep2Done && !existing.step2Done) {
      updateData.step2Done = true;
      const step3Due = new Date();
      step3Due.setDate(step3Due.getDate() + 2);
      updateData.step3Due = step3Due;
    }

    // Step 3: Email 2
    if (body.markStep3Done && !existing.step3Done) {
      updateData.step3Done = true;
      const step4Due = new Date();
      step4Due.setDate(step4Due.getDate() + 2);
      updateData.step4Due = step4Due;
    }

    // Step 4: Text
    if (body.markStep4Done && !existing.step4Done) {
      updateData.step4Done = true;
      const step5Due = new Date();
      step5Due.setDate(step5Due.getDate() + 2);
      updateData.step5Due = step5Due;
    }

    // Step 5: Phone call (manual or Vapi)
    if (body.markStep5Done && !existing.step5Done) {
      updateData.step5Done = true;
      if (body.step5Notes) {
        updateData.step5Notes = body.step5Notes;
      }
      const step6Due = new Date();
      step6Due.setDate(step6Due.getDate() + 2);
      updateData.step6Due = step6Due;
      // Clear Vapi state if manually marking done
      updateData.vapiCallStatus = 'completed';
    }

    // Step 6: Email 3 - completes the cycle
    if (body.markStep6Done && !existing.step6Done) {
      updateData.step6Done = true;
      const nextCooldownEnd = new Date();
      nextCooldownEnd.setMonth(nextCooldownEnd.getMonth() + 3);
      updateData.nextCooldownEnd = nextCooldownEnd;
      updateData.status = 'cooling';
      updateData.cooldownEndDate = nextCooldownEnd;
      updateData.currentCycle = existing.currentCycle + 1;
      // Reset step tracking for next cycle
      updateData.step1Done = false;
      updateData.step2Done = false;
      updateData.step3Done = false;
      updateData.step4Done = false;
      updateData.step5Done = false;
      updateData.step6Done = false;
      updateData.step1Content = null;
      updateData.step5Notes = null;
      updateData.vapiCallId = null;
      updateData.vapiCallStatus = null;
      updateData.step1Due = nextCooldownEnd;
      updateData.step2Due = null;
      updateData.step3Due = null;
      updateData.step4Due = null;
      updateData.step5Due = null;
      updateData.step6Due = null;
    }

    // Handle UNDO
    if (body.undoStep1) { updateData.step1Done = false; updateData.step2Due = null; }
    if (body.undoStep2) { updateData.step2Done = false; updateData.step3Due = null; }
    if (body.undoStep3) { updateData.step3Done = false; updateData.step4Due = null; }
    if (body.undoStep4) { updateData.step4Done = false; updateData.step5Due = null; }
    if (body.undoStep5) { updateData.step5Done = false; updateData.step6Due = null; updateData.vapiCallId = null; updateData.vapiCallStatus = null; updateData.step5Notes = null; }
    if (body.undoStep6) { updateData.step6Done = false; }

    // Handle RESET
    if (body.resetSequence) {
      const now = new Date();
      updateData.status = 'active';
      updateData.step1Done = false;
      updateData.step2Done = false;
      updateData.step3Done = false;
      updateData.step4Done = false;
      updateData.step5Done = false;
      updateData.step6Done = false;
      updateData.step1Due = now;
      updateData.step2Due = null;
      updateData.step3Due = null;
      updateData.step4Due = null;
      updateData.step5Due = null;
      updateData.step6Due = null;
      updateData.vapiCallId = null;
      updateData.vapiCallStatus = null;
      updateData.email1Sent = false;
      updateData.email2Sent = false;
      updateData.email3Sent = false;
      updateData.email1Due = now;
      updateData.email2Due = null;
      updateData.email3Due = null;
      updateData.cooldownEndDate = now;
    }

    // Legacy support: Handle old email markers (map to new steps)
    if (body.markEmail1Sent && !existing.email1Sent) {
      updateData.email1Sent = true;
      updateData.step1Done = true;
      const step2Due = new Date();
      step2Due.setDate(step2Due.getDate() + 1);
      updateData.step2Due = step2Due;
    }

    // Handle direct field updates
    if (body.step1Content !== undefined) {
      updateData.step1Content = body.step1Content;
    }
    if (body.step4Notes !== undefined) {
      updateData.step4Notes = body.step4Notes;
    }
    if (body.step5Notes !== undefined) {
      updateData.step5Notes = body.step5Notes;
    }
    if (body.contactEmail !== undefined) {
      updateData.contactEmail = body.contactEmail;
    }
    if (body.contactPhone !== undefined) {
      updateData.contactPhone = body.contactPhone;
    }
    if (body.contactName !== undefined) {
      updateData.contactName = body.contactName;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.automationEnabled !== undefined) {
      updateData.automationEnabled = body.automationEnabled;
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

    // Legacy field support
    if (body.email1Content !== undefined) {
      updateData.email1Content = body.email1Content;
      updateData.step1Content = body.email1Content;
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

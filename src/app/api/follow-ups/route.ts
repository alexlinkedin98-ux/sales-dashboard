import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Create a manual follow-up (not from call analysis)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salesRepId, contactName, contactEmail, contactPhone, notes, crmLink, transcript } = body;

    if (!salesRepId || !contactName) {
      return NextResponse.json({ error: 'Sales rep and contact name are required' }, { status: 400 });
    }

    const now = new Date();

    // Create a lightweight CallAnalysis record to link the follow-up
    const callAnalysis = await prisma.callAnalysis.create({
      data: {
        salesRepId,
        callDate: now,
        callLabel: `Manual follow-up - ${contactName}`,
        outcome: 'warm_follow_up',
        crmLink: crmLink || null,
        transcript: transcript || null,
      },
    });

    // Create the follow-up sequence starting as active immediately
    const sequence = await prisma.followUpSequence.create({
      data: {
        callAnalysisId: callAnalysis.id,
        contactName,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        sequenceStartDate: now,
        cooldownEndDate: now, // No cooldown - start immediately
        status: 'active',
        currentCycle: 1,
        step1Due: now,
        notes: notes || null,
      },
      include: {
        callAnalysis: {
          include: {
            salesRep: true,
          },
        },
      },
    });

    return NextResponse.json(sequence, { status: 201 });
  } catch (error) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 });
  }
}

// GET all follow-up sequences with related data
export async function GET() {
  try {
    const sequences = await prisma.followUpSequence.findMany({
      include: {
        callAnalysis: {
          include: {
            salesRep: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // active first, then cooling, then completed/won
        { step1Due: 'asc' },
      ],
    });

    // Update statuses based on current date
    const now = new Date();
    const updatedSequences = [];

    for (const seq of sequences) {
      let needsUpdate = false;
      const updateData: Record<string, unknown> = {};

      // Check if cooldown has ended and sequence should become active
      if (seq.status === 'cooling' && seq.cooldownEndDate <= now) {
        updateData.status = 'active';
        // Set step1Due to now if not already set
        if (!seq.step1Due) {
          updateData.step1Due = now;
        }
        needsUpdate = true;
      }

      // Check if sequence is active and all 6 steps are done - start next cycle
      if (seq.status === 'active' && seq.step1Done && seq.step2Done && seq.step3Done && seq.step4Done && seq.step5Done && seq.step6Done) {
        const nextCooldownEnd = new Date(now);
        nextCooldownEnd.setMonth(nextCooldownEnd.getMonth() + 3);

        updateData.status = 'cooling';
        updateData.currentCycle = seq.currentCycle + 1;
        // Reset all steps
        updateData.step1Done = false;
        updateData.step2Done = false;
        updateData.step3Done = false;
        updateData.step4Done = false;
        updateData.step5Done = false;
        updateData.step6Done = false;
        updateData.step1Content = null;
        updateData.step5Notes = null;
        updateData.step1Due = nextCooldownEnd;
        updateData.step2Due = null;
        updateData.step3Due = null;
        updateData.step4Due = null;
        updateData.step5Due = null;
        updateData.step6Due = null;
        updateData.cooldownEndDate = nextCooldownEnd;
        // Also reset legacy fields
        updateData.email1Sent = false;
        updateData.email2Sent = false;
        updateData.email3Sent = false;
        updateData.email1Content = null;
        updateData.email1Due = nextCooldownEnd;
        updateData.email2Due = null;
        updateData.email3Due = null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const updated = await prisma.followUpSequence.update({
          where: { id: seq.id },
          data: updateData,
          include: {
            callAnalysis: {
              include: {
                salesRep: true,
              },
            },
          },
        });
        updatedSequences.push(updated);
      } else {
        updatedSequences.push(seq);
      }
    }

    // Sort by priority: active with overdue first, then active, then cooling
    updatedSequences.sort((a, b) => {
      // Won sequences last
      if (a.status === 'won' && b.status !== 'won') return 1;
      if (b.status === 'won' && a.status !== 'won') return -1;

      // Active sequences first
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;

      // Within same status, sort by due date
      const aDue = a.step1Due || a.cooldownEndDate;
      const bDue = b.step1Due || b.cooldownEndDate;
      return new Date(aDue).getTime() - new Date(bDue).getTime();
    });

    return NextResponse.json(updatedSequences);
  } catch (error) {
    console.error('Error fetching follow-up sequences:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-up sequences' }, { status: 500 });
  }
}

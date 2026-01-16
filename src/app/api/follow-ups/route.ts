import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
        { email1Due: 'asc' },
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
        needsUpdate = true;
      }

      // Check if sequence is active and all emails are sent - start next cycle
      if (seq.status === 'active' && seq.email1Sent && seq.email2Sent && seq.email3Sent) {
        const nextCooldownEnd = new Date(now);
        nextCooldownEnd.setMonth(nextCooldownEnd.getMonth() + 3);

        updateData.status = 'cooling';
        updateData.currentCycle = seq.currentCycle + 1;
        updateData.email1Sent = false;
        updateData.email2Sent = false;
        updateData.email3Sent = false;
        updateData.email1Content = null;
        updateData.email1Due = nextCooldownEnd;
        updateData.email2Due = null;
        updateData.email3Due = null;
        updateData.cooldownEndDate = nextCooldownEnd;
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
      const aDue = a.email1Due || a.cooldownEndDate;
      const bDue = b.email1Due || b.cooldownEndDate;
      return new Date(aDue).getTime() - new Date(bDue).getTime();
    });

    return NextResponse.json(updatedSequences);
  } catch (error) {
    console.error('Error fetching follow-up sequences:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-up sequences' }, { status: 500 });
  }
}

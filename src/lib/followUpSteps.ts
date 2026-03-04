/**
 * Shared step completion logic for follow-up sequences.
 * Used by both the manual PATCH handler and the automated email sender.
 *
 * 6-step sequence:
 *   1: Email 1 (AI)  →  2: WhatsApp  →  3: Email 2  →  4: Text  →  5: Call  →  6: Email 3
 */

interface SequenceState {
  currentCycle: number;
  step1Done: boolean;
  step2Done: boolean;
  step3Done: boolean;
  step4Done: boolean;
  step5Done: boolean;
  step6Done: boolean;
}

/**
 * Returns the Prisma update data for marking an email step as done
 * and calculating the next step's due date.
 * Email steps are 1, 3, 6. These are the ones automated by Gmail.
 */
export function markStepDone(
  stepNumber: 1 | 3 | 5 | 6,
  existing: SequenceState
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  const now = new Date();

  if (stepNumber === 1 && !existing.step1Done) {
    updateData.step1Done = true;
    const step2Due = new Date(now);
    step2Due.setDate(step2Due.getDate() + 1);
    updateData.step2Due = step2Due;
  }

  if (stepNumber === 3 && !existing.step3Done) {
    updateData.step3Done = true;
    const step4Due = new Date(now);
    step4Due.setDate(step4Due.getDate() + 2);
    updateData.step4Due = step4Due;
  }

  if (stepNumber === 5 && !existing.step5Done) {
    updateData.step5Done = true;
    const step6Due = new Date(now);
    step6Due.setDate(step6Due.getDate() + 2);
    updateData.step6Due = step6Due;
  }

  if (stepNumber === 6 && !existing.step6Done) {
    updateData.step6Done = true;
    // Complete the cycle → enter 3-month cooldown
    const nextCooldownEnd = new Date(now);
    nextCooldownEnd.setMonth(nextCooldownEnd.getMonth() + 3);
    updateData.nextCooldownEnd = nextCooldownEnd;
    updateData.status = 'cooling';
    updateData.cooldownEndDate = nextCooldownEnd;
    updateData.currentCycle = existing.currentCycle + 1;
    // Reset all steps for next cycle
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
    // Reset Vapi fields for fresh start next cycle
    updateData.vapiCallId = null;
    updateData.vapiCallStatus = null;
    // Reset gmail thread for fresh start next cycle
    updateData.gmailThreadId = null;
    updateData.gmailMessageId = null;
    updateData.lastGmailMsgId = null;
    updateData.emailSubject = null;
    updateData.replyDetected = false;
    updateData.replyDetectedAt = null;
    updateData.replySnippet = null;
  }

  return updateData;
}

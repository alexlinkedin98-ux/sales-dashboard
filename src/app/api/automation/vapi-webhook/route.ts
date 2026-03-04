import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity
    const webhookSecret = request.headers.get('x-vapi-secret');
    if (webhookSecret !== process.env.VAPI_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message?.type) {
      return NextResponse.json({ ok: true });
    }

    // Handle end-of-call-report (primary event for step completion)
    if (message.type === 'end-of-call-report') {
      const callId = message.call?.id;
      if (!callId) {
        return NextResponse.json({ ok: true });
      }

      const sequence = await prisma.followUpSequence.findFirst({
        where: { vapiCallId: callId },
      });

      if (!sequence) {
        console.warn(`Vapi webhook: no sequence found for callId ${callId}`);
        return NextResponse.json({ ok: true });
      }

      // Extract call data
      const transcript = message.transcript || '';
      const summary = message.summary || '';
      const endedReason = message.endedReason || 'unknown';
      const duration = message.call?.duration;
      const recordingUrl = message.recordingUrl || null;

      const wasAnswered = endedReason !== 'no-answer'
        && endedReason !== 'busy'
        && endedReason !== 'machine-detected'
        && endedReason !== 'failed';

      // Build notes for step5Notes
      const notes = buildCallNotes({ summary, transcript, endedReason, duration, recordingUrl, wasAnswered });

      // Determine vapiCallStatus
      let vapiCallStatus: string;
      if (endedReason === 'no-answer' || endedReason === 'busy') {
        vapiCallStatus = 'no_answer';
      } else if (endedReason === 'machine-detected') {
        vapiCallStatus = 'voicemail';
      } else if (endedReason === 'failed' || endedReason === 'error') {
        vapiCallStatus = 'failed';
      } else {
        vapiCallStatus = 'completed';
      }

      // Retry logic: if not answered and this was the first attempt, schedule a retry
      const isFirstAttempt = !sequence.step5Notes;
      const shouldRetry = !wasAnswered && isFirstAttempt;

      if (shouldRetry) {
        // First attempt failed — schedule retry in 3 hours (or next business morning)
        const retryTime = new Date();
        const etHour = getETHour(retryTime);
        if (etHour >= 16) {
          // After 4 PM ET — retry tomorrow at 10 AM ET
          retryTime.setDate(retryTime.getDate() + 1);
          setETHour(retryTime, 10);
        } else {
          retryTime.setHours(retryTime.getHours() + 3);
        }

        await prisma.followUpSequence.update({
          where: { id: sequence.id },
          data: {
            step5Notes: notes + '\n[Retry scheduled]',
            vapiCallStatus: null,  // Clear so cron picks it up again
            vapiCallId: null,
            step5Due: retryTime,
          },
        });
      } else {
        // Either answered, or this was the retry — mark step 5 done
        const step6Due = new Date();
        step6Due.setDate(step6Due.getDate() + 2);

        const finalNotes = isFirstAttempt ? notes : (sequence.step5Notes || '').replace('\n[Retry scheduled]', '') + '\n---\nRetry attempt:\n' + notes;

        await prisma.followUpSequence.update({
          where: { id: sequence.id },
          data: {
            step5Done: true,
            step5Notes: finalNotes,
            vapiCallStatus,
            step6Due,
          },
        });
      }

      await prisma.automationLog.create({
        data: {
          sequenceId: sequence.id,
          actionType: wasAnswered ? 'vapi_call_completed' : `vapi_call_${vapiCallStatus}`,
          stepNumber: 5,
          success: wasAnswered,
          details: JSON.stringify({
            callId,
            endedReason,
            duration,
            vapiCallStatus,
            summaryPreview: summary.substring(0, 200),
            recordingUrl,
          }),
        },
      });

      return NextResponse.json({ ok: true, status: vapiCallStatus });
    }

    // Handle status-update events (real-time tracking)
    if (message.type === 'status-update') {
      const callId = message.call?.id;
      const status = message.status;

      if (callId && status === 'in-progress') {
        const sequence = await prisma.followUpSequence.findFirst({
          where: { vapiCallId: callId },
        });

        if (sequence) {
          await prisma.followUpSequence.update({
            where: { id: sequence.id },
            data: { vapiCallStatus: 'in_progress' },
          });
        }
      }

      return NextResponse.json({ ok: true });
    }

    // Acknowledge all other event types
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Vapi webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/** Get current hour in US Eastern Time */
function getETHour(date: Date): number {
  const et = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return et.getHours();
}

/** Set a Date to a specific hour in ET (approximate — shifts UTC) */
function setETHour(date: Date, hour: number): void {
  const et = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const currentETHour = et.getHours();
  const diff = hour - currentETHour;
  date.setHours(date.getHours() + diff);
  date.setMinutes(0, 0, 0);
}

function buildCallNotes(params: {
  summary: string;
  transcript: string;
  endedReason: string;
  duration?: number;
  recordingUrl?: string | null;
  wasAnswered: boolean;
}): string {
  const parts: string[] = [];

  if (!params.wasAnswered) {
    parts.push(`[Call not answered - ${params.endedReason}]`);
  }

  if (params.duration) {
    const mins = Math.floor(params.duration / 60);
    const secs = params.duration % 60;
    parts.push(`Duration: ${mins}m ${secs}s`);
  }

  if (params.summary) {
    parts.push(`Summary: ${params.summary}`);
  }

  if (params.transcript) {
    const truncated = params.transcript.length > 3000
      ? params.transcript.substring(0, 3000) + '... [truncated]'
      : params.transcript;
    parts.push(`\nTranscript:\n${truncated}`);
  }

  if (params.recordingUrl) {
    parts.push(`\nRecording: ${params.recordingUrl}`);
  }

  return parts.join('\n');
}

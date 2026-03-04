import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail, findLatestThread } from '@/lib/gmail';
import { sendSms, sendWhatsApp } from '@/lib/twilio';
import { markStepDone } from '@/lib/followUpSteps';
import { createOutboundCall } from '@/lib/vapi';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const anthropic = new Anthropic();

async function generateEmailContent(sequenceId: string): Promise<string | null> {
  const sequence = await prisma.followUpSequence.findUnique({
    where: { id: sequenceId },
    include: { callAnalysis: { include: { salesRep: true } } },
  });

  if (!sequence) return null;

  const callAnalysis = sequence.callAnalysis;
  const transcript = callAnalysis.transcript;

  const firstName = sequence.contactName.split(' ')[0];
  const prompt = `Write a very short, casual follow-up email to someone you had a call with about 3 months ago.

Contact: ${firstName}
What you discussed: ${callAnalysis.callLabel}
Call date: ${new Date(callAnalysis.callDate).toLocaleDateString()}

${transcript ? `Context from the call:\n${transcript}` : ''}

The email should be:
- 3-4 lines MAX. Super short.
- Casual and human, like texting a friend
- No formal language, no "I hope this email finds you well"
- Reference what you talked about briefly (e.g. "google ads", "your campaigns", etc.)
- End with a simple check-in question
- No signature, no sign-off like "Best regards"
- Lowercase is fine, keep it natural

Example tone:
"hi ${firstName}

hope you're doing well

we chatted about your google ads a few months back — how are things going on that front?"

Write ONLY the email body. Start with "hi ${firstName}" (lowercase).`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const emailContent = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    await prisma.followUpSequence.update({
      where: { id: sequenceId },
      data: { step1Content: emailContent, email1Content: emailContent },
    });

    await prisma.automationLog.create({
      data: {
        sequenceId,
        actionType: 'ai_email_generated',
        stepNumber: 1,
        success: true,
      },
    });

    return emailContent;
  } catch (error) {
    await prisma.automationLog.create({
      data: {
        sequenceId,
        actionType: 'ai_email_generated',
        stepNumber: 1,
        success: false,
        details: JSON.stringify({ error: String(error) }),
      },
    });
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Gmail is connected
    const gmailConfig = await prisma.gmailConfig.findUnique({ where: { id: 'singleton' } });
    if (!gmailConfig) {
      return NextResponse.json({ error: 'Gmail not connected', sent: 0, failed: 0 });
    }

    const now = new Date();

    // Stale Vapi call cleanup: if a call has been "calling" for >1 hour, mark as failed and advance
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const staleStep6Due = new Date();
    staleStep6Due.setDate(staleStep6Due.getDate() + 2);
    await prisma.followUpSequence.updateMany({
      where: {
        vapiCallStatus: 'calling',
        step5Due: { lte: oneHourAgo },
        step5Done: false,
      },
      data: {
        vapiCallStatus: 'failed',
        step5Notes: '[Call initiated but no callback received - marked as failed]',
        step5Done: true,
        step6Due: staleStep6Due,
      },
    });

    // Find sequences with due steps
    const sequences = await prisma.followUpSequence.findMany({
      where: {
        status: 'active',
        automationEnabled: true,
        replyDetected: false,
        OR: [
          { step1Due: { lte: now }, step1Done: false, contactEmail: { not: null } },
          { step2Due: { lte: now }, step2Done: false, contactPhone: { not: null } },
          { step3Due: { lte: now }, step3Done: false, contactEmail: { not: null } },
          { step4Due: { lte: now }, step4Done: false, contactPhone: { not: null } },
          { step5Due: { lte: now }, step5Done: false, contactPhone: { not: null }, OR: [{ vapiCallStatus: null }, { vapiCallStatus: { notIn: ['calling', 'in_progress'] } }] },
          { step6Due: { lte: now }, step6Done: false, contactEmail: { not: null } },
        ],
      },
      include: {
        callAnalysis: { include: { salesRep: true } },
      },
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const seq of sequences) {
      const firstName = seq.contactName.split(' ')[0];

      // Determine which step to send (email: 1, 3, 6 | whatsapp: 2 | text: 4 | vapi call: 5)
      let stepToSend: 1 | 2 | 3 | 4 | 5 | 6 | null = null;
      if (seq.step1Due && seq.step1Due <= now && !seq.step1Done && seq.contactEmail) {
        stepToSend = 1;
      } else if (seq.step2Due && seq.step2Due <= now && !seq.step2Done && seq.contactPhone) {
        stepToSend = 2;
      } else if (seq.step3Due && seq.step3Due <= now && !seq.step3Done && seq.contactEmail) {
        stepToSend = 3;
      } else if (seq.step4Due && seq.step4Due <= now && !seq.step4Done && seq.contactPhone) {
        stepToSend = 4;
      } else if (seq.step5Due && seq.step5Due <= now && !seq.step5Done && seq.contactPhone && seq.vapiCallStatus !== 'calling' && seq.vapiCallStatus !== 'in_progress') {
        stepToSend = 5;
      } else if (seq.step6Due && seq.step6Due <= now && !seq.step6Done && seq.contactEmail) {
        stepToSend = 6;
      }

      if (!stepToSend) continue;

      try {
        if (stepToSend === 1) {
          // Step 1: AI-generated email
          // Try to find an existing thread with this contact first
          let content = seq.step1Content;
          if (!content) {
            content = await generateEmailContent(seq.id);
            if (!content) {
              errors.push(`${seq.contactName}: Failed to generate AI email`);
              failed++;
              continue;
            }
          }

          // Look for existing email thread with this contact
          const existingThread = await findLatestThread(seq.contactEmail!);

          let subject: string;
          let sendParams: { to: string; subject: string; body: string; inReplyTo?: string; references?: string; threadId?: string };

          if (existingThread) {
            // Reply in the existing thread
            subject = existingThread.subject.startsWith('Re:')
              ? existingThread.subject
              : `Re: ${existingThread.subject}`;
            sendParams = {
              to: seq.contactEmail!,
              subject,
              body: content,
              inReplyTo: existingThread.messageId,
              references: existingThread.messageId,
              threadId: existingThread.threadId,
            };
          } else {
            // No existing thread — create a new one
            subject = `Following up - ${firstName}`;
            sendParams = {
              to: seq.contactEmail!,
              subject,
              body: content,
            };
          }

          const result = await sendEmail(sendParams);

          if (!result.success) {
            await prisma.automationLog.create({
              data: {
                sequenceId: seq.id,
                actionType: 'email_send_failed',
                stepNumber: 1,
                success: false,
                details: JSON.stringify({ error: result.error }),
              },
            });
            errors.push(`${seq.contactName} Step 1: ${result.error}`);
            failed++;
            continue;
          }

          // Store thread info and mark step done
          const stepUpdate = markStepDone(1, seq);
          await prisma.followUpSequence.update({
            where: { id: seq.id },
            data: {
              ...stepUpdate,
              gmailThreadId: result.threadId,
              gmailMessageId: result.messageId,
              lastGmailMsgId: result.messageId,
              emailSubject: existingThread?.subject || subject,
            },
          });

          await prisma.automationLog.create({
            data: {
              sequenceId: seq.id,
              actionType: 'email_sent',
              stepNumber: 1,
              success: true,
              details: JSON.stringify({ threadId: result.threadId, to: seq.contactEmail }),
            },
          });
          sent++;

        } else if (stepToSend === 2) {
          // Step 2: WhatsApp message via Twilio (using approved template)
          const callLabel = seq.callAnalysis?.callLabel || 'your Google Ads';

          const waResult = await sendWhatsApp(seq.contactPhone!, {
            firstName,
            topic: callLabel.toLowerCase(),
          });

          if (!waResult.success) {
            await prisma.automationLog.create({
              data: {
                sequenceId: seq.id,
                actionType: 'whatsapp_send_failed',
                stepNumber: 2,
                success: false,
                details: JSON.stringify({ error: waResult.error }),
              },
            });
            errors.push(`${seq.contactName} Step 2 (WhatsApp): ${waResult.error}`);
            failed++;
            continue;
          }

          const step3Due = new Date();
          step3Due.setDate(step3Due.getDate() + 3);
          await prisma.followUpSequence.update({
            where: { id: seq.id },
            data: {
              step2Done: true,
              step3Due,
            },
          });

          await prisma.automationLog.create({
            data: {
              sequenceId: seq.id,
              actionType: 'whatsapp_sent',
              stepNumber: 2,
              success: true,
              details: JSON.stringify({ messageSid: waResult.messageSid, to: seq.contactPhone }),
            },
          });
          sent++;

        } else if (stepToSend === 4) {
          // Step 4: Text message via Twilio
          const callLabel = seq.callAnalysis?.callLabel || 'your Google Ads';
          const textBody = `Hey ${firstName}, sent you an email about ${callLabel.toLowerCase()} — did you get a chance to see it?`;

          const smsResult = await sendSms(seq.contactPhone!, textBody);

          if (!smsResult.success) {
            await prisma.automationLog.create({
              data: {
                sequenceId: seq.id,
                actionType: 'text_send_failed',
                stepNumber: 4,
                success: false,
                details: JSON.stringify({ error: smsResult.error }),
              },
            });
            errors.push(`${seq.contactName} Step 4 (Text): ${smsResult.error}`);
            failed++;
            continue;
          }

          // Mark step 4 done and set step 5 due
          const now4 = new Date();
          const step5Due = new Date(now4);
          step5Due.setDate(step5Due.getDate() + 2);
          await prisma.followUpSequence.update({
            where: { id: seq.id },
            data: {
              step4Done: true,
              step5Due,
            },
          });

          await prisma.automationLog.create({
            data: {
              sequenceId: seq.id,
              actionType: 'text_sent',
              stepNumber: 4,
              success: true,
              details: JSON.stringify({ messageSid: smsResult.messageSid, to: seq.contactPhone }),
            },
          });
          sent++;

        } else if (stepToSend === 5) {
          // Step 5: Automated phone call via Vapi
          const callLabel = seq.callAnalysis?.callLabel || 'your Google Ads';

          const vapiResult = await createOutboundCall({
            phoneNumber: seq.contactPhone!,
            contactName: seq.contactName,
            callContext: callLabel.toLowerCase(),
          });

          if (!vapiResult.success) {
            await prisma.automationLog.create({
              data: {
                sequenceId: seq.id,
                actionType: 'vapi_call_failed',
                stepNumber: 5,
                success: false,
                details: JSON.stringify({ error: vapiResult.error }),
              },
            });
            errors.push(`${seq.contactName} Step 5 (Vapi Call): ${vapiResult.error}`);
            failed++;
            continue;
          }

          // Mark as calling (NOT done yet — webhook will finalize)
          await prisma.followUpSequence.update({
            where: { id: seq.id },
            data: {
              vapiCallId: vapiResult.callId,
              vapiCallStatus: 'calling',
            },
          });

          await prisma.automationLog.create({
            data: {
              sequenceId: seq.id,
              actionType: 'vapi_call_initiated',
              stepNumber: 5,
              success: true,
              details: JSON.stringify({ callId: vapiResult.callId, to: seq.contactPhone }),
            },
          });
          sent++;

        } else {
          // Step 3: "{FirstName}?" nudge | Step 6: "bump^" final nudge
          const body = stepToSend === 6 ? 'bump^' : `${firstName}?`;
          const subject = seq.emailSubject ? `Re: ${seq.emailSubject}` : `Following up - ${firstName}`;

          const result = await sendEmail({
            to: seq.contactEmail!,
            subject,
            body,
            inReplyTo: seq.gmailMessageId || undefined,
            references: seq.gmailMessageId || undefined,
            threadId: seq.gmailThreadId || undefined,
          });

          if (!result.success) {
            await prisma.automationLog.create({
              data: {
                sequenceId: seq.id,
                actionType: 'email_send_failed',
                stepNumber: stepToSend,
                success: false,
                details: JSON.stringify({ error: result.error }),
              },
            });
            errors.push(`${seq.contactName} Step ${stepToSend}: ${result.error}`);
            failed++;
            continue;
          }

          const stepUpdate = markStepDone(stepToSend as 1 | 3 | 6, seq);
          await prisma.followUpSequence.update({
            where: { id: seq.id },
            data: {
              ...stepUpdate,
              lastGmailMsgId: result.messageId,
            },
          });

          await prisma.automationLog.create({
            data: {
              sequenceId: seq.id,
              actionType: 'email_sent',
              stepNumber: stepToSend,
              success: true,
              details: JSON.stringify({ threadId: result.threadId, to: seq.contactEmail }),
            },
          });
          sent++;
        }
      } catch (error) {
        errors.push(`${seq.contactName}: ${String(error)}`);
        failed++;
      }
    }

    return NextResponse.json({
      processed: sequences.length,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in send-emails automation:', error);
    return NextResponse.json({ error: 'Automation failed', details: String(error) }, { status: 500 });
  }
}

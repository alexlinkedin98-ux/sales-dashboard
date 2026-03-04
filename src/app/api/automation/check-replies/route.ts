import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getGmailClient } from '@/lib/gmail';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gmail = await getGmailClient();
    if (!gmail) {
      return NextResponse.json({ error: 'Gmail not connected', checked: 0, repliesFound: 0 });
    }

    const gmailConfig = await prisma.gmailConfig.findUnique({ where: { id: 'singleton' } });
    if (!gmailConfig) {
      return NextResponse.json({ error: 'Gmail config not found', checked: 0, repliesFound: 0 });
    }

    const ourEmail = gmailConfig.emailAddress.toLowerCase();

    // Find active sequences with Gmail threads that haven't had replies detected yet
    const sequences = await prisma.followUpSequence.findMany({
      where: {
        status: 'active',
        gmailThreadId: { not: null },
        replyDetected: false,
      },
    });

    let checked = 0;
    let repliesFound = 0;

    for (const seq of sequences) {
      if (!seq.gmailThreadId) continue;

      try {
        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: seq.gmailThreadId,
          format: 'metadata',
          metadataHeaders: ['From'],
        });

        checked++;

        if (!thread.data.messages) continue;

        // Check if any message in the thread is from someone other than us
        for (const message of thread.data.messages) {
          const fromHeader = message.payload?.headers?.find(
            (h) => h.name?.toLowerCase() === 'from'
          );

          if (!fromHeader?.value) continue;

          // Extract email from "Name <email@example.com>" or "email@example.com"
          const fromEmail = fromHeader.value.match(/<(.+?)>/)?.[1] || fromHeader.value;

          if (fromEmail.toLowerCase() !== ourEmail) {
            // Reply detected!
            await prisma.followUpSequence.update({
              where: { id: seq.id },
              data: {
                status: 'replied',
                replyDetected: true,
                replyDetectedAt: new Date(),
                replySnippet: message.snippet || 'Reply received',
              },
            });

            await prisma.automationLog.create({
              data: {
                sequenceId: seq.id,
                actionType: 'reply_detected',
                success: true,
                details: JSON.stringify({
                  from: fromEmail,
                  snippet: message.snippet?.substring(0, 200),
                }),
              },
            });

            repliesFound++;
            break; // One reply is enough to pause the sequence
          }
        }
      } catch (error) {
        console.error(`Error checking thread for ${seq.contactName}:`, error);
      }
    }

    return NextResponse.json({ checked, repliesFound });
  } catch (error) {
    console.error('Error in check-replies automation:', error);
    return NextResponse.json({ error: 'Reply check failed', details: String(error) }, { status: 500 });
  }
}

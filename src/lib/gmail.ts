import { google, gmail_v1 } from 'googleapis';
import { prisma } from './db';

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function getGmailClient(): Promise<gmail_v1.Gmail | null> {
  const config = await prisma.gmailConfig.findUnique({
    where: { id: 'singleton' },
  });

  if (!config) return null;

  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: config.accessToken,
    refresh_token: config.refreshToken,
    expiry_date: config.tokenExpiresAt.getTime(),
  });

  // Auto-persist refreshed tokens
  oauth2Client.on('tokens', async (tokens) => {
    const updateData: Record<string, unknown> = {};
    if (tokens.access_token) updateData.accessToken = tokens.access_token;
    if (tokens.expiry_date) updateData.tokenExpiresAt = new Date(tokens.expiry_date);
    if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;

    await prisma.gmailConfig.update({
      where: { id: 'singleton' },
      data: updateData,
    });

    await prisma.automationLog.create({
      data: { actionType: 'token_refreshed', success: true },
    });
  });

  // Proactively refresh if expiring within 5 minutes
  if (config.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      await oauth2Client.getAccessToken();
    } catch (error) {
      await prisma.automationLog.create({
        data: {
          actionType: 'token_refresh_failed',
          success: false,
          details: JSON.stringify({ error: String(error) }),
        },
      });
      return null;
    }
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Find the most recent email thread with a contact.
 * Returns threadId, last messageId, and subject — or null if no thread exists.
 */
export async function findLatestThread(contactEmail: string): Promise<{
  threadId: string;
  messageId: string;
  subject: string;
} | null> {
  const gmail = await getGmailClient();
  if (!gmail) return null;

  try {
    // Search for threads involving this contact (sent to OR received from)
    const res = await gmail.users.threads.list({
      userId: 'me',
      q: `{to:${contactEmail} from:${contactEmail}}`,
      maxResults: 1,
    });

    if (!res.data.threads || res.data.threads.length === 0) return null;

    const threadId = res.data.threads[0].id!;

    // Get the full thread to find the last message
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['Message-ID', 'Subject'],
    });

    const messages = thread.data.messages;
    if (!messages || messages.length === 0) return null;

    // Get the last message in the thread
    const lastMsg = messages[messages.length - 1];
    const messageIdHeader = lastMsg.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === 'message-id'
    );
    const subjectHeader = lastMsg.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === 'subject'
    );

    // Get the original subject (from first message, without Re: prefixes)
    const firstMsg = messages[0];
    const originalSubject = firstMsg.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === 'subject'
    )?.value || '';

    return {
      threadId,
      messageId: messageIdHeader?.value || '',
      subject: originalSubject,
    };
  } catch (error) {
    console.error('Error finding latest thread:', error);
    return null;
  }
}

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;    // Message-ID header
  gmailMsgId?: string;   // Gmail internal ID
  threadId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const gmail = await getGmailClient();
  if (!gmail) {
    return { success: false, error: 'Gmail not connected' };
  }

  const config = await prisma.gmailConfig.findUnique({
    where: { id: 'singleton' },
  });
  if (!config) {
    return { success: false, error: 'Gmail config not found' };
  }

  const senderName = process.env.GMAIL_SENDER_NAME || '';
  const from = senderName ? `${senderName} <${config.emailAddress}>` : config.emailAddress;

  const headers = [
    `From: ${from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'Content-Type: text/plain; charset=UTF-8',
  ];

  if (params.inReplyTo) headers.push(`In-Reply-To: ${params.inReplyTo}`);
  if (params.references) headers.push(`References: ${params.references}`);

  const rawMessage = [...headers, '', params.body].join('\r\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: params.threadId || undefined,
      },
    });

    // Get the Message-ID header from the sent message
    const sentMsg = await gmail.users.messages.get({
      userId: 'me',
      id: res.data.id!,
      format: 'metadata',
      metadataHeaders: ['Message-ID'],
    });

    const messageIdHeader = sentMsg.data.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === 'message-id'
    );

    return {
      success: true,
      messageId: messageIdHeader?.value || undefined,
      gmailMsgId: res.data.id || undefined,
      threadId: res.data.threadId || undefined,
    };
  } catch (error) {
    return { success: false, error: `Gmail API error: ${String(error)}` };
  }
}

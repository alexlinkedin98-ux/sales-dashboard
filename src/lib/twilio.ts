import twilio from 'twilio';

interface SendSmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

// WhatsApp Content Template SID for follow_up_checkin
const WHATSAPP_TEMPLATE_SID = 'HXc7cf993bd7667bdc4de92940786b4780';

export async function sendWhatsApp(
  to: string,
  variables: { firstName: string; topic: string }
): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || '+14155238886';

  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio not configured' };
  }

  // Normalize phone number
  let normalizedTo = to.replace(/[^0-9+]/g, '');
  if (!normalizedTo.startsWith('+')) {
    if (normalizedTo.length === 10) {
      normalizedTo = `+1${normalizedTo}`;
    } else {
      normalizedTo = `+${normalizedTo}`;
    }
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      contentSid: WHATSAPP_TEMPLATE_SID,
      contentVariables: JSON.stringify({
        '1': variables.firstName,
        '2': variables.topic,
      }),
      from: `whatsapp:${whatsappFrom}`,
      to: `whatsapp:${normalizedTo}`,
    });

    return { success: true, messageSid: message.sid };
  } catch (error) {
    return { success: false, error: `WhatsApp error: ${String(error)}` };
  }
}

export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    return { success: false, error: 'Twilio not configured' };
  }

  // Normalize phone number — ensure it starts with +
  let normalizedTo = to.replace(/[^0-9+]/g, '');
  if (!normalizedTo.startsWith('+')) {
    if (normalizedTo.length === 10) {
      normalizedTo = `+1${normalizedTo}`;
    } else {
      normalizedTo = `+${normalizedTo}`;
    }
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body,
      messagingServiceSid,
      to: normalizedTo,
    });

    return {
      success: true,
      messageSid: message.sid,
    };
  } catch (error) {
    return { success: false, error: `Twilio error: ${String(error)}` };
  }
}

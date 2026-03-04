const VAPI_BASE_URL = 'https://api.vapi.ai';

interface CreateCallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

/**
 * Trigger an outbound call via Vapi.
 * Uses assistantOverrides to customize the first message per lead.
 */
export async function createOutboundCall(params: {
  phoneNumber: string;
  contactName: string;
  callContext: string; // what was discussed (e.g. "Google Ads campaign")
}): Promise<CreateCallResult> {
  const apiKey = process.env.VAPI_API_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!apiKey || !assistantId || !phoneNumberId) {
    return { success: false, error: 'Vapi not configured (missing env vars)' };
  }

  // Normalize phone number to E.164
  let normalizedPhone = params.phoneNumber.replace(/[^0-9+]/g, '');
  if (!normalizedPhone.startsWith('+')) {
    if (normalizedPhone.length === 10) {
      normalizedPhone = `+1${normalizedPhone}`;
    } else {
      normalizedPhone = `+${normalizedPhone}`;
    }
  }

  // Only allow US/Canada numbers (+1)
  if (!normalizedPhone.startsWith('+1')) {
    return { success: false, error: `Skipping non-US number: ${normalizedPhone}` };
  }

  const firstName = params.contactName.split(' ')[0];

  try {
    const response = await fetch(`${VAPI_BASE_URL}/call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: {
          number: normalizedPhone,
          name: params.contactName,
        },
        assistantOverrides: {
          firstMessage: `Hey ${firstName}, it's Alex — how's it going? I was just thinking about our chat a while back about ${params.callContext} and wanted to see how things have been.`,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Vapi API error ${response.status}: ${errorBody}` };
    }

    const data = await response.json();
    return { success: true, callId: data.id };
  } catch (error) {
    return { success: false, error: `Vapi call failed: ${String(error)}` };
  }
}

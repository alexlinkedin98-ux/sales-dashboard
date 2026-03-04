import type { Config } from '@netlify/functions';

export default async function handler() {
  const baseUrl = process.env.URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/automation/send-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET || '',
      },
    });

    const result = await response.json();
    console.log('Send emails result:', JSON.stringify(result));
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error('Send emails cron error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
}

export const config: Config = {
  schedule: '0 * * * *', // Every hour
};

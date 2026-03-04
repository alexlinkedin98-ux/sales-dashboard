import { NextResponse } from 'next/server';
import { createOAuth2Client } from '@/lib/gmail';

export async function GET() {
  try {
    const oauth2Client = createOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating Gmail auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}

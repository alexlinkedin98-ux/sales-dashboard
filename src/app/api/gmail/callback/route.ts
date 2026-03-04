import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createOAuth2Client } from '@/lib/gmail';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/follow-ups?gmail=error&reason=no_code', request.url));
    }

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token || !tokens.access_token) {
      return NextResponse.redirect(new URL('/follow-ups?gmail=error&reason=no_tokens', request.url));
    }

    oauth2Client.setCredentials(tokens);

    // Get the email address of the connected account
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress;

    if (!emailAddress) {
      return NextResponse.redirect(new URL('/follow-ups?gmail=error&reason=no_email', request.url));
    }

    // Upsert the singleton Gmail config
    await prisma.gmailConfig.upsert({
      where: { id: 'singleton' },
      update: {
        emailAddress,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
      },
      create: {
        id: 'singleton',
        emailAddress,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
      },
    });

    await prisma.automationLog.create({
      data: { actionType: 'gmail_connected', success: true, details: JSON.stringify({ email: emailAddress }) },
    });

    // Redirect back to follow-ups page with success
    const baseUrl = process.env.URL || request.nextUrl.origin;
    return NextResponse.redirect(new URL('/follow-ups?gmail=connected', baseUrl));
  } catch (error) {
    console.error('Error in Gmail OAuth callback:', error);
    const baseUrl = process.env.URL || request.nextUrl.origin;
    return NextResponse.redirect(new URL('/follow-ups?gmail=error&reason=callback_failed', baseUrl));
  }
}

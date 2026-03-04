import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    await prisma.gmailConfig.delete({
      where: { id: 'singleton' },
    }).catch(() => {
      // Ignore if not found
    });

    await prisma.automationLog.create({
      data: { actionType: 'gmail_disconnected', success: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    return NextResponse.json({ error: 'Failed to disconnect Gmail' }, { status: 500 });
  }
}

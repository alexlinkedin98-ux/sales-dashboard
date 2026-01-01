import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const stats = await prisma.monthlyMarketingStats.findMany({
      include: { channel: true },
      orderBy: { monthStartDate: 'desc' },
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly stats' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, monthStartDate, monthLabel, spend, clientsClosed } = body;

    // Upsert - create or update
    const stat = await prisma.monthlyMarketingStats.upsert({
      where: {
        channelId_monthStartDate: {
          channelId,
          monthStartDate: new Date(monthStartDate),
        },
      },
      update: {
        spend: spend || 0,
        clientsClosed: clientsClosed || 0,
      },
      create: {
        channelId,
        monthStartDate: new Date(monthStartDate),
        monthLabel,
        spend: spend || 0,
        clientsClosed: clientsClosed || 0,
      },
      include: { channel: true },
    });

    return NextResponse.json(stat);
  } catch (error) {
    console.error('Error saving monthly stats:', error);
    return NextResponse.json(
      { error: 'Failed to save monthly stats' },
      { status: 500 }
    );
  }
}

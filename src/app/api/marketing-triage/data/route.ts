import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET aggregated marketing triage data (leads received per channel)
export async function GET() {
  try {
    // Get all channels
    const channels = await prisma.marketingChannel.findMany({
      orderBy: { name: 'asc' },
    });

    // Get all marketing triage entries
    const entries = await prisma.marketingTriageEntry.findMany({
      include: {
        channel: true,
      },
      orderBy: { weekStartDate: 'desc' },
    });

    // Group entries by channel
    const channelData = channels.map((channel) => {
      const channelEntries = entries.filter((e) => e.channelId === channel.id);

      // Weekly data - only leadsReceived
      const weeklyData = channelEntries.map((entry) => ({
        id: entry.id,
        weekDate: entry.weekStartDate.toISOString(),
        weekLabel: entry.weekLabel,
        leadsReceived: entry.leadsReceived,
      }));

      // Calculate total
      const totalLeadsReceived = channelEntries.reduce((sum, e) => sum + e.leadsReceived, 0);

      // Monthly summaries - only leadsReceived
      const monthlyMap = new Map<string, number>();

      channelEntries.forEach((entry) => {
        const monthKey = entry.weekStartDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });

        const existing = monthlyMap.get(monthKey) || 0;
        monthlyMap.set(monthKey, existing + entry.leadsReceived);
      });

      const monthlySummaries = Array.from(monthlyMap.entries()).map(([month, leadsReceived]) => ({
        month,
        leadsReceived,
      }));

      return {
        id: channel.id,
        name: channel.name,
        weeklyData,
        monthlySummaries,
        totalLeadsReceived,
      };
    });

    // Calculate overall total
    const overallTotal = channelData.reduce((sum, c) => sum + c.totalLeadsReceived, 0);

    return NextResponse.json({
      channels: channelData,
      overallTotal,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching marketing triage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing triage data' },
      { status: 500 }
    );
  }
}

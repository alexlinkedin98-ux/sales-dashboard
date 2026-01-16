import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET aggregated marketing triage data
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

      // Weekly data
      const weeklyData = channelEntries.map((entry) => ({
        id: entry.id,
        weekDate: entry.weekStartDate.toISOString(),
        weekLabel: entry.weekLabel,
        leadsReceived: entry.leadsReceived,
        leadsContacted: entry.leadsContacted,
        leadsQualified: entry.leadsQualified,
        contactRate: entry.leadsReceived > 0
          ? (entry.leadsContacted / entry.leadsReceived) * 100
          : 0,
        qualificationRate: entry.leadsContacted > 0
          ? (entry.leadsQualified / entry.leadsContacted) * 100
          : 0,
      }));

      // Calculate totals
      const totalLeadsReceived = channelEntries.reduce((sum, e) => sum + e.leadsReceived, 0);
      const totalLeadsContacted = channelEntries.reduce((sum, e) => sum + e.leadsContacted, 0);
      const totalLeadsQualified = channelEntries.reduce((sum, e) => sum + e.leadsQualified, 0);

      // Monthly summaries
      const monthlyMap = new Map<string, {
        leadsReceived: number;
        leadsContacted: number;
        leadsQualified: number;
      }>();

      channelEntries.forEach((entry) => {
        const monthKey = entry.weekStartDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });

        const existing = monthlyMap.get(monthKey) || {
          leadsReceived: 0,
          leadsContacted: 0,
          leadsQualified: 0,
        };

        monthlyMap.set(monthKey, {
          leadsReceived: existing.leadsReceived + entry.leadsReceived,
          leadsContacted: existing.leadsContacted + entry.leadsContacted,
          leadsQualified: existing.leadsQualified + entry.leadsQualified,
        });
      });

      const monthlySummaries = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        ...data,
        contactRate: data.leadsReceived > 0 ? (data.leadsContacted / data.leadsReceived) * 100 : 0,
        qualificationRate: data.leadsContacted > 0 ? (data.leadsQualified / data.leadsContacted) * 100 : 0,
      }));

      return {
        id: channel.id,
        name: channel.name,
        weeklyData,
        monthlySummaries,
        totals: {
          leadsReceived: totalLeadsReceived,
          leadsContacted: totalLeadsContacted,
          leadsQualified: totalLeadsQualified,
          contactRate: totalLeadsReceived > 0 ? (totalLeadsContacted / totalLeadsReceived) * 100 : 0,
          qualificationRate: totalLeadsContacted > 0 ? (totalLeadsQualified / totalLeadsContacted) * 100 : 0,
        },
      };
    });

    // Calculate overall totals
    const overallTotals = {
      leadsReceived: channelData.reduce((sum, c) => sum + c.totals.leadsReceived, 0),
      leadsContacted: channelData.reduce((sum, c) => sum + c.totals.leadsContacted, 0),
      leadsQualified: channelData.reduce((sum, c) => sum + c.totals.leadsQualified, 0),
    };

    return NextResponse.json({
      channels: channelData,
      overallTotals: {
        ...overallTotals,
        contactRate: overallTotals.leadsReceived > 0
          ? (overallTotals.leadsContacted / overallTotals.leadsReceived) * 100
          : 0,
        qualificationRate: overallTotals.leadsContacted > 0
          ? (overallTotals.leadsQualified / overallTotals.leadsContacted) * 100
          : 0,
      },
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

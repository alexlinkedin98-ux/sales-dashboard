import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get all upsell entries with rep info
    const entries = await prisma.upsellEntry.findMany({
      include: {
        salesRep: true,
      },
      orderBy: {
        weekStartDate: 'asc',
      },
    });

    // Get all reps
    const reps = await prisma.salesRep.findMany({
      orderBy: { name: 'asc' },
    });

    // Group entries by rep
    const repData = reps.map((rep) => {
      const repEntries = entries.filter((e) => e.salesRepId === rep.id);

      // Calculate totals
      const totals = repEntries.reduce(
        (acc, entry) => ({
          totalOutreach: acc.totalOutreach + entry.outreachCount,
          totalMeetingsBooked: acc.totalMeetingsBooked + entry.meetingsBooked,
          totalProposals: acc.totalProposals + entry.proposalsMade,
          totalClosed: acc.totalClosed + entry.dealsClosed,
          totalRevenue: acc.totalRevenue + entry.upsellRevenue,
        }),
        {
          totalOutreach: 0,
          totalMeetingsBooked: 0,
          totalProposals: 0,
          totalClosed: 0,
          totalRevenue: 0,
        }
      );

      // Calculate rates
      const meetingBookRate =
        totals.totalOutreach > 0
          ? (totals.totalMeetingsBooked / totals.totalOutreach) * 100
          : 0;
      const proposalRate =
        totals.totalMeetingsBooked > 0
          ? (totals.totalProposals / totals.totalMeetingsBooked) * 100
          : 0;
      const closeRate =
        totals.totalProposals > 0
          ? (totals.totalClosed / totals.totalProposals) * 100
          : 0;
      const revenuePerClose =
        totals.totalClosed > 0 ? totals.totalRevenue / totals.totalClosed : 0;

      // Weekly data for charts
      const weeklyData = repEntries.map((entry) => ({
        id: entry.id,
        weekDate: entry.weekStartDate,
        weekLabel: entry.weekLabel,
        outreachCount: entry.outreachCount,
        meetingsBooked: entry.meetingsBooked,
        proposalsMade: entry.proposalsMade,
        dealsClosed: entry.dealsClosed,
        upsellRevenue: entry.upsellRevenue,
        // Calculated rates per week
        meetingBookRate:
          entry.outreachCount > 0
            ? (entry.meetingsBooked / entry.outreachCount) * 100
            : 0,
        closeRate:
          entry.proposalsMade > 0
            ? (entry.dealsClosed / entry.proposalsMade) * 100
            : 0,
      }));

      // Monthly summaries
      const monthlyMap = new Map<
        string,
        {
          outreach: number;
          meetings: number;
          proposals: number;
          closed: number;
          revenue: number;
        }
      >();

      repEntries.forEach((entry) => {
        const monthKey = new Date(entry.weekStartDate).toLocaleDateString(
          'en-US',
          { month: 'long', year: 'numeric' }
        );
        const existing = monthlyMap.get(monthKey) || {
          outreach: 0,
          meetings: 0,
          proposals: 0,
          closed: 0,
          revenue: 0,
        };
        monthlyMap.set(monthKey, {
          outreach: existing.outreach + entry.outreachCount,
          meetings: existing.meetings + entry.meetingsBooked,
          proposals: existing.proposals + entry.proposalsMade,
          closed: existing.closed + entry.dealsClosed,
          revenue: existing.revenue + entry.upsellRevenue,
        });
      });

      const monthlySummaries = Array.from(monthlyMap.entries()).map(
        ([month, data]) => ({
          month,
          ...data,
          meetingBookRate:
            data.outreach > 0 ? (data.meetings / data.outreach) * 100 : 0,
          closeRate:
            data.proposals > 0 ? (data.closed / data.proposals) * 100 : 0,
        })
      );

      return {
        repId: rep.id,
        repName: rep.name,
        weeklyData,
        monthlySummaries,
        totals: {
          ...totals,
          meetingBookRate,
          proposalRate,
          closeRate,
          revenuePerClose,
        },
      };
    });

    // Overall totals
    const overall = entries.reduce(
      (acc, entry) => ({
        totalOutreach: acc.totalOutreach + entry.outreachCount,
        totalMeetingsBooked: acc.totalMeetingsBooked + entry.meetingsBooked,
        totalProposals: acc.totalProposals + entry.proposalsMade,
        totalClosed: acc.totalClosed + entry.dealsClosed,
        totalRevenue: acc.totalRevenue + entry.upsellRevenue,
      }),
      {
        totalOutreach: 0,
        totalMeetingsBooked: 0,
        totalProposals: 0,
        totalClosed: 0,
        totalRevenue: 0,
      }
    );

    return NextResponse.json({
      reps: repData,
      overall: {
        ...overall,
        meetingBookRate:
          overall.totalOutreach > 0
            ? (overall.totalMeetingsBooked / overall.totalOutreach) * 100
            : 0,
        closeRate:
          overall.totalProposals > 0
            ? (overall.totalClosed / overall.totalProposals) * 100
            : 0,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching upsell data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upsell data' },
      { status: 500 }
    );
  }
}

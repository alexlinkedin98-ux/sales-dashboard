import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get all triage entries with rep info
    const entries = await prisma.triageEntry.findMany({
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
          totalBooked: acc.totalBooked + entry.triageBooked,
          totalTaken: acc.totalTaken + entry.triageTaken,
          totalQualified: acc.totalQualified + entry.qualifiedForIntro,
        }),
        {
          totalBooked: 0,
          totalTaken: 0,
          totalQualified: 0,
        }
      );

      // Calculate rates
      const showRate =
        totals.totalBooked > 0
          ? (totals.totalTaken / totals.totalBooked) * 100
          : 0;
      const qualificationRate =
        totals.totalTaken > 0
          ? (totals.totalQualified / totals.totalTaken) * 100
          : 0;

      // Weekly data for charts
      const weeklyData = repEntries.map((entry) => ({
        id: entry.id,
        weekDate: entry.weekStartDate,
        weekLabel: entry.weekLabel,
        triageBooked: entry.triageBooked,
        triageTaken: entry.triageTaken,
        qualifiedForIntro: entry.qualifiedForIntro,
        // Calculated rates per week
        showRate:
          entry.triageBooked > 0
            ? (entry.triageTaken / entry.triageBooked) * 100
            : 0,
        qualificationRate:
          entry.triageTaken > 0
            ? (entry.qualifiedForIntro / entry.triageTaken) * 100
            : 0,
      }));

      // Monthly summaries
      const monthlyMap = new Map<
        string,
        {
          booked: number;
          taken: number;
          qualified: number;
        }
      >();

      repEntries.forEach((entry) => {
        const monthKey = new Date(entry.weekStartDate).toLocaleDateString(
          'en-US',
          { month: 'long', year: 'numeric' }
        );
        const existing = monthlyMap.get(monthKey) || {
          booked: 0,
          taken: 0,
          qualified: 0,
        };
        monthlyMap.set(monthKey, {
          booked: existing.booked + entry.triageBooked,
          taken: existing.taken + entry.triageTaken,
          qualified: existing.qualified + entry.qualifiedForIntro,
        });
      });

      const monthlySummaries = Array.from(monthlyMap.entries()).map(
        ([month, data]) => ({
          month,
          ...data,
          showRate:
            data.booked > 0 ? (data.taken / data.booked) * 100 : 0,
          qualificationRate:
            data.taken > 0 ? (data.qualified / data.taken) * 100 : 0,
        })
      );

      return {
        repId: rep.id,
        repName: rep.name,
        weeklyData,
        monthlySummaries,
        totals: {
          ...totals,
          showRate,
          qualificationRate,
        },
      };
    });

    // Overall totals
    const overall = entries.reduce(
      (acc, entry) => ({
        totalBooked: acc.totalBooked + entry.triageBooked,
        totalTaken: acc.totalTaken + entry.triageTaken,
        totalQualified: acc.totalQualified + entry.qualifiedForIntro,
      }),
      {
        totalBooked: 0,
        totalTaken: 0,
        totalQualified: 0,
      }
    );

    return NextResponse.json({
      reps: repData,
      overall: {
        ...overall,
        showRate:
          overall.totalBooked > 0
            ? (overall.totalTaken / overall.totalBooked) * 100
            : 0,
        qualificationRate:
          overall.totalTaken > 0
            ? (overall.totalQualified / overall.totalTaken) * 100
            : 0,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching triage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch triage data' },
      { status: 500 }
    );
  }
}

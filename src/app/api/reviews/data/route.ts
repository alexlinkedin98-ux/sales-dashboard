import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET aggregated review data
export async function GET() {
  try {
    // Get all reps
    const reps = await prisma.salesRep.findMany({
      orderBy: { name: 'asc' },
    });

    // Get all review entries
    const entries = await prisma.reviewEntry.findMany({
      include: {
        salesRep: true,
      },
      orderBy: { monthStartDate: 'desc' },
    });

    // Group entries by rep
    const repData = reps.map((rep) => {
      const repEntries = entries.filter((e) => e.salesRepId === rep.id);

      // Monthly data
      const monthlyData = repEntries.map((entry) => ({
        id: entry.id,
        monthDate: entry.monthStartDate.toISOString(),
        monthLabel: entry.monthLabel,
        reviewsRequested: entry.reviewsRequested,
        googleReviews: entry.googleReviews,
        clutchReviews: entry.clutchReviews,
        totalReceived: entry.googleReviews + entry.clutchReviews,
        responseRate: entry.reviewsRequested > 0
          ? ((entry.googleReviews + entry.clutchReviews) / entry.reviewsRequested) * 100
          : 0,
      }));

      // Calculate totals
      const totalRequested = repEntries.reduce((sum, e) => sum + e.reviewsRequested, 0);
      const totalGoogle = repEntries.reduce((sum, e) => sum + e.googleReviews, 0);
      const totalClutch = repEntries.reduce((sum, e) => sum + e.clutchReviews, 0);
      const totalReceived = totalGoogle + totalClutch;
      const responseRate = totalRequested > 0 ? (totalReceived / totalRequested) * 100 : 0;

      return {
        repId: rep.id,
        repName: rep.name,
        monthlyData,
        totals: {
          totalRequested,
          totalGoogle,
          totalClutch,
          totalReceived,
          responseRate,
        },
      };
    });

    // Calculate overall totals
    const overallRequested = entries.reduce((sum, e) => sum + e.reviewsRequested, 0);
    const overallGoogle = entries.reduce((sum, e) => sum + e.googleReviews, 0);
    const overallClutch = entries.reduce((sum, e) => sum + e.clutchReviews, 0);
    const overallReceived = overallGoogle + overallClutch;
    const overallResponseRate = overallRequested > 0 ? (overallReceived / overallRequested) * 100 : 0;

    // Monthly trend data (combined across all reps)
    const monthlyTrend = new Map<string, {
      monthDate: string;
      monthLabel: string;
      requested: number;
      google: number;
      clutch: number;
      total: number;
    }>();

    entries.forEach((entry) => {
      const key = entry.monthStartDate.toISOString().split('T')[0];
      const existing = monthlyTrend.get(key);
      if (existing) {
        existing.requested += entry.reviewsRequested;
        existing.google += entry.googleReviews;
        existing.clutch += entry.clutchReviews;
        existing.total += entry.googleReviews + entry.clutchReviews;
      } else {
        monthlyTrend.set(key, {
          monthDate: entry.monthStartDate.toISOString(),
          monthLabel: entry.monthLabel,
          requested: entry.reviewsRequested,
          google: entry.googleReviews,
          clutch: entry.clutchReviews,
          total: entry.googleReviews + entry.clutchReviews,
        });
      }
    });

    // Sort monthly trend by date
    const trendData = Array.from(monthlyTrend.values()).sort(
      (a, b) => new Date(a.monthDate).getTime() - new Date(b.monthDate).getTime()
    );

    return NextResponse.json({
      reps: repData,
      overall: {
        totalRequested: overallRequested,
        totalGoogle: overallGoogle,
        totalClutch: overallClutch,
        totalReceived: overallReceived,
        responseRate: overallResponseRate,
      },
      trendData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching review data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review data' },
      { status: 500 }
    );
  }
}

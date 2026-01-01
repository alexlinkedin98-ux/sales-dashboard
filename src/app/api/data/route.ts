import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DashboardData, WeeklyData, MonthlySummary, QuarterlySummary, SalesRepData } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Helper to calculate rates
function calculateShowUpRate(scheduled: number, taken: number): number {
  return scheduled > 0 ? (taken / scheduled) * 100 : 0;
}

function calculateCloseRate(proposals: number, closed: number): number {
  return proposals > 0 ? (closed / proposals) * 100 : 0;
}

function calculateProposalRate(audited: number, proposals: number): number {
  return audited > 0 ? (proposals / audited) * 100 : 0;
}

// Group entries by month
function groupByMonth(entries: WeeklyData[]): Map<string, WeeklyData[]> {
  const grouped = new Map<string, WeeklyData[]>();

  for (const entry of entries) {
    const date = entry.weekDate;
    const monthKey = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)!.push(entry);
  }

  return grouped;
}

// Calculate monthly summary
function calculateMonthlySummary(weeklyData: WeeklyData[], month: string): MonthlySummary {
  const totalCallsScheduled = weeklyData.reduce((sum, w) => sum + w.introCallsScheduled, 0);
  const totalCallsTaken = weeklyData.reduce((sum, w) => sum + w.introCallsTaken, 0);
  const totalAccountsAudited = weeklyData.reduce((sum, w) => sum + w.accountsAudited, 0);
  const totalProposals = weeklyData.reduce((sum, w) => sum + w.proposalsPitched, 0);
  const totalClosed = weeklyData.reduce((sum, w) => sum + w.dealsClosed, 0);
  const totalMRR = weeklyData.reduce((sum, w) => sum + w.thisMonthMRR, 0);

  return {
    month,
    totalCallsScheduled,
    totalCallsTaken,
    showUpRate: calculateShowUpRate(totalCallsScheduled, totalCallsTaken),
    acceptanceQualityRate: totalAccountsAudited > 0 && totalCallsTaken > 0
      ? (totalAccountsAudited / totalCallsTaken) * 100
      : 0,
    totalAccountsAudited,
    totalProposals,
    totalClosed,
    proposalRate: calculateProposalRate(totalAccountsAudited, totalProposals),
    closeRate: calculateCloseRate(totalProposals, totalClosed),
    totalMRR,
    mrrPerCallTaken: totalCallsTaken > 0 ? totalMRR / totalCallsTaken : 0,
    mrrPerAudit: totalAccountsAudited > 0 ? totalMRR / totalAccountsAudited : 0,
    mrrPerSales: totalClosed > 0 ? totalMRR / totalClosed : 0,
  };
}

// Group monthly summaries by quarter
function groupByQuarter(monthlySummaries: MonthlySummary[]): Map<string, MonthlySummary[]> {
  const grouped = new Map<string, MonthlySummary[]>();

  for (const summary of monthlySummaries) {
    const parts = summary.month.split(' ');
    const month = parts[0];
    const year = parts[1];

    let quarter: string;
    if (['January', 'February', 'March'].includes(month)) {
      quarter = `Q1 ${year}`;
    } else if (['April', 'May', 'June'].includes(month)) {
      quarter = `Q2 ${year}`;
    } else if (['July', 'August', 'September'].includes(month)) {
      quarter = `Q3 ${year}`;
    } else {
      quarter = `Q4 ${year}`;
    }

    if (!grouped.has(quarter)) {
      grouped.set(quarter, []);
    }
    grouped.get(quarter)!.push(summary);
  }

  return grouped;
}

// Calculate quarterly summary
function calculateQuarterlySummary(monthlySummaries: MonthlySummary[], quarter: string): QuarterlySummary {
  const totalCallsScheduled = monthlySummaries.reduce((sum, m) => sum + m.totalCallsScheduled, 0);
  const totalCallsTaken = monthlySummaries.reduce((sum, m) => sum + m.totalCallsTaken, 0);
  const totalAccountsAudited = monthlySummaries.reduce((sum, m) => sum + m.totalAccountsAudited, 0);
  const totalProposals = monthlySummaries.reduce((sum, m) => sum + m.totalProposals, 0);
  const totalClosed = monthlySummaries.reduce((sum, m) => sum + m.totalClosed, 0);
  const totalMRR = monthlySummaries.reduce((sum, m) => sum + m.totalMRR, 0);

  return {
    quarter,
    months: monthlySummaries,
    totalCallsScheduled,
    totalCallsTaken,
    showUpRate: calculateShowUpRate(totalCallsScheduled, totalCallsTaken),
    acceptanceQualityRate: monthlySummaries.length > 0
      ? monthlySummaries.reduce((sum, m) => sum + m.acceptanceQualityRate, 0) / monthlySummaries.length
      : 0,
    totalAccountsAudited,
    totalProposals,
    totalClosed,
    proposalRate: calculateProposalRate(totalAccountsAudited, totalProposals),
    closeRate: calculateCloseRate(totalProposals, totalClosed),
    totalMRR,
    mrrPerCallTaken: totalCallsTaken > 0 ? totalMRR / totalCallsTaken : 0,
    mrrPerAudit: totalAccountsAudited > 0 ? totalMRR / totalAccountsAudited : 0,
    mrrPerSales: totalClosed > 0 ? totalMRR / totalClosed : 0,
  };
}

export async function GET() {
  try {
    // Fetch all reps with their entries
    const reps = await prisma.salesRep.findMany({
      include: {
        entries: {
          orderBy: { weekStartDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform data to dashboard format
    const repData: SalesRepData[] = reps.map((rep) => {
      // Transform entries to WeeklyData format
      const weeklyData: WeeklyData[] = rep.entries.map((entry) => {
        const showUpRate = calculateShowUpRate(entry.introCallsScheduled, entry.introCallsTaken);
        const closeRate = calculateCloseRate(entry.proposalsPitched, entry.dealsClosed);
        const proposalRate = calculateProposalRate(entry.accountsAudited, entry.proposalsPitched);
        const acceptanceRate = entry.introCallsTaken > 0
          ? (entry.accountsAudited / entry.introCallsTaken) * 100
          : 0;

        return {
          id: entry.id,
          week: entry.weekLabel,
          weekDate: entry.weekStartDate,
          introCallsScheduled: entry.introCallsScheduled,
          introCallsTaken: entry.introCallsTaken,
          showUpRate,
          acceptanceQualityRate: acceptanceRate,
          accountsAudited: entry.accountsAudited,
          proposalsPitched: entry.proposalsPitched,
          dealsClosed: entry.dealsClosed,
          proposalRate,
          closeRate,
          thisMonthMRR: entry.mrr,
          mrrPerCallTaken: entry.introCallsTaken > 0 ? entry.mrr / entry.introCallsTaken : 0,
          mrrPerAudit: entry.accountsAudited > 0 ? entry.mrr / entry.accountsAudited : 0,
          mrrPerSales: entry.dealsClosed > 0 ? entry.mrr / entry.dealsClosed : 0,
        };
      });

      // Calculate monthly summaries
      const monthlyByMonth = groupByMonth(weeklyData);
      const monthlySummaries: MonthlySummary[] = [];
      for (const [month, weeks] of monthlyByMonth) {
        monthlySummaries.push(calculateMonthlySummary(weeks, month));
      }

      // Calculate quarterly summaries
      const quarterlyByQuarter = groupByQuarter(monthlySummaries);
      const quarterlySummaries: QuarterlySummary[] = [];
      for (const [quarter, months] of quarterlyByQuarter) {
        quarterlySummaries.push(calculateQuarterlySummary(months, quarter));
      }

      return {
        name: rep.name,
        weeklyData,
        monthlySummaries,
        quarterlySummaries,
      };
    });

    const dashboardData: DashboardData = {
      reps: repData,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Dashboard data for client portfolio
export async function GET() {
  try {
    // Fetch all clients with fee history
    const clients = await prisma.clientPortfolio.findMany({
      include: {
        feeHistory: {
          orderBy: { monthStartDate: 'desc' },
        },
      },
      orderBy: { dateAcquired: 'desc' },
    });

    // Calculate summaries
    const activeClients = clients.filter((c) => c.isActive && !c.churned);
    const churnedClients = clients.filter((c) => c.churned);

    // Get current month for filtering
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate current month totals
    let currentMonthFees = 0;
    let currentMonthCommission = 0;

    clients.forEach((client) => {
      const currentMonthEntry = client.feeHistory.find(
        (f) => new Date(f.monthStartDate).getTime() === currentMonthStart.getTime()
      );
      if (currentMonthEntry) {
        currentMonthFees += currentMonthEntry.monthlyFee;
        currentMonthCommission += currentMonthEntry.commission;
      }
    });

    // Calculate all-time totals
    let totalFees = 0;
    let totalCommission = 0;

    clients.forEach((client) => {
      client.feeHistory.forEach((fee) => {
        totalFees += fee.monthlyFee;
        totalCommission += fee.commission;
      });
    });

    // Get monthly breakdown (last 12 months)
    const monthlyBreakdown: {
      month: string;
      monthDate: string;
      totalFees: number;
      totalCommission: number;
      activeClients: number;
    }[] = [];

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = monthDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      let monthFees = 0;
      let monthCommission = 0;
      let monthActiveClients = 0;

      clients.forEach((client) => {
        const entry = client.feeHistory.find(
          (f) => new Date(f.monthStartDate).getTime() === monthDate.getTime()
        );
        if (entry) {
          monthFees += entry.monthlyFee;
          monthCommission += entry.commission;
          monthActiveClients++;
        }
      });

      monthlyBreakdown.push({
        month: monthLabel,
        monthDate: monthDate.toISOString(),
        totalFees: monthFees,
        totalCommission: monthCommission,
        activeClients: monthActiveClients,
      });
    }

    // Calculate client type breakdown
    const clientTypeBreakdown: Record<string, { count: number; totalFees: number }> = {};
    activeClients.forEach((client) => {
      if (!clientTypeBreakdown[client.clientType]) {
        clientTypeBreakdown[client.clientType] = { count: 0, totalFees: 0 };
      }
      clientTypeBreakdown[client.clientType].count++;

      // Get most recent fee
      if (client.feeHistory.length > 0) {
        clientTypeBreakdown[client.clientType].totalFees += client.feeHistory[0].monthlyFee;
      }
    });

    // Calculate average fee
    const avgMonthlyFee = activeClients.length > 0
      ? activeClients.reduce((sum, c) => {
          const recentFee = c.feeHistory[0]?.monthlyFee || 0;
          return sum + recentFee;
        }, 0) / activeClients.length
      : 0;

    // Calculate retention rate (clients that haven't churned)
    const retentionRate = clients.length > 0
      ? (activeClients.length / clients.length) * 100
      : 100;

    // Calculate average client lifetime (in months)
    const clientLifetimes = clients.map((client) => {
      const acquired = new Date(client.dateAcquired);
      const endDate = client.churned && client.churnDate
        ? new Date(client.churnDate)
        : now;
      return Math.max(1, Math.floor((endDate.getTime() - acquired.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    });
    const avgClientLifetime = clientLifetimes.length > 0
      ? clientLifetimes.reduce((a, b) => a + b, 0) / clientLifetimes.length
      : 0;

    // Calculate churn breakdown by month
    const churnByMonth: Record<number, number> = {};
    churnedClients.forEach((client) => {
      const month = client.churnMonth || 1;
      churnByMonth[month] = (churnByMonth[month] || 0) + 1;
    });

    // Calculate average fee growth per client (comparing first vs most recent fee)
    let feeGrowthSum = 0;
    let feeGrowthCount = 0;
    clients.forEach((client) => {
      if (client.feeHistory.length >= 2) {
        const firstFee = client.feeHistory[client.feeHistory.length - 1].monthlyFee;
        const latestFee = client.feeHistory[0].monthlyFee;
        if (firstFee > 0) {
          const growthPercent = ((latestFee - firstFee) / firstFee) * 100;
          feeGrowthSum += growthPercent;
          feeGrowthCount++;
        }
      }
    });
    const avgFeeGrowth = feeGrowthCount > 0 ? feeGrowthSum / feeGrowthCount : 0;

    // Predict monthly commission based on trends
    const monthsWithData = monthlyBreakdown.filter((m) => m.totalFees > 0);
    const predictedMonthlyCommission = monthsWithData.length > 0
      ? monthsWithData.reduce((sum, m) => sum + m.totalCommission, 0) / monthsWithData.length
      : 0;

    // Format clients for display
    const formattedClients = clients.map((client) => {
      const recentFee = client.feeHistory[0];
      const previousFee = client.feeHistory[1];

      // Calculate fee trend
      let feeTrend: 'up' | 'down' | 'stable' = 'stable';
      let feeChange = 0;
      if (recentFee && previousFee) {
        feeChange = recentFee.monthlyFee - previousFee.monthlyFee;
        if (feeChange > 0) feeTrend = 'up';
        else if (feeChange < 0) feeTrend = 'down';
      }

      // Calculate months active
      const acquiredDate = new Date(client.dateAcquired);
      const monthsActive = Math.floor(
        (now.getTime() - acquiredDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      ) + 1;

      return {
        id: client.id,
        clientName: client.clientName,
        clientType: client.clientType,
        dateAcquired: client.dateAcquired,
        dateAcquiredLabel: client.dateAcquiredLabel,
        isActive: client.isActive,
        churned: client.churned,
        churnMonth: client.churnMonth,
        fupSequenceActive: client.fupSequenceActive,
        notes: client.notes,
        currentFee: recentFee?.monthlyFee || 0,
        currentCommission: recentFee?.commission || 0,
        feeTrend,
        feeChange,
        monthsActive,
        feeHistory: client.feeHistory,
      };
    });

    return NextResponse.json({
      clients: formattedClients,
      summary: {
        totalClients: clients.length,
        activeClients: activeClients.length,
        churnedClients: churnedClients.length,
        currentMonthFees,
        currentMonthCommission,
        totalFees,
        totalCommission,
        avgMonthlyFee,
        retentionRate,
        avgClientLifetime,
        avgFeeGrowth,
        predictedMonthlyCommission,
      },
      monthlyBreakdown,
      clientTypeBreakdown,
      churnByMonth,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching client data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client data' },
      { status: 500 }
    );
  }
}

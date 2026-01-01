import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface WeeklyData {
  id: string;
  week: string;
  weekDate: Date;
  leadsGenerated: number;
}

interface MonthlySummary {
  month: string;
  totalLeads: number;
  weekCount: number;
  avgLeadsPerWeek: number;
}

interface QuarterlySummary {
  quarter: string;
  totalLeads: number;
  weekCount: number;
  avgLeadsPerWeek: number;
}

interface ChannelData {
  name: string;
  weeklyData: WeeklyData[];
  monthlySummaries: MonthlySummary[];
  quarterlySummaries: QuarterlySummary[];
  allTimeTotal: number;
}

function getMonthKey(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getQuarterKey(date: Date): string {
  const month = date.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

export async function GET() {
  try {
    const channels = await prisma.marketingChannel.findMany({
      include: {
        entries: {
          orderBy: { weekStartDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const channelData: ChannelData[] = channels.map((channel) => {
      // Weekly data
      const weeklyData: WeeklyData[] = channel.entries.map((entry) => ({
        id: entry.id,
        week: entry.weekLabel,
        weekDate: entry.weekStartDate,
        leadsGenerated: entry.leadsGenerated,
      }));

      // Monthly summaries
      const monthlyMap = new Map<string, { leads: number; weeks: number }>();
      channel.entries.forEach((entry) => {
        const monthKey = getMonthKey(entry.weekStartDate);
        const existing = monthlyMap.get(monthKey) || { leads: 0, weeks: 0 };
        monthlyMap.set(monthKey, {
          leads: existing.leads + entry.leadsGenerated,
          weeks: existing.weeks + 1,
        });
      });

      const monthlySummaries: MonthlySummary[] = Array.from(monthlyMap.entries())
        .sort((a, b) => {
          const dateA = new Date(a[0]);
          const dateB = new Date(b[0]);
          return dateA.getTime() - dateB.getTime();
        })
        .map(([month, data]) => ({
          month,
          totalLeads: data.leads,
          weekCount: data.weeks,
          avgLeadsPerWeek: data.weeks > 0 ? data.leads / data.weeks : 0,
        }));

      // Quarterly summaries
      const quarterlyMap = new Map<string, { leads: number; weeks: number }>();
      channel.entries.forEach((entry) => {
        const quarterKey = getQuarterKey(entry.weekStartDate);
        const existing = quarterlyMap.get(quarterKey) || { leads: 0, weeks: 0 };
        quarterlyMap.set(quarterKey, {
          leads: existing.leads + entry.leadsGenerated,
          weeks: existing.weeks + 1,
        });
      });

      const quarterlySummaries: QuarterlySummary[] = Array.from(quarterlyMap.entries())
        .sort((a, b) => {
          const [qA, yA] = a[0].split(' ');
          const [qB, yB] = b[0].split(' ');
          if (yA !== yB) return parseInt(yA) - parseInt(yB);
          return parseInt(qA.slice(1)) - parseInt(qB.slice(1));
        })
        .map(([quarter, data]) => ({
          quarter,
          totalLeads: data.leads,
          weekCount: data.weeks,
          avgLeadsPerWeek: data.weeks > 0 ? data.leads / data.weeks : 0,
        }));

      const allTimeTotal = channel.entries.reduce((sum, e) => sum + e.leadsGenerated, 0);

      return {
        name: channel.name,
        weeklyData,
        monthlySummaries,
        quarterlySummaries,
        allTimeTotal,
      };
    });

    // Also calculate combined totals across all channels
    const allWeeks = new Map<string, { date: Date; leads: number }>();
    channels.forEach((channel) => {
      channel.entries.forEach((entry) => {
        const weekKey = entry.weekStartDate.toISOString().split('T')[0];
        const existing = allWeeks.get(weekKey) || { date: entry.weekStartDate, leads: 0 };
        allWeeks.set(weekKey, {
          date: entry.weekStartDate,
          leads: existing.leads + entry.leadsGenerated,
        });
      });
    });

    const combinedWeeklyData = Array.from(allWeeks.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([, data]) => ({
        week: data.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        weekDate: data.date,
        leadsGenerated: data.leads,
      }));

    return NextResponse.json({
      channels: channelData,
      combinedWeeklyData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching marketing data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

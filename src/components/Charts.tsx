'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { WeeklyData, SalesRepData } from '@/lib/types';

interface TrendChartProps {
  data: WeeklyData[];
  dataKey: keyof WeeklyData;
  title: string;
  color: string;
  format?: 'number' | 'currency' | 'percent';
}

export function TrendChart({ data, dataKey, title, color, format = 'number' }: TrendChartProps) {
  const chartData = data.map((week) => ({
    week: week.week.replace(/\s+\d{4}$/, '').substring(0, 6), // Shorten for display
    value: week[dataKey] as number,
  }));

  const formatValue = (value: number | undefined): string => {
    if (value === undefined) return '';
    if (format === 'currency') {
      return `$${value.toLocaleString()}`;
    }
    if (format === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    return String(value);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatValue(v)} />
          <Tooltip formatter={(value) => formatValue(value as number)} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ComparisonChartProps {
  reps: SalesRepData[];
  dataKey: 'totalMRR' | 'totalClosed' | 'closeRate' | 'totalCallsTaken' | 'totalCallsScheduled' | 'totalAccountsAudited' | 'totalProposals' | 'showUpRate' | 'acceptanceQualityRate' | 'proposalRate' | 'mrrPerCallTaken' | 'mrrPerAudit' | 'mrrPerSales';
  title: string;
  format?: 'number' | 'currency' | 'percent';
}

export function ComparisonChart({ reps, dataKey, title, format = 'number' }: ComparisonChartProps) {
  // Build comparison data from monthly summaries
  const allMonths = new Set<string>();
  reps.forEach((rep) => {
    rep.monthlySummaries.forEach((m) => allMonths.add(m.month));
  });

  const chartData = Array.from(allMonths)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map((month) => {
      const entry: Record<string, string | number> = { month: month.substring(0, 3) };
      reps.forEach((rep) => {
        const summary = rep.monthlySummaries.find((m) => m.month === month);
        entry[rep.name] = summary ? summary[dataKey] : 0;
      });
      return entry;
    });

  const formatValue = (value: number | undefined): string => {
    if (value === undefined) return '';
    if (format === 'currency') {
      return `$${value.toLocaleString()}`;
    }
    if (format === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    return String(value);
  };

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatValue(v)} />
          <Tooltip formatter={(value) => formatValue(value as number)} />
          <Legend />
          {reps.map((rep, index) => (
            <Line
              key={rep.name}
              type="monotone"
              dataKey={rep.name}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[index % colors.length], strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface WeeklyComparisonChartProps {
  reps: SalesRepData[];
  dataKey: keyof WeeklyData;
  title: string;
  format?: 'number' | 'currency' | 'percent';
}

export function WeeklyComparisonChart({
  reps,
  dataKey,
  title,
  format = 'number',
}: WeeklyComparisonChartProps) {
  // Build comparison data from weekly data
  const allWeeks = new Set<string>();
  reps.forEach((rep) => {
    rep.weeklyData.forEach((w) => allWeeks.add(w.week));
  });

  const chartData = Array.from(allWeeks)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map((week) => {
      const entry: Record<string, string | number> = {
        week: week.replace(/\s+\d{4}$/, '').substring(0, 6),
      };
      reps.forEach((rep) => {
        const weekData = rep.weeklyData.find((w) => w.week === week);
        entry[rep.name] = weekData ? (weekData[dataKey] as number) : 0;
      });
      return entry;
    });

  const formatValue = (value: number | undefined): string => {
    if (value === undefined) return '';
    if (format === 'currency') {
      return `$${value.toLocaleString()}`;
    }
    if (format === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    return String(value);
  };

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatValue(v)} />
          <Tooltip formatter={(value) => formatValue(value as number)} />
          <Legend />
          {reps.map((rep, index) => (
            <Line
              key={rep.name}
              type="monotone"
              dataKey={rep.name}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[index % colors.length], strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

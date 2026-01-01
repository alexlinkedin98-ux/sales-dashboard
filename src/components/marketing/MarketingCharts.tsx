'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChannelData {
  name: string;
  monthlySummaries: {
    month: string;
    totalLeads: number;
    avgLeadsPerWeek: number;
  }[];
  weeklyData: {
    week: string;
    leadsGenerated: number;
  }[];
}

interface TrendChartProps {
  data: { week: string; leadsGenerated: number }[];
  title: string;
  color: string;
}

export function MarketingTrendChart({ data, title, color }: TrendChartProps) {
  const chartData = data.map((week) => ({
    week: week.week.replace(/\s+\d{4}$/, '').substring(0, 6),
    value: week.leadsGenerated,
  }));

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
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
  channels: ChannelData[];
  dataKey: 'totalLeads' | 'avgLeadsPerWeek';
  title: string;
}

export function MarketingComparisonChart({ channels, dataKey, title }: ComparisonChartProps) {
  const allMonths = new Set<string>();
  channels.forEach((channel) => {
    channel.monthlySummaries.forEach((m) => allMonths.add(m.month));
  });

  const chartData = Array.from(allMonths)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map((month) => {
      const entry: Record<string, string | number> = { month: month.substring(0, 3) };
      channels.forEach((channel) => {
        const summary = channel.monthlySummaries.find((m) => m.month === month);
        entry[channel.name] = summary ? summary[dataKey] : 0;
      });
      return entry;
    });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          {channels.map((channel, index) => (
            <Line
              key={channel.name}
              type="monotone"
              dataKey={channel.name}
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
  channels: ChannelData[];
  title: string;
}

interface MonthlyTrendChartProps {
  data: { month: string; leads: number }[];
  title: string;
}

export function MarketingMonthlyTrendChart({ data, title }: MonthlyTrendChartProps) {
  const chartData = data.map((item) => ({
    month: item.month.substring(0, 3),
    leads: item.leads,
  }));

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="leads"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Cost metrics charts
interface CostMetricChartProps {
  data: {
    month: string;
    leads: number;
    spend: number;
    clients: number;
    costPerLead: number;
    costPerAcquisition: number;
  }[];
  metric: 'spend' | 'costPerLead' | 'costPerAcquisition';
  title: string;
  color: string;
  prefix?: string;
}

export function MarketingCostMetricChart({ data, metric, title, color, prefix = '$' }: CostMetricChartProps) {
  const chartData = data.map((item) => ({
    month: item.month.substring(0, 3),
    value: item[metric],
  }));

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${prefix}${value.toFixed(0)}`} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MarketingWeeklyComparisonChart({ channels, title }: WeeklyComparisonChartProps) {
  const allWeeks = new Set<string>();
  channels.forEach((channel) => {
    channel.weeklyData.forEach((w) => allWeeks.add(w.week));
  });

  const chartData = Array.from(allWeeks)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map((week) => {
      const entry: Record<string, string | number> = {
        week: week.replace(/\s+\d{4}$/, '').substring(0, 6),
      };
      channels.forEach((channel) => {
        const weekData = channel.weeklyData.find((w) => w.week === week);
        entry[channel.name] = weekData ? weekData.leadsGenerated : 0;
      });
      return entry;
    });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          {channels.map((channel, index) => (
            <Line
              key={channel.name}
              type="monotone"
              dataKey={channel.name}
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

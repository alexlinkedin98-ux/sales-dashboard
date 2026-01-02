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

interface WeeklyTrend {
  weekStart: Date | string;
  weekLabel: string;
  totalCalls: number;
  avgSituationQuestions: number;
  avgProblemQuestions: number;
  avgImplicationQuestions: number;
  avgNeedPayoffQuestions: number;
  avgChallenges: number;
  avgDataPoints: number;
  avgInsights: number;
  avgAiScoreOverall: number | null;
  avgRepScoreOverall: number | null;
}

interface RepData {
  repId: string;
  repName: string;
  weeklyTrends: WeeklyTrend[];
  totals: {
    totalCalls: number;
    avgAiScoreOverall: number | null;
    avgRepScoreOverall: number | null;
  };
}

interface ScoreTrendChartProps {
  trends: WeeklyTrend[];
  title: string;
}

export function ScoreTrendChart({ trends, title }: ScoreTrendChartProps) {
  const chartData = trends.map((week) => ({
    week: week.weekLabel,
    'Rep Score': week.avgRepScoreOverall || 0,
    'AI Score': week.avgAiScoreOverall || 0,
  }));

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(value) => (value as number).toFixed(1)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Rep Score"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="AI Score"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SPINDistributionChartProps {
  trends: WeeklyTrend[];
}

export function SPINDistributionChart({ trends }: SPINDistributionChartProps) {
  const chartData = trends.map((week) => ({
    week: week.weekLabel,
    Situation: week.avgSituationQuestions,
    Problem: week.avgProblemQuestions,
    Implication: week.avgImplicationQuestions,
    'Need-Payoff': week.avgNeedPayoffQuestions,
  }));

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">
        SPIN Questions Distribution
      </h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(value) => (value as number).toFixed(1)} />
          <Legend />
          <Bar dataKey="Situation" stackId="a" fill="#60A5FA" />
          <Bar dataKey="Problem" stackId="a" fill="#F59E0B" />
          <Bar dataKey="Implication" stackId="a" fill="#EF4444" />
          <Bar dataKey="Need-Payoff" stackId="a" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ChallengerInsightChartProps {
  trends: WeeklyTrend[];
}

export function ChallengerInsightChart({ trends }: ChallengerInsightChartProps) {
  const chartData = trends.map((week) => ({
    week: week.weekLabel,
    Challenges: week.avgChallenges,
    'Data Points': week.avgDataPoints,
    Insights: week.avgInsights,
  }));

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">
        Challenger & Insight Metrics
      </h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(value) => (value as number).toFixed(1)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Challenges"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="Data Points"
            stroke="#EC4899"
            strokeWidth={2}
            dot={{ fill: '#EC4899', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="Insights"
            stroke="#06B6D4"
            strokeWidth={2}
            dot={{ fill: '#06B6D4', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CallVolumeChartProps {
  trends: WeeklyTrend[];
}

export function CallVolumeChart({ trends }: CallVolumeChartProps) {
  const chartData = trends.map((week) => ({
    week: week.weekLabel,
    Calls: week.totalCalls,
  }));

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">Weekly Call Volume</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="Calls" fill="#6366F1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface RepComparisonChartProps {
  reps: RepData[];
  metric: 'avgAiScoreOverall' | 'avgRepScoreOverall' | 'totalCalls' | 'avgChallenges' | 'avgInsights';
  title: string;
}

export function RepComparisonChart({ reps, metric, title }: RepComparisonChartProps) {
  // Build comparison data from weekly trends
  const allWeeks = new Set<string>();
  reps.forEach((rep) => {
    rep.weeklyTrends.forEach((w) => allWeeks.add(w.weekLabel));
  });

  const chartData = Array.from(allWeeks)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map((week) => {
      const entry: Record<string, string | number> = { week };
      reps.forEach((rep) => {
        const weekData = rep.weeklyTrends.find((w) => w.weekLabel === week);
        if (weekData) {
          if (metric === 'totalCalls') {
            entry[rep.repName] = weekData.totalCalls;
          } else if (metric === 'avgChallenges') {
            // Combine challenges + data points for Challenger methodology
            entry[rep.repName] = (weekData.avgChallenges || 0) + (weekData.avgDataPoints || 0);
          } else if (metric === 'avgInsights') {
            entry[rep.repName] = weekData.avgInsights || 0;
          } else {
            entry[rep.repName] = weekData[metric] || 0;
          }
        } else {
          entry[rep.repName] = 0;
        }
      });
      return entry;
    });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis
            domain={metric.includes('Score') ? [0, 10] : undefined}
            tick={{ fontSize: 10 }}
          />
          <Tooltip formatter={(value) => (value as number).toFixed(1)} />
          <Legend />
          {reps.map((rep, index) => (
            <Line
              key={rep.repId}
              type="monotone"
              dataKey={rep.repName}
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

interface ImprovementChartProps {
  trends: WeeklyTrend[];
}

export function ImprovementChart({ trends }: ImprovementChartProps) {
  if (trends.length < 2) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-4">
          Week-over-Week Improvement
        </h4>
        <p className="text-gray-500 text-sm">
          Need at least 2 weeks of data to show improvement trends.
        </p>
      </div>
    );
  }

  const chartData = trends.slice(1).map((week, index) => {
    const prevWeek = trends[index];
    const aiChange =
      week.avgAiScoreOverall && prevWeek.avgAiScoreOverall
        ? ((week.avgAiScoreOverall - prevWeek.avgAiScoreOverall) /
            prevWeek.avgAiScoreOverall) *
          100
        : 0;
    const repChange =
      week.avgRepScoreOverall && prevWeek.avgRepScoreOverall
        ? ((week.avgRepScoreOverall - prevWeek.avgRepScoreOverall) /
            prevWeek.avgRepScoreOverall) *
          100
        : 0;

    return {
      week: week.weekLabel,
      'AI Score Change': aiChange,
      'Rep Score Change': repChange,
    };
  });

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">
        Week-over-Week Improvement (%)
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
          <Legend />
          <Bar dataKey="AI Score Change" fill="#10B981" />
          <Bar dataKey="Rep Score Change" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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

// Calculate CBE from weekly averages
// CBE = (P×2 + I×4 + N×3 + Ch×2 + D×1 + In×2 - situationPenalty) / 30 × 100
function calculateWeeklyCBE(week: WeeklyTrend): number {
  const p = week.avgProblemQuestions || 0;
  const i = week.avgImplicationQuestions || 0;
  const n = week.avgNeedPayoffQuestions || 0;
  const ch = week.avgChallenges || 0;
  const d = week.avgDataPoints || 0;
  const ins = week.avgInsights || 0;
  const s = week.avgSituationQuestions || 0;

  const positives = (p * 2) + (i * 4) + (n * 3) + (ch * 2) + (d * 1) + (ins * 2);
  const situationPenalty = Math.max(0, s - 5) * 0.5;
  const duration = 30; // Default duration

  return Math.round(((positives - situationPenalty) / duration) * 100);
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

interface CBETrendChartProps {
  trends: WeeklyTrend[];
}

export function CBETrendChart({ trends }: CBETrendChartProps) {
  const chartData = trends.map((week, index) => {
    const cbe = calculateWeeklyCBE(week);
    const prevCBE = index > 0 ? calculateWeeklyCBE(trends[index - 1]) : cbe;
    const change = index > 0 && prevCBE > 0 ? ((cbe - prevCBE) / prevCBE * 100) : 0;

    return {
      week: week.weekLabel,
      CBE: cbe,
      'Target (+1%)': index > 0 ? Math.round(prevCBE * 1.01) : cbe,
      change: change,
    };
  });

  // Calculate if meeting 1% improvement goal
  const latestChange = chartData.length > 1 ? chartData[chartData.length - 1].change : 0;
  const meetingGoal = latestChange >= 1;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium text-gray-700">CBE Trend (Career Best Effort)</h4>
        {chartData.length > 1 && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${meetingGoal ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {latestChange >= 0 ? '+' : ''}{latestChange.toFixed(1)}% WoW
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'change') return `${(value as number).toFixed(1)}%`;
              return value;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="CBE"
            stroke="#8B5CF6"
            strokeWidth={3}
            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Target (+1%)"
            stroke="#D1D5DB"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Goal: Improve 1% each week (Pat Riley&apos;s Career Best Effort system)
      </p>
    </div>
  );
}

interface SPINDistributionChartProps {
  trends: WeeklyTrend[];
}

export function SPINDistributionChart({ trends }: SPINDistributionChartProps) {
  const chartData = trends.map((week) => {
    const total = week.avgSituationQuestions + week.avgProblemQuestions +
                  week.avgImplicationQuestions + week.avgNeedPayoffQuestions;
    return {
      week: week.weekLabel,
      'S %': total > 0 ? (week.avgSituationQuestions / total) * 100 : 0,
      'P %': total > 0 ? (week.avgProblemQuestions / total) * 100 : 0,
      'I %': total > 0 ? (week.avgImplicationQuestions / total) * 100 : 0,
      'N %': total > 0 ? (week.avgNeedPayoffQuestions / total) * 100 : 0,
      // Keep raw numbers for tooltip
      sRaw: week.avgSituationQuestions,
      pRaw: week.avgProblemQuestions,
      iRaw: week.avgImplicationQuestions,
      nRaw: week.avgNeedPayoffQuestions,
    };
  });

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">
          SPIN Ratio Distribution
        </h4>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span> S
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span> P
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> I
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> N
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <Tooltip
            formatter={(value, name, props) => {
              if (typeof value !== 'number') return ['-', String(name)];
              const rawKey = name === 'S %' ? 'sRaw' : name === 'P %' ? 'pRaw' : name === 'I %' ? 'iRaw' : 'nRaw';
              const rawValue = props.payload[rawKey] as number;
              return [`${value.toFixed(0)}% (${rawValue.toFixed(1)} avg)`, String(name).replace(' %', '')];
            }}
          />
          <Bar dataKey="S %" stackId="a" fill="#60A5FA" name="S %" />
          <Bar dataKey="P %" stackId="a" fill="#F59E0B" name="P %" />
          <Bar dataKey="I %" stackId="a" fill="#EF4444" name="I %" />
          <Bar dataKey="N %" stackId="a" fill="#10B981" name="N %" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Goal: Reduce S%, increase I% and N% over time
      </p>
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

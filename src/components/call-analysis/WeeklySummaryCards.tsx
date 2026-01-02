'use client';

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

interface Totals {
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

interface WeeklySummaryCardsProps {
  weeklyTrends: WeeklyTrend[];
  totals: Totals;
  repName: string;
}

function calculateChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) return null;

  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 1;

  return (
    <span
      className={`inline-flex items-center text-xs font-medium ${
        isNeutral
          ? 'text-gray-500'
          : isPositive
          ? 'text-green-600'
          : 'text-red-600'
      }`}
    >
      {!isNeutral && (
        <svg
          className={`w-3 h-3 mr-0.5 ${isPositive ? '' : 'rotate-180'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {change > 0 ? '+' : ''}
      {change.toFixed(1)}%
    </span>
  );
}

export function WeeklySummaryCards({
  weeklyTrends,
  totals,
  repName,
}: WeeklySummaryCardsProps) {
  const currentWeek = weeklyTrends[weeklyTrends.length - 1];
  const previousWeek =
    weeklyTrends.length > 1 ? weeklyTrends[weeklyTrends.length - 2] : null;

  const aiScoreChange = calculateChange(
    currentWeek?.avgAiScoreOverall || null,
    previousWeek?.avgAiScoreOverall || null
  );

  const repScoreChange = calculateChange(
    currentWeek?.avgRepScoreOverall || null,
    previousWeek?.avgRepScoreOverall || null
  );

  const callsChange = calculateChange(
    currentWeek?.totalCalls || null,
    previousWeek?.totalCalls || null
  );

  const totalSPINCurrent = currentWeek
    ? currentWeek.avgSituationQuestions +
      currentWeek.avgProblemQuestions +
      currentWeek.avgImplicationQuestions +
      currentWeek.avgNeedPayoffQuestions
    : 0;

  const totalSPINPrevious = previousWeek
    ? previousWeek.avgSituationQuestions +
      previousWeek.avgProblemQuestions +
      previousWeek.avgImplicationQuestions +
      previousWeek.avgNeedPayoffQuestions
    : null;

  const spinChange = calculateChange(totalSPINCurrent, totalSPINPrevious);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-500">
        {repName} - {currentWeek?.weekLabel || 'Summary'}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Calls This Week */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-gray-500 uppercase">
              Calls This Week
            </div>
            <ChangeIndicator change={callsChange} />
          </div>
          <div className="mt-2 text-3xl font-bold text-indigo-600">
            {currentWeek?.totalCalls || 0}
          </div>
          <div className="text-xs text-gray-400">
            Total: {totals.totalCalls} calls
          </div>
        </div>

        {/* Average AI Score */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-gray-500 uppercase">
              Avg AI Score
            </div>
            <ChangeIndicator change={aiScoreChange} />
          </div>
          <div
            className={`mt-2 text-3xl font-bold ${
              (currentWeek?.avgAiScoreOverall || 0) >= 7
                ? 'text-green-600'
                : (currentWeek?.avgAiScoreOverall || 0) >= 5
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {currentWeek?.avgAiScoreOverall?.toFixed(1) || '-'}
          </div>
          <div className="text-xs text-gray-400">
            Overall: {totals.avgAiScoreOverall?.toFixed(1) || '-'}
          </div>
        </div>

        {/* Average Rep Score */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-gray-500 uppercase">
              Avg Rep Score
            </div>
            <ChangeIndicator change={repScoreChange} />
          </div>
          <div
            className={`mt-2 text-3xl font-bold ${
              (currentWeek?.avgRepScoreOverall || 0) >= 7
                ? 'text-green-600'
                : (currentWeek?.avgRepScoreOverall || 0) >= 5
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {currentWeek?.avgRepScoreOverall?.toFixed(1) || '-'}
          </div>
          <div className="text-xs text-gray-400">
            Overall: {totals.avgRepScoreOverall?.toFixed(1) || '-'}
          </div>
        </div>

        {/* SPIN Questions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-gray-500 uppercase">
              Avg SPIN/Call
            </div>
            <ChangeIndicator change={spinChange} />
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {totalSPINCurrent.toFixed(1)}
          </div>
          <div className="text-xs text-gray-400">
            S:{currentWeek?.avgSituationQuestions.toFixed(0) || 0} P:
            {currentWeek?.avgProblemQuestions.toFixed(0) || 0} I:
            {currentWeek?.avgImplicationQuestions.toFixed(0) || 0} N:
            {currentWeek?.avgNeedPayoffQuestions.toFixed(0) || 0}
          </div>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Challenges */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-xs font-medium text-purple-700 uppercase">
            Avg Challenges
          </div>
          <div className="text-xl font-bold text-purple-800">
            {currentWeek?.avgChallenges.toFixed(1) || '0'}
          </div>
        </div>

        {/* Data Points */}
        <div className="bg-pink-50 rounded-lg p-3">
          <div className="text-xs font-medium text-pink-700 uppercase">
            Avg Data Points
          </div>
          <div className="text-xl font-bold text-pink-800">
            {currentWeek?.avgDataPoints.toFixed(1) || '0'}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-cyan-50 rounded-lg p-3">
          <div className="text-xs font-medium text-cyan-700 uppercase">
            Avg Insights
          </div>
          <div className="text-xl font-bold text-cyan-800">
            {currentWeek?.avgInsights.toFixed(1) || '0'}
          </div>
        </div>
      </div>
    </div>
  );
}

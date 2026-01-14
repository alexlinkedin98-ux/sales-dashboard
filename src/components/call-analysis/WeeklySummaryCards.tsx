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

// Calculate SPIN Score (1-10) based on question balance
function calculateSPINScore(s: number, p: number, i: number, n: number): number {
  const total = s + p + i + n;
  if (total === 0) return 0;

  const sPercent = (s / total) * 100;
  const pPercent = (p / total) * 100;
  const iPercent = (i / total) * 100;
  const nPercent = (n / total) * 100;

  let score = 5;

  // Situation questions penalty
  if (sPercent > 60) score -= 3;
  else if (sPercent > 50) score -= 2.5;
  else if (sPercent > 40) score -= 2;
  else if (sPercent > 30) score -= 1;
  else if (sPercent <= 15) score += 1;

  // Implication questions bonus (most important)
  if (iPercent >= 25) score += 2;
  else if (iPercent >= 15) score += 1.5;
  else if (iPercent >= 10) score += 1;
  else if (iPercent === 0) score -= 1.5;

  // Need-Payoff questions bonus
  if (nPercent >= 20) score += 2;
  else if (nPercent >= 10) score += 1.5;
  else if (nPercent >= 5) score += 1;
  else if (nPercent === 0) score -= 1;

  // Problem questions
  if (pPercent >= 15 && pPercent <= 35) score += 0.5;
  else if (pPercent === 0) score -= 0.5;

  return Math.min(10, Math.max(1, Math.round(score)));
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

  const spinScoreCurrent = currentWeek
    ? calculateSPINScore(
        currentWeek.avgSituationQuestions,
        currentWeek.avgProblemQuestions,
        currentWeek.avgImplicationQuestions,
        currentWeek.avgNeedPayoffQuestions
      )
    : 0;

  const spinScorePrevious = previousWeek
    ? calculateSPINScore(
        previousWeek.avgSituationQuestions,
        previousWeek.avgProblemQuestions,
        previousWeek.avgImplicationQuestions,
        previousWeek.avgNeedPayoffQuestions
      )
    : null;

  const spinChange = calculateChange(spinScoreCurrent, spinScorePrevious);

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

        {/* SPIN Score */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-gray-500 uppercase">
                SPIN Score
              </span>
              <div className="group relative">
                <svg
                  className="w-3.5 h-3.5 text-gray-400 cursor-help"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                  <p className="font-semibold mb-1">SPIN Score Formula:</p>
                  <p className="mb-1">Score based on question type balance (1-10 scale)</p>
                  <p className="text-gray-300 text-[10px]">
                    • Situation &lt;15%: +1 | &gt;30%: penalty up to -3<br/>
                    • Problem 15-35%: +0.5<br/>
                    • Implication ≥25%: +2 (most important)<br/>
                    • Need-Payoff ≥20%: +2
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <ChangeIndicator change={spinChange} />
          </div>
          <div
            className={`mt-2 text-3xl font-bold ${
              spinScoreCurrent >= 7
                ? 'text-green-600'
                : spinScoreCurrent >= 5
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {spinScoreCurrent}/10
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

'use client';

import { format } from 'date-fns';

interface CallDetail {
  id: string;
  callDate: Date | string;
  callLabel: string;
  transcript?: string | null;
  situationQuestions: number;
  problemQuestions: number;
  implicationQuestions: number;
  needPayoffQuestions: number;
  challengesPresented: number;
  dataPointsShared: number;
  insightsShared: number;
  aiScoreSpin?: number | null;
  aiScoreChallenger?: number | null;
  aiScoreInsight?: number | null;
  aiScoreOverall?: number | null;
  aiFeedback?: string | null;
  repScoreSpin?: number | null;
  repScoreChallenger?: number | null;
  repScoreInsight?: number | null;
  repScoreOverall?: number | null;
  repNotes?: string | null;
  callDuration?: number | null;
  outcome?: string | null;
}

interface CallDetailModalProps {
  call: CallDetail;
  repName: string;
  onClose: () => void;
}

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  won: { label: 'Won', color: 'bg-green-100 text-green-800' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-800' },
};

function ScoreComparison({
  label,
  repScore,
  aiScore,
}: {
  label: string;
  repScore: number | null | undefined;
  aiScore: number | null | undefined;
}) {
  const diff =
    repScore !== null &&
    repScore !== undefined &&
    aiScore !== null &&
    aiScore !== undefined
      ? repScore - aiScore
      : null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-xs text-gray-400">You</div>
          <div
            className={`text-lg font-bold ${
              repScore !== null && repScore !== undefined
                ? repScore >= 7
                  ? 'text-green-600'
                  : repScore >= 5
                  ? 'text-yellow-600'
                  : 'text-red-600'
                : 'text-gray-400'
            }`}
          >
            {repScore !== null && repScore !== undefined ? repScore : '-'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">AI</div>
          <div
            className={`text-lg font-bold ${
              aiScore !== null && aiScore !== undefined
                ? aiScore >= 7
                  ? 'text-green-600'
                  : aiScore >= 5
                  ? 'text-yellow-600'
                  : 'text-red-600'
                : 'text-gray-400'
            }`}
          >
            {aiScore !== null && aiScore !== undefined
              ? aiScore.toFixed(1)
              : '-'}
          </div>
        </div>
        {diff !== null && (
          <div
            className={`text-xs font-medium px-2 py-1 rounded ${
              Math.abs(diff) < 1
                ? 'bg-gray-100 text-gray-600'
                : diff > 0
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {diff > 0 ? '+' : ''}
            {diff.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}

export function CallDetailModal({ call, repName, onClose }: CallDetailModalProps) {
  const callDate =
    typeof call.callDate === 'string' ? new Date(call.callDate) : call.callDate;
  const outcomeInfo = call.outcome ? OUTCOME_LABELS[call.outcome] : null;

  const totalSPIN =
    call.situationQuestions +
    call.problemQuestions +
    call.implicationQuestions +
    call.needPayoffQuestions;

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {call.callLabel}
              </h2>
              <p className="text-sm text-gray-500">
                {repName} - {format(callDate, 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {outcomeInfo && (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${outcomeInfo.color}`}
                >
                  {outcomeInfo.label}
                </span>
              )}
              {call.callDuration && (
                <span className="text-sm text-gray-500">
                  {call.callDuration} min
                </span>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Counts */}
            <div className="space-y-6">
              {/* SPIN Questions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  SPIN Questions ({totalSPIN} total)
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {call.situationQuestions}
                    </div>
                    <div className="text-xs text-gray-500">Situation</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {call.problemQuestions}
                    </div>
                    <div className="text-xs text-gray-500">Problem</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {call.implicationQuestions}
                    </div>
                    <div className="text-xs text-gray-500">Implication</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {call.needPayoffQuestions}
                    </div>
                    <div className="text-xs text-gray-500">Need-Payoff</div>
                  </div>
                </div>
              </div>

              {/* Challenger & Insight */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Challenger Sale & Insight Selling
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {call.challengesPresented}
                    </div>
                    <div className="text-xs text-gray-500">Challenges</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600">
                      {call.dataPointsShared}
                    </div>
                    <div className="text-xs text-gray-500">Data Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-600">
                      {call.insightsShared}
                    </div>
                    <div className="text-xs text-gray-500">Insights</div>
                  </div>
                </div>
              </div>

              {/* Rep Notes */}
              {call.repNotes && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Rep Notes
                  </h3>
                  <p className="text-sm text-gray-700">{call.repNotes}</p>
                </div>
              )}
            </div>

            {/* Right Column: Scores */}
            <div className="space-y-6">
              {/* Score Comparison */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Score Comparison (1-10)
                </h3>
                <div className="space-y-1">
                  <ScoreComparison
                    label="SPIN"
                    repScore={call.repScoreSpin}
                    aiScore={call.aiScoreSpin}
                  />
                  <ScoreComparison
                    label="Challenger"
                    repScore={call.repScoreChallenger}
                    aiScore={call.aiScoreChallenger}
                  />
                  <ScoreComparison
                    label="Insight"
                    repScore={call.repScoreInsight}
                    aiScore={call.aiScoreInsight}
                  />
                  <ScoreComparison
                    label="Overall"
                    repScore={call.repScoreOverall}
                    aiScore={call.aiScoreOverall}
                  />
                </div>
              </div>

              {/* AI Feedback */}
              {call.aiFeedback && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    AI Feedback
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {call.aiFeedback}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transcript */}
          {call.transcript && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Call Transcript
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {call.transcript}
                </pre>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

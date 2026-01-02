'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface CallData {
  id: string;
  callDate: Date | string;
  callLabel: string;
  crmLink?: string | null;
  situationQuestions: number;
  problemQuestions: number;
  implicationQuestions: number;
  needPayoffQuestions: number;
  challengesPresented: number;
  dataPointsShared: number;
  insightsShared: number;
  aiScoreOverall: number | null;
  repScoreOverall: number | null;
  callDuration: number | null;
  outcome: string | null;
}

interface CallAnalysisTableProps {
  calls: CallData[];
  repName: string;
  onView: (call: CallData) => void;
  onEdit: (call: CallData) => void;
  onDelete: (id: string) => void;
}

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  booked: { label: 'Booked', color: 'bg-green-100 text-green-800' },
  follow_up: { label: 'Follow-up', color: 'bg-yellow-100 text-yellow-800' },
  not_interested: { label: 'Not Interested', color: 'bg-red-100 text-red-800' },
  no_show: { label: 'No Show', color: 'bg-gray-100 text-gray-800' },
};

// CBE (Career Best Effort) Score Calculation
// Inspired by Pat Riley's Lakers system from James Clear's article
// Formula: (Positive Behaviors - Negative Indicators) / Call Duration * 100
//
// Weights based on sales methodology research:
// - Implication Questions: 4x weight (Rackham found top performers ask 4x more)
// - Need-Payoff Questions: 3x weight (builds perceived value)
// - Problem Questions: 2x weight (uncovers pain)
// - Challenges Presented: 2x weight (Challenger Sale methodology)
// - Insights Shared: 2x weight (Insight Selling)
// - Data Points: 1x weight (credibility builders)
// - Excess Situation Questions: -0.5x penalty (should be minimal)
function calculateCBE(call: CallData): { score: number; breakdown: string } {
  const {
    situationQuestions: s,
    problemQuestions: p,
    implicationQuestions: i,
    needPayoffQuestions: n,
    challengesPresented,
    dataPointsShared,
    insightsShared,
    callDuration
  } = call;

  // If no duration, use a default of 30 minutes for calculation
  const duration = callDuration || 30;

  // Positive behaviors with weights
  const positives =
    (p * 2) +           // Problem questions (2x)
    (i * 4) +           // Implication questions (4x - most important!)
    (n * 3) +           // Need-Payoff questions (3x)
    (challengesPresented * 2) +  // Challenges (2x)
    (dataPointsShared * 1) +     // Data points (1x)
    (insightsShared * 2);        // Insights (2x)

  // Negative: Penalty for excess Situation questions (more than 5 is too many)
  // Situation questions gather basic info - should be minimal
  const situationPenalty = Math.max(0, s - 5) * 0.5;

  // Calculate raw CBE
  const rawCBE = (positives - situationPenalty) / duration;

  // Scale to a 3-digit number (multiply by 100)
  const scaledCBE = Math.round(rawCBE * 100);

  // Build breakdown string for tooltip
  const breakdown = [
    `P×2: ${p * 2}`,
    `I×4: ${i * 4}`,
    `N×3: ${n * 3}`,
    `Ch×2: ${challengesPresented * 2}`,
    `D×1: ${dataPointsShared}`,
    `In×2: ${insightsShared * 2}`,
    situationPenalty > 0 ? `S penalty: -${situationPenalty.toFixed(1)}` : null,
    `÷ ${duration}min`,
  ].filter(Boolean).join(' | ');

  return { score: scaledCBE, breakdown };
}

// Get CBE color based on score
function getCBEColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 50) return 'text-blue-600 bg-blue-50';
  if (score >= 30) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

// SPIN Ratio Score calculation based on Rackham's research
function calculateSPINRatio(s: number, p: number, i: number, n: number): number {
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

// Calculate average CBE for trend comparison
export function calculateAverageCBE(calls: CallData[]): number {
  if (calls.length === 0) return 0;
  const total = calls.reduce((sum, call) => sum + calculateCBE(call).score, 0);
  return Math.round(total / calls.length);
}

export function CallAnalysisTable({
  calls,
  repName,
  onView,
  onEdit,
  onDelete,
}: CallAnalysisTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/call-analysis/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(id);
      }
    } catch (error) {
      console.error('Error deleting call:', error);
    }
    setDeleteConfirm(null);
  };

  // Calculate average CBE for comparison
  const avgCBE = calculateAverageCBE(calls);

  if (calls.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No call analyses recorded for {repName} yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* CBE Legend/Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Career Best Effort (CBE)</h3>
            <p className="text-xs text-gray-600 mt-1">
              Weighted score based on SPIN, Challenger & Insight methodologies. Goal: improve 1% each week.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{avgCBE}</div>
            <div className="text-xs text-gray-500">Avg CBE</div>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> 80+ Excellent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 50-79 Good
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span> 30-49 Developing
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> &lt;30 Needs Work
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Call
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                CBE
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                vs Avg
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                SPIN
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                SPIN Ratio
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rep Score
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                AI Score
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calls.map((call) => {
              const callDate =
                typeof call.callDate === 'string'
                  ? new Date(call.callDate)
                  : call.callDate;
              const outcomeInfo = call.outcome
                ? OUTCOME_LABELS[call.outcome]
                : null;

              const { score: cbe, breakdown } = calculateCBE(call);
              const cbeColor = getCBEColor(cbe);
              const vsAvg = cbe - avgCBE;
              const vsAvgColor = vsAvg >= 0 ? 'text-green-600' : 'text-red-600';

              return (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {format(callDate, 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{call.callLabel}</span>
                      {call.crmLink && (
                        <a
                          href={call.crmLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800"
                          title="Open in Pipedrive"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      {call.callDuration && (
                        <span className="text-gray-400 text-xs">
                          {call.callDuration}m
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <div
                      className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold ${cbeColor}`}
                      title={breakdown}
                    >
                      {cbe}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-medium ${vsAvgColor}`}>
                      {vsAvg >= 0 ? '+' : ''}{vsAvg}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <div
                      className="text-xs font-mono text-gray-600 cursor-help"
                      title={`Situation: ${call.situationQuestions}, Problem: ${call.problemQuestions}, Implication: ${call.implicationQuestions}, Need-Payoff: ${call.needPayoffQuestions}`}
                    >
                      {call.situationQuestions}/{call.problemQuestions}/{call.implicationQuestions}/{call.needPayoffQuestions}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    {(() => {
                      const spinRatio = calculateSPINRatio(
                        call.situationQuestions,
                        call.problemQuestions,
                        call.implicationQuestions,
                        call.needPayoffQuestions
                      );
                      const spinColor = spinRatio >= 7 ? 'text-green-600' : spinRatio >= 5 ? 'text-blue-600' : spinRatio >= 3 ? 'text-yellow-600' : 'text-red-600';
                      return (
                        <span className={`font-medium ${spinColor}`}>
                          {spinRatio}/10
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    {call.repScoreOverall ? (
                      <span className={`font-medium ${call.repScoreOverall >= 7 ? 'text-green-600' : call.repScoreOverall >= 5 ? 'text-blue-600' : 'text-yellow-600'}`}>
                        {call.repScoreOverall.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    {call.aiScoreOverall ? (
                      <span className={`font-medium ${call.aiScoreOverall >= 7 ? 'text-green-600' : call.aiScoreOverall >= 5 ? 'text-blue-600' : 'text-yellow-600'}`}>
                        {call.aiScoreOverall.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    {outcomeInfo ? (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${outcomeInfo.color}`}
                      >
                        {outcomeInfo.label}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onView(call)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View details"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => onEdit(call)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Edit"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      {deleteConfirm === call.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(call.id)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(call.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

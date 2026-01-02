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

// SPIN Ratio visualization component
// Based on Neil Rackham's research:
// - Top performers ask 4x more Implication questions than average
// - Situation questions should be minimized (only ask what's necessary)
// - Implication & Need-Payoff questions build perceived value and are most important
function SPINRatioBar({ s, p, i, n }: { s: number; p: number; i: number; n: number }) {
  const total = s + p + i + n;
  if (total === 0) return <span className="text-gray-400">-</span>;

  const sPercent = (s / total) * 100;
  const pPercent = (p / total) * 100;
  const iPercent = (i / total) * 100;
  const nPercent = (n / total) * 100;

  // SPIN Ratio Score calculation based on Rackham's research:
  // - Penalize heavily for too many Situation questions (should be minimal)
  // - Reward for Implication questions (top performers ask 4x more)
  // - Reward for Need-Payoff questions (builds perceived value)
  // - Problem questions are important but transitional

  let score = 5; // Start at baseline

  // Situation questions penalty (should be <25% ideally, <15% is excellent)
  if (sPercent > 60) score -= 3;
  else if (sPercent > 50) score -= 2.5;
  else if (sPercent > 40) score -= 2;
  else if (sPercent > 30) score -= 1;
  else if (sPercent <= 15) score += 1; // Bonus for keeping S low

  // Implication questions bonus (most important - top performers ask 4x more)
  if (iPercent >= 25) score += 2;
  else if (iPercent >= 15) score += 1.5;
  else if (iPercent >= 10) score += 1;
  else if (iPercent === 0) score -= 1.5; // Penalty for no implication questions

  // Need-Payoff questions bonus (builds perceived value)
  if (nPercent >= 20) score += 2;
  else if (nPercent >= 10) score += 1.5;
  else if (nPercent >= 5) score += 1;
  else if (nPercent === 0) score -= 1; // Penalty for no need-payoff questions

  // Problem questions (moderate importance)
  if (pPercent >= 15 && pPercent <= 35) score += 0.5;
  else if (pPercent === 0) score -= 0.5;

  // Clamp score between 1 and 10
  const ratioScore = Math.min(10, Math.max(1, Math.round(score)));

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex text-xs font-mono text-gray-600">
        {s}/{p}/{i}/{n}
      </div>
      <div className="w-20 h-2 rounded-full overflow-hidden flex bg-gray-200" title={`S:${sPercent.toFixed(0)}% P:${pPercent.toFixed(0)}% I:${iPercent.toFixed(0)}% N:${nPercent.toFixed(0)}%`}>
        <div className="bg-blue-400" style={{ width: `${sPercent}%` }} />
        <div className="bg-yellow-400" style={{ width: `${pPercent}%` }} />
        <div className="bg-red-400" style={{ width: `${iPercent}%` }} />
        <div className="bg-green-400" style={{ width: `${nPercent}%` }} />
      </div>
      <div className={`text-xs font-medium ${
        ratioScore >= 7 ? 'text-green-600' : ratioScore >= 5 ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {ratioScore}/10
      </div>
    </div>
  );
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

  if (calls.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No call analyses recorded for {repName} yet.
      </div>
    );
  }

  return (
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
              SPIN Ratio
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Challenger
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Insights
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
                      <span className="text-gray-400">
                        ({call.callDuration}m)
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                  <SPINRatioBar
                    s={call.situationQuestions}
                    p={call.problemQuestions}
                    i={call.implicationQuestions}
                    n={call.needPayoffQuestions}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                  <span className="font-mono">
                    {call.challengesPresented}c / {call.dataPointsShared}d
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                  {call.insightsShared}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                  {call.repScoreOverall !== null ? (
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium ${
                        call.repScoreOverall >= 7
                          ? 'bg-green-100 text-green-800'
                          : call.repScoreOverall >= 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {call.repScoreOverall}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                  {call.aiScoreOverall !== null ? (
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium ${
                        call.aiScoreOverall >= 7
                          ? 'bg-green-100 text-green-800'
                          : call.aiScoreOverall >= 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
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
  );
}

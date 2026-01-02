'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface CallData {
  id: string;
  callDate: Date | string;
  callLabel: string;
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
              SPIN (S/P/I/N)
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
                  {call.callLabel}
                  {call.callDuration && (
                    <span className="text-gray-400 ml-1">
                      ({call.callDuration}m)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                  <span className="font-mono text-gray-700">
                    {call.situationQuestions}/{call.problemQuestions}/
                    {call.implicationQuestions}/{call.needPayoffQuestions}
                  </span>
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

'use client';

import { QuarterlySummary as QuarterlySummaryType } from '@/lib/types';

interface QuarterlySummaryProps {
  summaries: QuarterlySummaryType[];
  repName: string;
}

export function QuarterlySummaryTable({ summaries, repName }: QuarterlySummaryProps) {
  if (summaries.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No quarterly data available for {repName}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quarter
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Calls Scheduled
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Calls Taken
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Show Up Rate
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Audited
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Proposals
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Closed
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Close Rate
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total MRR
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {summaries.map((quarter, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                {quarter.quarter}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                {quarter.totalCallsScheduled}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                {quarter.totalCallsTaken}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span
                  className={
                    quarter.showUpRate >= 75
                      ? 'text-green-600'
                      : quarter.showUpRate >= 50
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }
                >
                  {formatPercent(quarter.showUpRate)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                {quarter.totalAccountsAudited}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                {quarter.totalProposals}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">
                {quarter.totalClosed}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span
                  className={
                    quarter.closeRate >= 50
                      ? 'text-green-600'
                      : quarter.closeRate >= 30
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }
                >
                  {formatPercent(quarter.closeRate)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center font-bold">
                {formatCurrency(quarter.totalMRR)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

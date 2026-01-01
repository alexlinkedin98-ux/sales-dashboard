'use client';

import { WeeklyData } from '@/lib/types';

interface WeeklyTableProps {
  data: WeeklyData[];
  repName: string;
}

export function WeeklyTable({ data, repName }: WeeklyTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No weekly data available for {repName}
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
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Week
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Calls Scheduled
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Calls Taken
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Show Up Rate
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Accept. Rate
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Audited
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Proposals
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Closed
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Close Rate
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              MRR
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              MRR/Call
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              MRR/Audit
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              MRR/Sale
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((week, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                {week.week}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                {week.introCallsScheduled}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                {week.introCallsTaken}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                <span className={week.showUpRate >= 75 ? 'text-green-600' : week.showUpRate >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                  {formatPercent(week.showUpRate)}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                {formatPercent(week.acceptanceQualityRate)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                {week.accountsAudited}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                {week.proposalsPitched}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center font-semibold">
                {week.dealsClosed}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                <span className={week.closeRate >= 50 ? 'text-green-600' : week.closeRate >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                  {formatPercent(week.closeRate)}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">
                {formatCurrency(week.thisMonthMRR)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                {formatCurrency(week.mrrPerCallTaken)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                {formatCurrency(week.mrrPerAudit)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                {formatCurrency(week.mrrPerSales)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { MonthlySummary, QuarterlySummary } from '@/lib/types';

interface SummaryCardsProps {
  summary: MonthlySummary | QuarterlySummary;
  title: string;
  previousSummary?: MonthlySummary | QuarterlySummary | null;
}

// Calculate percentage change between two values
function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function SummaryCards({ summary, title, previousSummary }: SummaryCardsProps) {
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

  const cards = [
    {
      label: 'Total Calls Scheduled',
      value: summary.totalCallsScheduled,
      prevValue: previousSummary?.totalCallsScheduled,
      format: 'number',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Total Calls Taken',
      value: summary.totalCallsTaken,
      prevValue: previousSummary?.totalCallsTaken,
      format: 'number',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Show Up Rate',
      value: summary.showUpRate,
      prevValue: previousSummary?.showUpRate,
      format: 'percent',
      color: summary.showUpRate >= 75 ? 'bg-green-50 border-green-200' : summary.showUpRate >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200',
      isRate: true,
    },
    {
      label: 'Acceptance Rate',
      value: summary.acceptanceQualityRate,
      prevValue: previousSummary?.acceptanceQualityRate,
      format: 'percent',
      color: 'bg-purple-50 border-purple-200',
      isRate: true,
    },
    {
      label: 'Accounts Audited',
      value: summary.totalAccountsAudited,
      prevValue: previousSummary?.totalAccountsAudited,
      format: 'number',
      color: 'bg-indigo-50 border-indigo-200',
    },
    {
      label: 'Total Proposals',
      value: summary.totalProposals,
      prevValue: previousSummary?.totalProposals,
      format: 'number',
      color: 'bg-orange-50 border-orange-200',
    },
    {
      label: 'Deals Closed',
      value: summary.totalClosed,
      prevValue: previousSummary?.totalClosed,
      format: 'number',
      color: 'bg-green-50 border-green-200',
    },
    {
      label: 'Close Rate',
      value: summary.closeRate,
      prevValue: previousSummary?.closeRate,
      format: 'percent',
      color: summary.closeRate >= 50 ? 'bg-green-50 border-green-200' : summary.closeRate >= 30 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200',
      isRate: true,
    },
    {
      label: 'Total MRR',
      value: summary.totalMRR,
      prevValue: previousSummary?.totalMRR,
      format: 'currency',
      color: 'bg-emerald-50 border-emerald-200',
    },
    {
      label: 'MRR per Call',
      value: summary.mrrPerCallTaken,
      prevValue: previousSummary?.mrrPerCallTaken,
      format: 'currency',
      color: 'bg-teal-50 border-teal-200',
    },
    {
      label: 'MRR per Audit',
      value: summary.mrrPerAudit,
      prevValue: previousSummary?.mrrPerAudit,
      format: 'currency',
      color: 'bg-cyan-50 border-cyan-200',
    },
    {
      label: 'MRR per Sale',
      value: summary.mrrPerSales,
      prevValue: previousSummary?.mrrPerSales,
      format: 'currency',
      color: 'bg-sky-50 border-sky-200',
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {cards.map((card, index) => {
          // Calculate change if previous value exists
          const change = card.prevValue !== undefined ? calcChange(card.value, card.prevValue) : null;
          const showChange = change !== null && previousSummary;

          return (
            <div
              key={index}
              className={`${card.color} border rounded-lg p-4 transition-shadow hover:shadow-md`}
            >
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {card.label}
              </div>
              <div className="text-xl font-bold text-gray-900">
                {card.format === 'currency'
                  ? formatCurrency(card.value)
                  : card.format === 'percent'
                  ? formatPercent(card.value)
                  : card.value}
              </div>
              {showChange && (
                <div className={`text-xs mt-1 font-medium flex items-center gap-1 ${
                  change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {change > 0 ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : change < 0 ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : null}
                  <span>{Math.abs(change).toFixed(1)}% vs prev</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

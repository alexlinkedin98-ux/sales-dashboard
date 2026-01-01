'use client';

import { MonthlySummary, QuarterlySummary } from '@/lib/types';

interface SummaryCardsProps {
  summary: MonthlySummary | QuarterlySummary;
  title: string;
}

export function SummaryCards({ summary, title }: SummaryCardsProps) {
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
      format: 'number',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Total Calls Taken',
      value: summary.totalCallsTaken,
      format: 'number',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Show Up Rate',
      value: summary.showUpRate,
      format: 'percent',
      color: summary.showUpRate >= 75 ? 'bg-green-50 border-green-200' : summary.showUpRate >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200',
    },
    {
      label: 'Acceptance Rate',
      value: summary.acceptanceQualityRate,
      format: 'percent',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      label: 'Accounts Audited',
      value: summary.totalAccountsAudited,
      format: 'number',
      color: 'bg-indigo-50 border-indigo-200',
    },
    {
      label: 'Total Proposals',
      value: summary.totalProposals,
      format: 'number',
      color: 'bg-orange-50 border-orange-200',
    },
    {
      label: 'Deals Closed',
      value: summary.totalClosed,
      format: 'number',
      color: 'bg-green-50 border-green-200',
    },
    {
      label: 'Close Rate',
      value: summary.closeRate,
      format: 'percent',
      color: summary.closeRate >= 50 ? 'bg-green-50 border-green-200' : summary.closeRate >= 30 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200',
    },
    {
      label: 'Total MRR',
      value: summary.totalMRR,
      format: 'currency',
      color: 'bg-emerald-50 border-emerald-200',
    },
    {
      label: 'MRR per Call',
      value: summary.mrrPerCallTaken,
      format: 'currency',
      color: 'bg-teal-50 border-teal-200',
    },
    {
      label: 'MRR per Audit',
      value: summary.mrrPerAudit,
      format: 'currency',
      color: 'bg-cyan-50 border-cyan-200',
    },
    {
      label: 'MRR per Sale',
      value: summary.mrrPerSales,
      format: 'currency',
      color: 'bg-sky-50 border-sky-200',
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {cards.map((card, index) => (
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
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { DashboardData } from '@/lib/types';
import { WeeklyTable } from '@/components/WeeklyTable';
import { SummaryCards } from '@/components/SummaryCards';
import { QuarterlySummaryTable } from '@/components/QuarterlySummary';
import {
  TrendChart,
  ComparisonChart,
  WeeklyComparisonChart,
} from '@/components/Charts';
import { EntryForm } from '@/components/EntryForm';
import { RepManager } from '@/components/RepManager';

type ViewMode = 'weekly' | 'monthly' | 'quarterly' | 'comparison';

interface SalesRep {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Modal states
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showRepManager, setShowRepManager] = useState(false);

  useEffect(() => {
    fetchData();
    fetchReps();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const dashboardData: DashboardData = await response.json();
      setData(dashboardData);

      // Set default selected month to the latest
      if (dashboardData.reps.length > 0 && dashboardData.reps[0].monthlySummaries.length > 0) {
        setSelectedMonth(
          dashboardData.reps[0].monthlySummaries[
            dashboardData.reps[0].monthlySummaries.length - 1
          ].month
        );
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchReps = async () => {
    try {
      const response = await fetch('/api/reps');
      if (response.ok) {
        const data = await response.json();
        setReps(data);
      }
    } catch (err) {
      console.error('Error fetching reps:', err);
    }
  };

  const handleEntrySuccess = () => {
    setShowEntryForm(false);
    fetchData();
  };

  const handleRepUpdate = () => {
    fetchReps();
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no reps exist
  const showEmptyState = !data || data.reps.length === 0;

  const filteredReps = data
    ? selectedRep === 'all'
      ? data.reps
      : data.reps.filter((rep) => rep.name === selectedRep)
    : [];

  const allMonths = data
    ? Array.from(
        new Set(data.reps.flatMap((rep) => rep.monthlySummaries.map((m) => m.month)))
      ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Rep Dashboard</h1>
              {data && (
                <p className="text-sm text-gray-500">
                  Last updated: {new Date(data.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRepManager(true)}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Manage Reps
              </button>
              <button
                onClick={() => setShowEntryForm(true)}
                disabled={reps.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Entry
              </button>
              <button
                onClick={fetchData}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Empty State */}
      {showEmptyState ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No data yet</h2>
            <p className="mt-2 text-gray-600">Get started by adding your sales reps and their weekly entries.</p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => setShowRepManager(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Add Sales Reps
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* Navigation */}
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
                {/* View Mode Tabs */}
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                  {[
                    { key: 'weekly', label: 'Weekly' },
                    { key: 'monthly', label: 'Monthly' },
                    { key: 'quarterly', label: 'Quarterly' },
                    { key: 'comparison', label: 'Comparison' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setViewMode(tab.key as ViewMode)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        viewMode === tab.key
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Rep Selector */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">Sales Rep:</label>
                  <select
                    value={selectedRep}
                    onChange={(e) => setSelectedRep(e.target.value)}
                    className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Reps</option>
                    {data?.reps.map((rep) => (
                      <option key={rep.name} value={rep.name}>
                        {rep.name}
                      </option>
                    ))}
                  </select>

                  {viewMode === 'monthly' && allMonths.length > 0 && (
                    <>
                      <label className="text-sm font-medium text-gray-700 ml-4">Month:</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      >
                        {allMonths.map((month) => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {viewMode === 'weekly' && (
              <div className="space-y-8">
                {filteredReps.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <p className="text-gray-500">No weekly data yet. Add an entry to get started.</p>
                  </div>
                ) : (
                  filteredReps.map((rep) => (
                    <div key={rep.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        {rep.name} - Weekly Data
                      </h2>
                      <WeeklyTable data={rep.weeklyData} repName={rep.name} />
                    </div>
                  ))
                )}
              </div>
            )}

            {viewMode === 'monthly' && (
              <div className="space-y-8">
                {filteredReps.map((rep) => {
                  const monthlySummary = rep.monthlySummaries.find(
                    (m) => m.month === selectedMonth
                  );
                  return (
                    <div
                      key={rep.name}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        {rep.name} - {selectedMonth || 'Monthly Summary'}
                      </h2>
                      {monthlySummary ? (
                        <SummaryCards
                          summary={monthlySummary}
                          title={`Monthly Summary for ${selectedMonth}`}
                        />
                      ) : (
                        <p className="text-gray-500">No data available for this month</p>
                      )}
                    </div>
                  );
                })}

                {/* Monthly Trend Charts */}
                {selectedRep !== 'all' && filteredReps[0] && filteredReps[0].weeklyData.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Weekly Trends for {filteredReps[0].name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <TrendChart
                        data={filteredReps[0].weeklyData}
                        dataKey="dealsClosed"
                        title="Deals Closed"
                        color="#10B981"
                      />
                      <TrendChart
                        data={filteredReps[0].weeklyData}
                        dataKey="thisMonthMRR"
                        title="MRR"
                        color="#3B82F6"
                        format="currency"
                      />
                      <TrendChart
                        data={filteredReps[0].weeklyData}
                        dataKey="closeRate"
                        title="Close Rate"
                        color="#F59E0B"
                        format="percent"
                      />
                      <TrendChart
                        data={filteredReps[0].weeklyData}
                        dataKey="introCallsTaken"
                        title="Calls Taken"
                        color="#8B5CF6"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === 'quarterly' && (
              <div className="space-y-8">
                {filteredReps.map((rep) => (
                  <div
                    key={rep.name}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      {rep.name} - Quarterly Performance
                    </h2>
                    <QuarterlySummaryTable summaries={rep.quarterlySummaries} repName={rep.name} />

                    {rep.quarterlySummaries.length > 0 && (
                      <div className="mt-6">
                        <SummaryCards
                          summary={rep.quarterlySummaries[rep.quarterlySummaries.length - 1]}
                          title={`Latest Quarter: ${
                            rep.quarterlySummaries[rep.quarterlySummaries.length - 1].quarter
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'comparison' && data && data.reps.length > 0 && (
              <div className="space-y-8">
                {/* Rep Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.reps.map((rep) => {
                    const latestMonth =
                      rep.monthlySummaries[rep.monthlySummaries.length - 1];
                    if (!latestMonth) return null;
                    return (
                      <div
                        key={rep.name}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {rep.name}
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            ({latestMonth.month})
                          </span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase">Deals Closed</div>
                            <div className="text-2xl font-bold text-blue-700">
                              {latestMonth.totalClosed}
                            </div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase">Total MRR</div>
                            <div className="text-2xl font-bold text-green-700">
                              ${latestMonth.totalMRR.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase">Close Rate</div>
                            <div className="text-2xl font-bold text-purple-700">
                              {latestMonth.closeRate.toFixed(1)}%
                            </div>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase">Calls Taken</div>
                            <div className="text-2xl font-bold text-orange-700">
                              {latestMonth.totalCallsTaken}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comparison Charts */}
                {data.reps.some(r => r.monthlySummaries.length > 0) && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Side-by-Side Comparison
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ComparisonChart
                        reps={data.reps}
                        dataKey="totalMRR"
                        title="Monthly MRR Comparison"
                        format="currency"
                      />
                      <ComparisonChart
                        reps={data.reps}
                        dataKey="totalClosed"
                        title="Deals Closed Comparison"
                      />
                      <WeeklyComparisonChart
                        reps={data.reps}
                        dataKey="closeRate"
                        title="Close Rate Trend"
                        format="percent"
                      />
                      <WeeklyComparisonChart
                        reps={data.reps}
                        dataKey="introCallsTaken"
                        title="Calls Taken Trend"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Sales Rep Reporting Dashboard
          </p>
        </div>
      </footer>

      {/* Modals */}
      {showEntryForm && (
        <EntryForm
          reps={reps}
          onSuccess={handleEntrySuccess}
          onCancel={() => setShowEntryForm(false)}
        />
      )}

      {showRepManager && (
        <RepManager
          reps={reps}
          onUpdate={handleRepUpdate}
          onClose={() => setShowRepManager(false)}
        />
      )}
    </div>
  );
}

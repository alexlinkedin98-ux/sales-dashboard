'use client';

import { useState, useEffect } from 'react';
import { DashboardData, WeeklyData } from '@/lib/types';
import { WeeklyTable } from '@/components/WeeklyTable';
import { SummaryCards } from '@/components/SummaryCards';
import { QuarterlySummaryTable } from '@/components/QuarterlySummary';
import {
  TrendChart,
  ComparisonChart,
} from '@/components/Charts';
import { EntryForm } from '@/components/EntryForm';
import { RepManager } from '@/components/RepManager';
import { ChangeHistory } from '@/components/ChangeHistory';

type ViewMode = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'comparison';

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
  const [compareReps, setCompareReps] = useState<Set<string>>(new Set());
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

  // Modal states
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showRepManager, setShowRepManager] = useState(false);
  const [editEntry, setEditEntry] = useState<{
    id: string;
    salesRepId: string;
    weekStartDate: string;
    introCallsScheduled: number;
    introCallsTaken: number;
    accountsAudited: number;
    proposalsPitched: number;
    dealsClosed: number;
    mrr: number;
  } | null>(null);

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
      // Initialize compareReps with reps that have data
      const repsWithData = dashboardData.reps
        .filter(rep => rep.monthlySummaries.length > 0)
        .map(rep => rep.name);
      setCompareReps(new Set(repsWithData));

      // Initialize date range to full year (or all available data)
      const allWeekDates = dashboardData.reps.flatMap(r => r.weeklyData.map(w => new Date(w.weekDate)));
      if (allWeekDates.length > 0) {
        const minDate = new Date(Math.min(...allWeekDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allWeekDates.map(d => d.getTime())));
        setDateRangeStart(minDate.toISOString().split('T')[0]);
        setDateRangeEnd(maxDate.toISOString().split('T')[0]);
      }

      // Initialize selected quarter to the latest
      if (dashboardData.reps.length > 0 && dashboardData.reps[0].quarterlySummaries.length > 0) {
        setSelectedQuarter(
          dashboardData.reps[0].quarterlySummaries[
            dashboardData.reps[0].quarterlySummaries.length - 1
          ].quarter
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
    setEditEntry(null);
    fetchData();
  };

  const handleEditEntry = (entry: WeeklyData, repName: string) => {
    // Find the rep ID from the name
    const rep = reps.find(r => r.name === repName);
    if (!rep) return;

    setEditEntry({
      id: entry.id,
      salesRepId: rep.id,
      weekStartDate: new Date(entry.weekDate).toISOString().split('T')[0],
      introCallsScheduled: entry.introCallsScheduled,
      introCallsTaken: entry.introCallsTaken,
      accountsAudited: entry.accountsAudited,
      proposalsPitched: entry.proposalsPitched,
      dealsClosed: entry.dealsClosed,
      mrr: entry.thisMonthMRR,
    });
    setShowEntryForm(true);
  };

  const handleDeleteEntry = () => {
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

  const allQuarters = data
    ? Array.from(
        new Set(data.reps.flatMap((rep) => rep.quarterlySummaries.map((q) => q.quarter)))
      ).sort((a, b) => {
        // Parse quarter strings like "Q3 2025" and sort chronologically
        const parseQuarter = (q: string) => {
          const match = q.match(/Q(\d)\s+(\d{4})/);
          if (!match) return 0;
          return parseInt(match[2]) * 10 + parseInt(match[1]);
        };
        return parseQuarter(a) - parseQuarter(b);
      })
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
              <a
                href="/call-analysis"
                className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Sales Calls
              </a>
              <a
                href="/marketing"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                Marketing
              </a>
              <a
                href="/upsells"
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Upsells
              </a>
              <a
                href="/triage"
                className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Triage
              </a>
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
              <ChangeHistory entityType="WeeklyEntry" onUndo={fetchData} />
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
                    { key: 'annual', label: 'Annual' },
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
                  {viewMode === 'comparison' ? (
                    <>
                      <label className="text-sm font-medium text-gray-900">Compare:</label>
                      <div className="flex items-center gap-3">
                        {data?.reps.map((rep) => (
                          <label key={rep.name} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={compareReps.has(rep.name)}
                              onChange={(e) => {
                                const newSet = new Set(compareReps);
                                if (e.target.checked) {
                                  newSet.add(rep.name);
                                } else {
                                  newSet.delete(rep.name);
                                }
                                setCompareReps(newSet);
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-900">{rep.name}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-sm font-medium text-gray-900">Sales Rep:</label>
                      <select
                        value={selectedRep}
                        onChange={(e) => setSelectedRep(e.target.value)}
                        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-gray-900"
                      >
                        <option value="all">All Reps</option>
                        {data?.reps.map((rep) => (
                          <option key={rep.name} value={rep.name}>
                            {rep.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {viewMode === 'monthly' && allMonths.length > 0 && (
                    <>
                      <label className="text-sm font-medium text-gray-900 ml-4">Month:</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-gray-900"
                      >
                        {allMonths.map((month) => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {viewMode === 'quarterly' && allQuarters.length > 0 && (
                    <>
                      <label className="text-sm font-medium text-gray-900 ml-4">Quarter:</label>
                      <select
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(e.target.value)}
                        className="block w-36 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-gray-900"
                      >
                        {allQuarters.map((quarter) => (
                          <option key={quarter} value={quarter}>
                            {quarter}
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {viewMode === 'annual' && (
                    <>
                      <label className="text-sm font-medium text-gray-900 ml-4">From:</label>
                      <input
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-gray-900"
                      />
                      <label className="text-sm font-medium text-gray-900">To:</label>
                      <input
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-gray-900"
                      />
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
                      <WeeklyTable
                        data={rep.weeklyData}
                        repName={rep.name}
                        onEdit={(entry) => handleEditEntry(entry, rep.name)}
                        onDelete={handleDeleteEntry}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {viewMode === 'monthly' && (
              <div className="space-y-8">
                {filteredReps.map((rep) => {
                  const monthIndex = rep.monthlySummaries.findIndex(
                    (m) => m.month === selectedMonth
                  );
                  const monthlySummary = monthIndex >= 0 ? rep.monthlySummaries[monthIndex] : null;
                  const previousMonth = monthIndex > 0 ? rep.monthlySummaries[monthIndex - 1] : null;
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
                          previousSummary={previousMonth}
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
                {filteredReps.map((rep) => {
                  const quarterIndex = rep.quarterlySummaries.findIndex(
                    (q) => q.quarter === selectedQuarter
                  );
                  const currentQuarter = quarterIndex >= 0 ? rep.quarterlySummaries[quarterIndex] : null;
                  const previousQuarter = quarterIndex > 0 ? rep.quarterlySummaries[quarterIndex - 1] : null;
                  return (
                    <div
                      key={rep.name}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        {rep.name} - Quarterly Performance
                      </h2>
                      <QuarterlySummaryTable summaries={rep.quarterlySummaries} repName={rep.name} selectedQuarter={selectedQuarter} />

                      {currentQuarter && (
                        <div className="mt-6">
                          <SummaryCards
                            summary={currentQuarter}
                            title={`${selectedQuarter}`}
                            previousSummary={previousQuarter}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'annual' && data && (
              <div className="space-y-8">
                {(() => {
                  // Filter weekly data by date range
                  const startDate = dateRangeStart ? new Date(dateRangeStart) : null;
                  const endDate = dateRangeEnd ? new Date(dateRangeEnd) : null;

                  const filteredData = filteredReps.map(rep => {
                    const filteredWeekly = rep.weeklyData.filter(week => {
                      const weekDate = new Date(week.weekDate);
                      if (startDate && weekDate < startDate) return false;
                      if (endDate && weekDate > endDate) return false;
                      return true;
                    });
                    return { ...rep, weeklyData: filteredWeekly };
                  });

                  // Calculate aggregated totals for each rep
                  const repSummaries = filteredData.map(rep => {
                    const totalCallsScheduled = rep.weeklyData.reduce((sum, w) => sum + w.introCallsScheduled, 0);
                    const totalCallsTaken = rep.weeklyData.reduce((sum, w) => sum + w.introCallsTaken, 0);
                    const totalAccountsAudited = rep.weeklyData.reduce((sum, w) => sum + w.accountsAudited, 0);
                    const totalProposals = rep.weeklyData.reduce((sum, w) => sum + w.proposalsPitched, 0);
                    const totalClosed = rep.weeklyData.reduce((sum, w) => sum + w.dealsClosed, 0);
                    const totalMRR = rep.weeklyData.reduce((sum, w) => sum + w.thisMonthMRR, 0);
                    const showUpRate = totalCallsScheduled > 0 ? (totalCallsTaken / totalCallsScheduled) * 100 : 0;
                    const closeRate = totalProposals > 0 ? (totalClosed / totalProposals) * 100 : 0;
                    const acceptanceRate = totalCallsTaken > 0 ? (totalAccountsAudited / totalCallsTaken) * 100 : 0;
                    const mrrPerSale = totalClosed > 0 ? totalMRR / totalClosed : 0;

                    return {
                      name: rep.name,
                      weekCount: rep.weeklyData.length,
                      totalCallsScheduled,
                      totalCallsTaken,
                      totalAccountsAudited,
                      totalProposals,
                      totalClosed,
                      totalMRR,
                      showUpRate,
                      closeRate,
                      acceptanceRate,
                      mrrPerSale,
                    };
                  });

                  // Find best performer for each metric
                  const maxMRR = Math.max(...repSummaries.map(r => r.totalMRR), 0);
                  const maxClosed = Math.max(...repSummaries.map(r => r.totalClosed), 0);
                  const maxCloseRate = Math.max(...repSummaries.map(r => r.closeRate), 0);
                  const maxCalls = Math.max(...repSummaries.map(r => r.totalCallsTaken), 0);

                  const calcVsBest = (val: number, max: number) => max > 0 ? ((val - max) / max) * 100 : 0;

                  const formatDateRange = () => {
                    if (startDate && endDate) {
                      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    }
                    return 'All Time';
                  };

                  return (
                    <>
                      {/* Date Range Header */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Annual Summary</h3>
                            <p className="text-sm text-gray-500">{formatDateRange()}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Total Weeks</div>
                            <div className="text-2xl font-bold text-indigo-600">
                              {Math.max(...repSummaries.map(r => r.weekCount), 0)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rep Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {repSummaries.map((rep) => (
                          <div
                            key={rep.name}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                          >
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              {rep.name}
                              <span className="text-sm font-normal text-gray-500 ml-2">
                                ({rep.weekCount} weeks)
                              </span>
                            </h3>

                            {/* Main Metrics */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-green-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 uppercase">Total MRR</div>
                                <div className="text-xl font-bold text-green-700">
                                  ${rep.totalMRR.toLocaleString()}
                                </div>
                                {repSummaries.length > 1 && (
                                  <div className={`text-xs mt-1 font-medium ${
                                    rep.totalMRR === maxMRR ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {rep.totalMRR === maxMRR ? 'Best' : `${calcVsBest(rep.totalMRR, maxMRR).toFixed(0)}% vs best`}
                                  </div>
                                )}
                              </div>
                              <div className="bg-blue-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 uppercase">Deals Closed</div>
                                <div className="text-xl font-bold text-blue-700">
                                  {rep.totalClosed}
                                </div>
                                {repSummaries.length > 1 && (
                                  <div className={`text-xs mt-1 font-medium ${
                                    rep.totalClosed === maxClosed ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {rep.totalClosed === maxClosed ? 'Best' : `${calcVsBest(rep.totalClosed, maxClosed).toFixed(0)}% vs best`}
                                  </div>
                                )}
                              </div>
                              <div className="bg-purple-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 uppercase">Close Rate</div>
                                <div className="text-xl font-bold text-purple-700">
                                  {rep.closeRate.toFixed(1)}%
                                </div>
                                {repSummaries.length > 1 && (
                                  <div className={`text-xs mt-1 font-medium ${
                                    rep.closeRate === maxCloseRate ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {rep.closeRate === maxCloseRate ? 'Best' : `${calcVsBest(rep.closeRate, maxCloseRate).toFixed(0)}% vs best`}
                                  </div>
                                )}
                              </div>
                              <div className="bg-orange-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 uppercase">Calls Taken</div>
                                <div className="text-xl font-bold text-orange-700">
                                  {rep.totalCallsTaken}
                                </div>
                                {repSummaries.length > 1 && (
                                  <div className={`text-xs mt-1 font-medium ${
                                    rep.totalCallsTaken === maxCalls ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {rep.totalCallsTaken === maxCalls ? 'Best' : `${calcVsBest(rep.totalCallsTaken, maxCalls).toFixed(0)}% vs best`}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Additional Metrics */}
                            <div className="border-t border-gray-100 pt-3 grid grid-cols-3 gap-2 text-center">
                              <div>
                                <div className="text-xs text-gray-500 uppercase">Show-up</div>
                                <div className="text-sm font-semibold text-gray-900">{rep.showUpRate.toFixed(1)}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 uppercase">Acceptance</div>
                                <div className="text-sm font-semibold text-gray-900">{rep.acceptanceRate.toFixed(1)}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 uppercase">MRR/Sale</div>
                                <div className="text-sm font-semibold text-gray-900">${rep.mrrPerSale.toLocaleString()}</div>
                              </div>
                            </div>

                            {/* Funnel Breakdown */}
                            <div className="border-t border-gray-100 pt-3 mt-3">
                              <div className="text-xs text-gray-500 uppercase mb-2">Sales Funnel</div>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Calls Scheduled</span>
                                  <span className="font-medium text-gray-900">{rep.totalCallsScheduled}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Calls Taken</span>
                                  <span className="font-medium text-gray-900">{rep.totalCallsTaken}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Accounts Audited</span>
                                  <span className="font-medium text-gray-900">{rep.totalAccountsAudited}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Proposals Pitched</span>
                                  <span className="font-medium text-gray-900">{rep.totalProposals}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Deals Closed</span>
                                  <span className="font-medium text-gray-900">{rep.totalClosed}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Team Total Summary */}
                      {repSummaries.length > 1 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Total</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <div className="text-center">
                              <div className="text-xs text-gray-500 uppercase">Total MRR</div>
                              <div className="text-2xl font-bold text-green-600">
                                ${repSummaries.reduce((sum, r) => sum + r.totalMRR, 0).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 uppercase">Deals Closed</div>
                              <div className="text-2xl font-bold text-blue-600">
                                {repSummaries.reduce((sum, r) => sum + r.totalClosed, 0)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 uppercase">Calls Scheduled</div>
                              <div className="text-2xl font-bold text-indigo-600">
                                {repSummaries.reduce((sum, r) => sum + r.totalCallsScheduled, 0)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 uppercase">Calls Taken</div>
                              <div className="text-2xl font-bold text-orange-600">
                                {repSummaries.reduce((sum, r) => sum + r.totalCallsTaken, 0)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 uppercase">Audits</div>
                              <div className="text-2xl font-bold text-purple-600">
                                {repSummaries.reduce((sum, r) => sum + r.totalAccountsAudited, 0)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 uppercase">Proposals</div>
                              <div className="text-2xl font-bold text-pink-600">
                                {repSummaries.reduce((sum, r) => sum + r.totalProposals, 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {viewMode === 'comparison' && data && data.reps.length > 0 && (
              <div className="space-y-8">
                {/* Rep Comparison Cards - All-Time Totals with relative comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(() => {
                    // Calculate all-time totals for each rep
                    const repTotals = data.reps
                      .filter(rep => compareReps.has(rep.name))
                      .filter(rep => rep.monthlySummaries.length > 0)
                      .map(rep => {
                        const totalClosed = rep.monthlySummaries.reduce((sum, m) => sum + m.totalClosed, 0);
                        const totalMRR = rep.monthlySummaries.reduce((sum, m) => sum + m.totalMRR, 0);
                        const totalCallsTaken = rep.monthlySummaries.reduce((sum, m) => sum + m.totalCallsTaken, 0);
                        const totalProposals = rep.monthlySummaries.reduce((sum, m) => sum + m.totalProposals, 0);
                        const closeRate = totalProposals > 0 ? (totalClosed / totalProposals) * 100 : 0;
                        return { name: rep.name, totalClosed, totalMRR, totalCallsTaken, closeRate };
                      });

                    // Find the best performer for each metric
                    const maxMRR = Math.max(...repTotals.map(r => r.totalMRR));
                    const maxClosed = Math.max(...repTotals.map(r => r.totalClosed));
                    const maxCloseRate = Math.max(...repTotals.map(r => r.closeRate));
                    const maxCalls = Math.max(...repTotals.map(r => r.totalCallsTaken));

                    // Calculate percentage vs best
                    const calcVsBest = (val: number, max: number) => max > 0 ? ((val - max) / max) * 100 : 0;

                    return repTotals.map((rep) => (
                      <div
                        key={rep.name}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {rep.name}
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            (All Time)
                          </span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase">Deals Closed</div>
                            <div className="text-2xl font-bold text-blue-700">
                              {rep.totalClosed}
                            </div>
                            {repTotals.length > 1 && (
                              <div className={`text-xs mt-1 font-medium ${
                                rep.totalClosed === maxClosed ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {rep.totalClosed === maxClosed ? 'Best' : `${calcVsBest(rep.totalClosed, maxClosed).toFixed(0)}% vs best`}
                              </div>
                            )}
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase">Total MRR</div>
                            <div className="text-2xl font-bold text-green-700">
                              ${rep.totalMRR.toLocaleString()}
                            </div>
                            {repTotals.length > 1 && (
                              <div className={`text-xs mt-1 font-medium ${
                                rep.totalMRR === maxMRR ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {rep.totalMRR === maxMRR ? 'Best' : `${calcVsBest(rep.totalMRR, maxMRR).toFixed(0)}% vs best`}
                              </div>
                            )}
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase">Close Rate</div>
                            <div className="text-2xl font-bold text-purple-700">
                              {rep.closeRate.toFixed(1)}%
                            </div>
                            {repTotals.length > 1 && (
                              <div className={`text-xs mt-1 font-medium ${
                                rep.closeRate === maxCloseRate ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {rep.closeRate === maxCloseRate ? 'Best' : `${calcVsBest(rep.closeRate, maxCloseRate).toFixed(0)}% vs best`}
                              </div>
                            )}
                          </div>
                          <div className="bg-orange-50 rounded-lg p-4">
                            <div className="text-xs text-gray-500 uppercase">Calls Taken</div>
                            <div className="text-2xl font-bold text-orange-700">
                              {rep.totalCallsTaken}
                            </div>
                            {repTotals.length > 1 && (
                              <div className={`text-xs mt-1 font-medium ${
                                rep.totalCallsTaken === maxCalls ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {rep.totalCallsTaken === maxCalls ? 'Best' : `${calcVsBest(rep.totalCallsTaken, maxCalls).toFixed(0)}% vs best`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Comparison Charts */}
                {compareReps.size > 0 && data.reps.filter(r => compareReps.has(r.name)).some(r => r.monthlySummaries.length > 0) && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Monthly Trend Charts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="totalMRR"
                        title="Total MRR"
                        format="currency"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="totalClosed"
                        title="Deals Closed"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="totalCallsScheduled"
                        title="Total Calls Scheduled"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="totalCallsTaken"
                        title="Total Calls Taken"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="totalAccountsAudited"
                        title="Accounts Audited"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="totalProposals"
                        title="Total Proposals"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="showUpRate"
                        title="Show Up Rate"
                        format="percent"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="closeRate"
                        title="Close Rate"
                        format="percent"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="mrrPerCallTaken"
                        title="MRR Per Call"
                        format="currency"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="mrrPerAudit"
                        title="MRR Per Audit"
                        format="currency"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="mrrPerSales"
                        title="MRR Per Sale"
                        format="currency"
                      />
                      <ComparisonChart
                        reps={data.reps.filter(r => compareReps.has(r.name))}
                        dataKey="acceptanceQualityRate"
                        title="Acceptance Rate"
                        format="percent"
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
          onCancel={() => {
            setShowEntryForm(false);
            setEditEntry(null);
          }}
          editData={editEntry || undefined}
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

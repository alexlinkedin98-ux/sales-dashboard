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
  const [compareReps, setCompareReps] = useState<Set<string>>(new Set());

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
                Call Analysis
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
                  const latestIndex = rep.quarterlySummaries.length - 1;
                  const latestQuarter = latestIndex >= 0 ? rep.quarterlySummaries[latestIndex] : null;
                  const previousQuarter = latestIndex > 0 ? rep.quarterlySummaries[latestIndex - 1] : null;
                  return (
                    <div
                      key={rep.name}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        {rep.name} - Quarterly Performance
                      </h2>
                      <QuarterlySummaryTable summaries={rep.quarterlySummaries} repName={rep.name} />

                      {latestQuarter && (
                        <div className="mt-6">
                          <SummaryCards
                            summary={latestQuarter}
                            title={`Latest Quarter: ${latestQuarter.quarter}`}
                            previousSummary={previousQuarter}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
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

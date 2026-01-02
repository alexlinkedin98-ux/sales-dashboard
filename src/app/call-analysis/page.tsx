'use client';

import { useState, useEffect } from 'react';
import { CallEntryForm } from '@/components/call-analysis/CallEntryForm';
import { BulkImportForm } from '@/components/call-analysis/BulkImportForm';
import { CallAnalysisTable } from '@/components/call-analysis/CallAnalysisTable';
import { CallDetailModal } from '@/components/call-analysis/CallDetailModal';
import { WeeklySummaryCards } from '@/components/call-analysis/WeeklySummaryCards';
import {
  ScoreTrendChart,
  SPINDistributionChart,
  ChallengerInsightChart,
  CallVolumeChart,
  ImprovementChart,
  RepComparisonChart,
} from '@/components/call-analysis/CallAnalysisCharts';

interface SalesRep {
  id: string;
  name: string;
}

interface CallData {
  id: string;
  callDate: Date | string;
  callLabel: string;
  transcript?: string | null;
  situationQuestions: number;
  problemQuestions: number;
  implicationQuestions: number;
  needPayoffQuestions: number;
  challengesPresented: number;
  dataPointsShared: number;
  insightsShared: number;
  aiScoreSpin?: number | null;
  aiScoreChallenger?: number | null;
  aiScoreInsight?: number | null;
  aiScoreOverall: number | null;
  aiFeedback?: string | null;
  repScoreSpin?: number | null;
  repScoreChallenger?: number | null;
  repScoreInsight?: number | null;
  repScoreOverall: number | null;
  repNotes?: string | null;
  callDuration: number | null;
  outcome: string | null;
}

interface WeeklyTrend {
  weekStart: Date | string;
  weekLabel: string;
  totalCalls: number;
  avgSituationQuestions: number;
  avgProblemQuestions: number;
  avgImplicationQuestions: number;
  avgNeedPayoffQuestions: number;
  avgChallenges: number;
  avgDataPoints: number;
  avgInsights: number;
  avgAiScoreOverall: number | null;
  avgRepScoreOverall: number | null;
}

interface RepCallData {
  repId: string;
  repName: string;
  calls: CallData[];
  weeklyTrends: WeeklyTrend[];
  totals: {
    totalCalls: number;
    avgSituationQuestions: number;
    avgProblemQuestions: number;
    avgImplicationQuestions: number;
    avgNeedPayoffQuestions: number;
    avgChallenges: number;
    avgDataPoints: number;
    avgInsights: number;
    avgAiScoreOverall: number | null;
    avgRepScoreOverall: number | null;
  };
}

interface DashboardData {
  reps: RepCallData[];
  overall: {
    totalCalls: number;
    avgAiScoreOverall: number | null;
    avgRepScoreOverall: number | null;
  };
  lastUpdated: string;
}

type ViewMode = 'weekly' | 'individual' | 'comparison';

export default function CallAnalysisDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [compareReps, setCompareReps] = useState<Set<string>>(new Set());

  // Modal states
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editCall, setEditCall] = useState<CallData | null>(null);
  const [viewCall, setViewCall] = useState<{ call: CallData; repName: string } | null>(null);

  useEffect(() => {
    fetchData();
    fetchReps();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/call-analysis/data');
      if (response.ok) {
        const dashboardData: DashboardData = await response.json();
        setData(dashboardData);

        // Initialize compareReps with reps that have data
        const repsWithData = dashboardData.reps
          .filter((rep) => rep.calls.length > 0)
          .map((rep) => rep.repId);
        setCompareReps(new Set(repsWithData));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
    } catch (error) {
      console.error('Error fetching reps:', error);
    }
  };

  const handleEntrySuccess = () => {
    setShowEntryForm(false);
    setShowBulkImport(false);
    setEditCall(null);
    fetchData();
  };

  const handleEditCall = (call: CallData) => {
    const rep = data?.reps.find((r) =>
      r.calls.some((c) => c.id === call.id)
    );
    if (rep) {
      setEditCall({
        ...call,
        salesRepId: rep.repId,
      } as CallData & { salesRepId: string });
    }
    setShowEntryForm(true);
  };

  const handleViewCall = (call: CallData, repName: string) => {
    setViewCall({ call, repName });
  };

  const handleDeleteCall = () => {
    fetchData();
  };

  const filteredReps = data
    ? selectedRep === 'all'
      ? data.reps
      : data.reps.filter((rep) => rep.repId === selectedRep)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading call analysis data...</p>
        </div>
      </div>
    );
  }

  const showEmptyState = !data || data.reps.every((r) => r.calls.length === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Call Analysis Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                SPIN Selling / Challenger Sale / Insight Selling
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
                Sales Dashboard
              </a>
              <button
                onClick={() => setShowBulkImport(true)}
                disabled={reps.length === 0}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Bulk Import
              </button>
              <button
                onClick={() => setShowEntryForm(true)}
                disabled={reps.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Call
              </button>
              <button
                onClick={fetchData}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
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
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              No call analyses yet
            </h2>
            <p className="mt-2 text-gray-600">
              Start tracking your sales calls to improve your SPIN, Challenger, and
              Insight selling techniques.
            </p>
            {reps.length === 0 ? (
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-2">
                  First, add sales reps in the main dashboard
                </p>
                <a
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Go to Sales Dashboard
                </a>
              </div>
            ) : (
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => setShowEntryForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Add Your First Call
                </button>
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Bulk Import Calls
                </button>
              </div>
            )}
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
                    { key: 'weekly', label: 'Weekly Trends' },
                    { key: 'individual', label: 'Individual Calls' },
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
                      <label className="text-sm font-medium text-gray-900">
                        Compare:
                      </label>
                      <div className="flex items-center gap-3">
                        {data?.reps
                          .filter((rep) => rep.calls.length > 0)
                          .map((rep) => (
                            <label
                              key={rep.repId}
                              className="flex items-center gap-1.5 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={compareReps.has(rep.repId)}
                                onChange={(e) => {
                                  const newSet = new Set(compareReps);
                                  if (e.target.checked) {
                                    newSet.add(rep.repId);
                                  } else {
                                    newSet.delete(rep.repId);
                                  }
                                  setCompareReps(newSet);
                                }}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-900">
                                {rep.repName}
                              </span>
                            </label>
                          ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-sm font-medium text-gray-900">
                        Sales Rep:
                      </label>
                      <select
                        value={selectedRep}
                        onChange={(e) => setSelectedRep(e.target.value)}
                        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-gray-900"
                      >
                        <option value="all">All Reps</option>
                        {data?.reps
                          .filter((rep) => rep.calls.length > 0)
                          .map((rep) => (
                            <option key={rep.repId} value={rep.repId}>
                              {rep.repName}
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
                {filteredReps.map((rep) => (
                  <div key={rep.repId} className="space-y-6">
                    {/* Summary Cards */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <WeeklySummaryCards
                        weeklyTrends={rep.weeklyTrends}
                        totals={rep.totals}
                        repName={rep.repName}
                      />
                    </div>

                    {/* Charts */}
                    {rep.weeklyTrends.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ScoreTrendChart
                          trends={rep.weeklyTrends}
                          title={`${rep.repName} - Score Trends`}
                        />
                        <SPINDistributionChart trends={rep.weeklyTrends} />
                        <ChallengerInsightChart trends={rep.weeklyTrends} />
                        <CallVolumeChart trends={rep.weeklyTrends} />
                        <ImprovementChart trends={rep.weeklyTrends} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'individual' && (
              <div className="space-y-8">
                {filteredReps.map((rep) => (
                  <div
                    key={rep.repId}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                  >
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      {rep.repName} - Call History
                    </h2>
                    <CallAnalysisTable
                      calls={rep.calls}
                      repName={rep.repName}
                      onView={(call) => handleViewCall(call, rep.repName)}
                      onEdit={handleEditCall}
                      onDelete={handleDeleteCall}
                    />
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'comparison' && data && (
              <div className="space-y-8">
                {/* Comparison Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.reps
                    .filter((rep) => compareReps.has(rep.repId))
                    .map((rep) => (
                      <div
                        key={rep.repId}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {rep.repName}
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              Total Calls
                            </div>
                            <div className="text-xl font-bold text-indigo-600">
                              {rep.totals.totalCalls}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              Avg AI Score
                            </div>
                            <div className="text-xl font-bold text-green-600">
                              {rep.totals.avgAiScoreOverall?.toFixed(1) || '-'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              Avg Rep Score
                            </div>
                            <div className="text-xl font-bold text-blue-600">
                              {rep.totals.avgRepScoreOverall?.toFixed(1) || '-'}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              Avg SPIN
                            </div>
                            <div className="text-xl font-bold text-purple-600">
                              {(
                                rep.totals.avgSituationQuestions +
                                rep.totals.avgProblemQuestions +
                                rep.totals.avgImplicationQuestions +
                                rep.totals.avgNeedPayoffQuestions
                              ).toFixed(1)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              Avg Challenger
                            </div>
                            <div className="text-xl font-bold text-pink-600">
                              {(
                                rep.totals.avgChallenges +
                                rep.totals.avgDataPoints
                              ).toFixed(1)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              Avg Insights
                            </div>
                            <div className="text-xl font-bold text-cyan-600">
                              {rep.totals.avgInsights.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Comparison Charts */}
                {compareReps.size > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <RepComparisonChart
                      reps={data.reps.filter((r) => compareReps.has(r.repId))}
                      metric="avgAiScoreOverall"
                      title="AI Score Comparison"
                    />
                    <RepComparisonChart
                      reps={data.reps.filter((r) => compareReps.has(r.repId))}
                      metric="avgRepScoreOverall"
                      title="Rep Score Comparison"
                    />
                    <RepComparisonChart
                      reps={data.reps.filter((r) => compareReps.has(r.repId))}
                      metric="avgChallenges"
                      title="Challenger Score Comparison (Challenges + Data Points)"
                    />
                    <RepComparisonChart
                      reps={data.reps.filter((r) => compareReps.has(r.repId))}
                      metric="avgInsights"
                      title="Insights Comparison"
                    />
                    <RepComparisonChart
                      reps={data.reps.filter((r) => compareReps.has(r.repId))}
                      metric="totalCalls"
                      title="Call Volume Comparison"
                    />
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
            Call Analysis Dashboard - SPIN / Challenger / Insight Selling
          </p>
        </div>
      </footer>

      {/* Modals */}
      {showEntryForm && (
        <CallEntryForm
          reps={reps}
          onSuccess={handleEntrySuccess}
          onCancel={() => {
            setShowEntryForm(false);
            setEditCall(null);
          }}
          editData={
            editCall
              ? {
                  ...editCall,
                  salesRepId:
                    data?.reps.find((r) =>
                      r.calls.some((c) => c.id === editCall.id)
                    )?.repId || '',
                  callDate:
                    typeof editCall.callDate === 'string'
                      ? editCall.callDate
                      : editCall.callDate.toISOString(),
                }
              : undefined
          }
        />
      )}

      {showBulkImport && (
        <BulkImportForm
          reps={reps}
          onSuccess={handleEntrySuccess}
          onCancel={() => setShowBulkImport(false)}
        />
      )}

      {viewCall && (
        <CallDetailModal
          call={viewCall.call}
          repName={viewCall.repName}
          onClose={() => setViewCall(null)}
        />
      )}
    </div>
  );
}

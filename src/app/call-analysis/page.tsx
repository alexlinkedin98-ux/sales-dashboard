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
  RepComparisonChart,
  CBETrendChart,
} from '@/components/call-analysis/CallAnalysisCharts';
import { Navigation } from '@/components/Navigation';

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

type ViewMode = 'team-weekly' | 'individual-weekly' | 'individual' | 'comparison';

export default function CallAnalysisDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('team-weekly');
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
            <div className="flex gap-2 items-center">
              <Navigation currentPage="call-analysis" />
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <a
                href="/call-analysis/trainer"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
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
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Trainer
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
                    { key: 'team-weekly', label: 'Team Weekly' },
                    { key: 'individual-weekly', label: 'Individual Weekly' },
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

                {/* Rep Selector - only for individual views and comparison */}
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
                  ) : viewMode === 'individual-weekly' || viewMode === 'individual' ? (
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
                  ) : null}
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Team Weekly View - Aggregated team charts */}
            {viewMode === 'team-weekly' && data && (
              <div className="space-y-8">
                {/* Team Averages Card */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Overview</h3>

                  {/* Primary Metrics Row */}
                  <div className="grid grid-cols-6 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Total Calls</div>
                      <div className="text-3xl font-bold text-indigo-600">
                        {data.overall.totalCalls}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1 flex items-center justify-center gap-1">
                        Team Avg CBE
                        <div className="group relative">
                          <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-64 z-50 normal-case font-normal">
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            <div className="font-semibold mb-2">Career Best Effort (CBE)</div>
                            <div className="text-gray-300 mb-2">Inspired by Pat Riley&apos;s Lakers system from James Clear&apos;s Atomic Habits.</div>
                            <div className="font-medium mb-1">Formula:</div>
                            <div className="text-gray-300 text-[10px] space-y-0.5">
                              <div>P×2 + I×4 + N×3 + Ch×2 + D×1 + In×2</div>
                              <div>- Situation penalty (if S &gt; 5)</div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300 text-[10px]">
                              <div><span className="font-medium">P</span>=Problem, <span className="font-medium">I</span>=Implication, <span className="font-medium">N</span>=Need-Payoff</div>
                              <div><span className="font-medium">Ch</span>=Challenges, <span className="font-medium">D</span>=Data Points, <span className="font-medium">In</span>=Insights</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-purple-600">
                        {(() => {
                          const allCalls = data.reps.flatMap(r => r.calls);
                          if (allCalls.length === 0) return '-';
                          const totalCBE = allCalls.reduce((sum, call) => {
                            const p = call.problemQuestions || 0;
                            const i = call.implicationQuestions || 0;
                            const n = call.needPayoffQuestions || 0;
                            const ch = call.challengesPresented || 0;
                            const d = call.dataPointsShared || 0;
                            const ins = call.insightsShared || 0;
                            const s = call.situationQuestions || 0;
                            const positives = (p * 2) + (i * 4) + (n * 3) + (ch * 2) + (d * 1) + (ins * 2);
                            const penalty = Math.max(0, s - 5) * 0.5;
                            return sum + Math.round(positives - penalty);
                          }, 0);
                          return Math.round(totalCBE / allCalls.length);
                        })()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1 flex items-center justify-center gap-1">
                        CBE-AI
                        <div className="group relative">
                          <svg className="w-3.5 h-3.5 text-gray-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-64 z-50 normal-case font-normal">
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            <div className="font-semibold mb-2">CBE-AI (Quality-Adjusted)</div>
                            <div className="text-gray-300 mb-2">Combines quantitative effort with qualitative execution.</div>
                            <div className="font-medium mb-1">Formula:</div>
                            <div className="text-gray-300 text-[10px] space-y-0.5">
                              <div>CBE × (AI Score / 10)</div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300 text-[10px]">
                              <div>High effort + good execution = high score</div>
                              <div>High effort + poor execution = lower score</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-emerald-600">
                        {(() => {
                          const allCalls = data.reps.flatMap(r => r.calls);
                          if (allCalls.length === 0) return '-';
                          const totalCBEAI = allCalls.reduce((sum, call) => {
                            const p = call.problemQuestions || 0;
                            const i = call.implicationQuestions || 0;
                            const n = call.needPayoffQuestions || 0;
                            const ch = call.challengesPresented || 0;
                            const d = call.dataPointsShared || 0;
                            const ins = call.insightsShared || 0;
                            const s = call.situationQuestions || 0;
                            const positives = (p * 2) + (i * 4) + (n * 3) + (ch * 2) + (d * 1) + (ins * 2);
                            const penalty = Math.max(0, s - 5) * 0.5;
                            const cbe = positives - penalty;
                            const aiScore = call.aiScoreOverall || 5;
                            return sum + (cbe * (aiScore / 10));
                          }, 0);
                          return Math.round(totalCBEAI / allCalls.length);
                        })()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">SPIN Score</div>
                      <div className="text-3xl font-bold text-blue-600">
                        {(() => {
                          const allCalls = data.reps.flatMap(r => r.calls);
                          if (allCalls.length === 0) return '-';
                          const totalRatio = allCalls.reduce((sum, call) => {
                            const s = call.situationQuestions || 0;
                            const p = call.problemQuestions || 0;
                            const i = call.implicationQuestions || 0;
                            const n = call.needPayoffQuestions || 0;
                            const total = s + p + i + n;
                            if (total === 0) return sum;
                            const sP = (s / total) * 100;
                            const iP = (i / total) * 100;
                            const nP = (n / total) * 100;
                            const pP = (p / total) * 100;
                            let score = 5;
                            if (sP > 60) score -= 3;
                            else if (sP > 50) score -= 2.5;
                            else if (sP > 40) score -= 2;
                            else if (sP > 30) score -= 1;
                            else if (sP <= 15) score += 1;
                            if (iP >= 25) score += 2;
                            else if (iP >= 15) score += 1.5;
                            else if (iP >= 10) score += 1;
                            else if (iP === 0) score -= 1.5;
                            if (nP >= 20) score += 2;
                            else if (nP >= 10) score += 1.5;
                            else if (nP >= 5) score += 1;
                            else if (nP === 0) score -= 1;
                            if (pP >= 15 && pP <= 35) score += 0.5;
                            else if (pP === 0) score -= 0.5;
                            return sum + Math.min(10, Math.max(1, Math.round(score)));
                          }, 0);
                          return (totalRatio / allCalls.length).toFixed(1);
                        })()}/10
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Avg Challenger</div>
                      <div className="text-3xl font-bold text-pink-600">
                        {(() => {
                          const allCalls = data.reps.flatMap(r => r.calls);
                          if (allCalls.length === 0) return '-';
                          const avgChallenges = allCalls.reduce((sum, call) => sum + (call.challengesPresented || 0), 0) / allCalls.length;
                          const avgData = allCalls.reduce((sum, call) => sum + (call.dataPointsShared || 0), 0) / allCalls.length;
                          return (avgChallenges + avgData).toFixed(1);
                        })()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Avg Insights</div>
                      <div className="text-3xl font-bold text-cyan-600">
                        {(() => {
                          const allCalls = data.reps.flatMap(r => r.calls);
                          if (allCalls.length === 0) return '-';
                          return (allCalls.reduce((sum, call) => sum + (call.insightsShared || 0), 0) / allCalls.length).toFixed(1);
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* AI vs Rep Score Comparison */}
                  <div className="border-t border-indigo-200 pt-4">
                    <div className="text-xs text-gray-500 uppercase mb-3 text-center">Score Comparison (AI vs Rep Self-Assessment)</div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">AI Score</div>
                          <div className="text-2xl font-bold text-green-600">
                            {data.overall.avgAiScoreOverall?.toFixed(1) || '-'}
                          </div>
                        </div>
                        <div className="text-gray-300 text-2xl">vs</div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">Rep Score</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {data.overall.avgRepScoreOverall?.toFixed(1) || '-'}
                          </div>
                        </div>
                        {data.overall.avgAiScoreOverall && data.overall.avgRepScoreOverall && (
                          <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                            Math.abs(data.overall.avgAiScoreOverall - data.overall.avgRepScoreOverall) < 1
                              ? 'bg-gray-100 text-gray-600'
                              : data.overall.avgRepScoreOverall > data.overall.avgAiScoreOverall
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {data.overall.avgRepScoreOverall > data.overall.avgAiScoreOverall ? '+' : ''}
                            {(data.overall.avgRepScoreOverall - data.overall.avgAiScoreOverall).toFixed(1)} diff
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="text-xs text-gray-500 bg-white/50 rounded-lg px-3 py-2">
                          {data.overall.avgRepScoreOverall && data.overall.avgAiScoreOverall ? (
                            data.overall.avgRepScoreOverall > data.overall.avgAiScoreOverall + 0.5 ? (
                              <span className="text-yellow-700">Reps tend to rate themselves higher than AI</span>
                            ) : data.overall.avgRepScoreOverall < data.overall.avgAiScoreOverall - 0.5 ? (
                              <span className="text-blue-700">Reps are more critical than AI assessment</span>
                            ) : (
                              <span className="text-green-700">AI and Rep scores are well aligned</span>
                            )
                          ) : (
                            <span className="text-gray-400">Not enough data for comparison</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Aggregated Charts */}
                {(() => {
                  // Aggregate weekly trends across all reps
                  const allWeeklyTrends = data.reps.flatMap(r => r.weeklyTrends);
                  const weekMap = new Map<string, WeeklyTrend[]>();

                  allWeeklyTrends.forEach(trend => {
                    const key = trend.weekLabel;
                    if (!weekMap.has(key)) {
                      weekMap.set(key, []);
                    }
                    weekMap.get(key)!.push(trend);
                  });

                  const teamTrends: WeeklyTrend[] = Array.from(weekMap.entries())
                    .map(([weekLabel, trends]) => {
                      const totalCalls = trends.reduce((sum, t) => sum + t.totalCalls, 0);
                      return {
                        weekStart: trends[0].weekStart,
                        weekLabel,
                        totalCalls,
                        avgSituationQuestions: trends.reduce((sum, t) => sum + t.avgSituationQuestions * t.totalCalls, 0) / totalCalls,
                        avgProblemQuestions: trends.reduce((sum, t) => sum + t.avgProblemQuestions * t.totalCalls, 0) / totalCalls,
                        avgImplicationQuestions: trends.reduce((sum, t) => sum + t.avgImplicationQuestions * t.totalCalls, 0) / totalCalls,
                        avgNeedPayoffQuestions: trends.reduce((sum, t) => sum + t.avgNeedPayoffQuestions * t.totalCalls, 0) / totalCalls,
                        avgChallenges: trends.reduce((sum, t) => sum + t.avgChallenges * t.totalCalls, 0) / totalCalls,
                        avgDataPoints: trends.reduce((sum, t) => sum + t.avgDataPoints * t.totalCalls, 0) / totalCalls,
                        avgInsights: trends.reduce((sum, t) => sum + t.avgInsights * t.totalCalls, 0) / totalCalls,
                        avgAiScoreOverall: (() => {
                          const validTrends = trends.filter(t => t.avgAiScoreOverall !== null);
                          if (validTrends.length === 0) return null;
                          const totalValidCalls = validTrends.reduce((sum, t) => sum + t.totalCalls, 0);
                          return validTrends.reduce((sum, t) => sum + (t.avgAiScoreOverall || 0) * t.totalCalls, 0) / totalValidCalls;
                        })(),
                        avgRepScoreOverall: (() => {
                          const validTrends = trends.filter(t => t.avgRepScoreOverall !== null);
                          if (validTrends.length === 0) return null;
                          const totalValidCalls = validTrends.reduce((sum, t) => sum + t.totalCalls, 0);
                          return validTrends.reduce((sum, t) => sum + (t.avgRepScoreOverall || 0) * t.totalCalls, 0) / totalValidCalls;
                        })(),
                      };
                    })
                    .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());

                  if (teamTrends.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        No weekly data available yet
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {/* Combined Score - CBE */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Combined Score (Qualitative + Quantitative)</h4>
                        <CBETrendChart trends={teamTrends} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Qualitative Analysis */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Qualitative Analysis</h4>
                          <ScoreTrendChart
                            trends={teamTrends}
                            title="Score Trends (AI & Rep)"
                          />
                        </div>

                        {/* Quantitative Analysis */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quantitative Analysis</h4>
                          <div className="space-y-4">
                            <SPINDistributionChart trends={teamTrends} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quantitative Analysis - Challenger & Insight</h4>
                        <ChallengerInsightChart trends={teamTrends} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Individual Weekly View - Per-rep charts */}
            {viewMode === 'individual-weekly' && (
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
                      <div className="space-y-6">
                        {/* Combined Score - CBE */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Combined Score (Qualitative + Quantitative)</h4>
                          <CBETrendChart trends={rep.weeklyTrends} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Qualitative Analysis */}
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Qualitative Analysis</h4>
                            <ScoreTrendChart
                              trends={rep.weeklyTrends}
                              title="Score Trends (AI & Rep)"
                            />
                          </div>

                          {/* Quantitative Analysis */}
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quantitative Analysis</h4>
                            <div className="space-y-4">
                              <SPINDistributionChart trends={rep.weeklyTrends} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quantitative Analysis - Challenger & Insight</h4>
                          <ChallengerInsightChart trends={rep.weeklyTrends} />
                        </div>
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
                      onOutcomeChange={(id, outcome) => {
                        // Update local state to reflect the change
                        setData((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            reps: prev.reps.map((r) => ({
                              ...r,
                              calls: r.calls.map((c) =>
                                c.id === id ? { ...c, outcome } : c
                              ),
                            })),
                          };
                        });
                      }}
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
                        <div className="grid grid-cols-5 gap-3">
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
                              Avg CBE
                            </div>
                            <div className="text-xl font-bold text-purple-600">
                              {(() => {
                                if (rep.calls.length === 0) return '-';
                                const totalCBE = rep.calls.reduce((sum, call) => {
                                  const p = call.problemQuestions || 0;
                                  const i = call.implicationQuestions || 0;
                                  const n = call.needPayoffQuestions || 0;
                                  const ch = call.challengesPresented || 0;
                                  const d = call.dataPointsShared || 0;
                                  const ins = call.insightsShared || 0;
                                  const s = call.situationQuestions || 0;
                                  const positives = (p * 2) + (i * 4) + (n * 3) + (ch * 2) + (d * 1) + (ins * 2);
                                  const penalty = Math.max(0, s - 5) * 0.5;
                                  return sum + Math.round(positives - penalty);
                                }, 0);
                                return Math.round(totalCBE / rep.calls.length);
                              })()}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              CBE-AI
                            </div>
                            <div className="text-xl font-bold text-emerald-600">
                              {(() => {
                                if (rep.calls.length === 0) return '-';
                                const totalCBEAI = rep.calls.reduce((sum, call) => {
                                  const p = call.problemQuestions || 0;
                                  const i = call.implicationQuestions || 0;
                                  const n = call.needPayoffQuestions || 0;
                                  const ch = call.challengesPresented || 0;
                                  const d = call.dataPointsShared || 0;
                                  const ins = call.insightsShared || 0;
                                  const s = call.situationQuestions || 0;
                                  const positives = (p * 2) + (i * 4) + (n * 3) + (ch * 2) + (d * 1) + (ins * 2);
                                  const penalty = Math.max(0, s - 5) * 0.5;
                                  const cbe = positives - penalty;
                                  const aiScore = call.aiScoreOverall || 5;
                                  return sum + (cbe * (aiScore / 10));
                                }, 0);
                                return Math.round(totalCBEAI / rep.calls.length);
                              })()}
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
                        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              SPIN Score
                            </div>
                            <div className="text-xl font-bold text-blue-600">
                              {(() => {
                                const s = rep.totals.avgSituationQuestions;
                                const p = rep.totals.avgProblemQuestions;
                                const i = rep.totals.avgImplicationQuestions;
                                const n = rep.totals.avgNeedPayoffQuestions;
                                const total = s + p + i + n;
                                if (total === 0) return '-';
                                const sP = (s / total) * 100;
                                const iP = (i / total) * 100;
                                const nP = (n / total) * 100;
                                const pP = (p / total) * 100;
                                let score = 5;
                                if (sP > 60) score -= 3;
                                else if (sP > 50) score -= 2.5;
                                else if (sP > 40) score -= 2;
                                else if (sP > 30) score -= 1;
                                else if (sP <= 15) score += 1;
                                if (iP >= 25) score += 2;
                                else if (iP >= 15) score += 1.5;
                                else if (iP >= 10) score += 1;
                                else if (iP === 0) score -= 1.5;
                                if (nP >= 20) score += 2;
                                else if (nP >= 10) score += 1.5;
                                else if (nP >= 5) score += 1;
                                else if (nP === 0) score -= 1;
                                if (pP >= 15 && pP <= 35) score += 0.5;
                                else if (pP === 0) score -= 0.5;
                                return Math.min(10, Math.max(1, Math.round(score)));
                              })()}/10
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              Avg Challenger
                            </div>
                            <div className="text-xl font-bold text-pink-600">
                              {rep.totals.avgChallenges.toFixed(1)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                              Avg Data Points
                            </div>
                            <div className="text-xl font-bold text-orange-600">
                              {rep.totals.avgDataPoints.toFixed(1)}
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
                  <div className="space-y-6">
                    {/* CBE Comparison - Full Width */}
                    <RepComparisonChart
                      reps={data.reps.filter((r) => compareReps.has(r.repId))}
                      metric="cbe"
                      title="CBE Comparison (Career Best Effort)"
                    />

                    {/* Other Comparisons - 2 columns */}
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

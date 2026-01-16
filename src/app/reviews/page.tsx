'use client';

import { useState, useEffect } from 'react';
import { ChangeHistory } from '@/components/ChangeHistory';
import { ReviewEntryForm } from '@/components/ReviewEntryForm';
import { ChatBot } from '@/components/ChatBot';
import { Navigation } from '@/components/Navigation';

interface MonthlyEntry {
  id: string;
  monthDate: string;
  monthLabel: string;
  reviewsRequested: number;
  googleReviews: number;
  clutchReviews: number;
  totalReceived: number;
  responseRate: number;
}

interface RepReviewData {
  repId: string;
  repName: string;
  monthlyData: MonthlyEntry[];
  totals: {
    totalRequested: number;
    totalGoogle: number;
    totalClutch: number;
    totalReceived: number;
    responseRate: number;
  };
}

interface TrendData {
  monthDate: string;
  monthLabel: string;
  requested: number;
  google: number;
  clutch: number;
  total: number;
}

interface ReviewData {
  reps: RepReviewData[];
  overall: {
    totalRequested: number;
    totalGoogle: number;
    totalClutch: number;
    totalReceived: number;
    responseRate: number;
  };
  trendData: TrendData[];
  lastUpdated: string;
}

interface SalesRep {
  id: string;
  name: string;
}

type ViewMode = 'monthly' | 'summary' | 'trend';

export default function ReviewsPage() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editData, setEditData] = useState<{
    id: string;
    salesRepId: string;
    monthStartDate: string;
    reviewsRequested: number;
    googleReviews: number;
    clutchReviews: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
    fetchReps();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reviews/data');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReps = async () => {
    try {
      const response = await fetch('/api/reps');
      if (response.ok) {
        const result = await response.json();
        setReps(result);
      }
    } catch (error) {
      console.error('Error fetching reps:', error);
    }
  };

  const handleEntrySuccess = () => {
    setShowEntryForm(false);
    setEditData(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading review data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews Dashboard</h1>
              {data && (
                <p className="text-sm text-gray-500">
                  Last updated: {new Date(data.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Navigation currentPage="reviews" />
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={() => {
                  setEditData(null);
                  setShowEntryForm(true);
                }}
                disabled={reps.length === 0}
                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Entry
              </button>
              <ChangeHistory entityType="ReviewEntry" onUndo={fetchData} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'monthly', label: 'Monthly' },
                { key: 'summary', label: 'Summary' },
                { key: 'trend', label: 'Trend' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key as ViewMode)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === tab.key
                      ? 'bg-white text-amber-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-900">Sales Rep:</label>
              <select
                value={selectedRep}
                onChange={(e) => setSelectedRep(e.target.value)}
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 text-sm text-gray-900"
              >
                <option value="all">All Reps</option>
                {data?.reps.map((rep) => (
                  <option key={rep.repId} value={rep.repId}>
                    {rep.repName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Stats */}
        {data && viewMode === 'summary' && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Reviews Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Requested</div>
                  <div className="text-3xl font-bold text-gray-600">{data.overall.totalRequested}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Google</div>
                  <div className="text-3xl font-bold text-blue-600">{data.overall.totalGoogle}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Clutch</div>
                  <div className="text-3xl font-bold text-orange-600">{data.overall.totalClutch}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Total Received</div>
                  <div className="text-3xl font-bold text-amber-600">{data.overall.totalReceived}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Response Rate</div>
                  <div className="text-3xl font-bold text-green-600">{data.overall.responseRate.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rep Cards - Summary View */}
        {viewMode === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReps.map((rep) => (
              <div key={rep.repId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{rep.repName}</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase">Requested</div>
                    <div className="text-xl font-bold text-gray-700">{rep.totals.totalRequested}</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase">Received</div>
                    <div className="text-xl font-bold text-amber-700">{rep.totals.totalReceived}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase">Google</div>
                    <div className="text-xl font-bold text-blue-700">{rep.totals.totalGoogle}</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase">Clutch</div>
                    <div className="text-xl font-bold text-orange-700">{rep.totals.totalClutch}</div>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Response Rate</span>
                    <span className={`text-sm font-bold ${rep.totals.responseRate >= 50 ? 'text-green-600' : rep.totals.responseRate >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {rep.totals.responseRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monthly View */}
        {viewMode === 'monthly' && (
          <div className="space-y-8">
            {filteredReps.map((rep) => (
              <div key={rep.repId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{rep.repName} - Monthly Reviews</h2>
                {rep.monthlyData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No review data yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Requested</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Google</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clutch</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Response Rate</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rep.monthlyData.map((entry, idx) => (
                          <tr key={entry.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{entry.monthLabel}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{entry.reviewsRequested}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 text-center font-medium">{entry.googleReviews}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 text-center font-medium">{entry.clutchReviews}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-amber-600 text-center">{entry.totalReceived}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <span className={entry.responseRate >= 50 ? 'text-green-600' : entry.responseRate >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                                {entry.responseRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <button
                                onClick={() => {
                                  setEditData({
                                    id: entry.id,
                                    salesRepId: rep.repId,
                                    monthStartDate: new Date(entry.monthDate).toISOString().split('T')[0],
                                    reviewsRequested: entry.reviewsRequested,
                                    googleReviews: entry.googleReviews,
                                    clutchReviews: entry.clutchReviews,
                                  });
                                  setShowEntryForm(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 mr-2"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {rep.monthlyData.length > 1 && (
                        <tfoot className="bg-amber-50">
                          <tr>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">Total</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center">{rep.totals.totalRequested}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-blue-600 text-center">{rep.totals.totalGoogle}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-orange-600 text-center">{rep.totals.totalClutch}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-amber-600 text-center">{rep.totals.totalReceived}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-center">
                              <span className={rep.totals.responseRate >= 50 ? 'text-green-600' : rep.totals.responseRate >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                                {rep.totals.responseRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Trend View */}
        {viewMode === 'trend' && data && (
          <div className="space-y-6">
            {data.trendData.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No trend data yet. Add entries to see trends.</p>
              </div>
            ) : (
              <>
                {/* Trend Chart */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Reviews Trend</h3>
                  <div className="h-64">
                    <div className="flex h-full items-end gap-2">
                      {data.trendData.map((month, idx) => {
                        const maxValue = Math.max(...data.trendData.map(d => Math.max(d.google, d.clutch, d.requested)));
                        const scale = maxValue > 0 ? 200 / maxValue : 1;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div className="flex gap-0.5 items-end h-52">
                              <div
                                className="w-3 bg-blue-500 rounded-t"
                                style={{ height: `${month.google * scale}px` }}
                                title={`Google: ${month.google}`}
                              />
                              <div
                                className="w-3 bg-orange-500 rounded-t"
                                style={{ height: `${month.clutch * scale}px` }}
                                title={`Clutch: ${month.clutch}`}
                              />
                            </div>
                            <span className="text-xs text-gray-500 truncate w-full text-center">
                              {month.monthLabel.split(' ')[0].slice(0, 3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded" />
                      <span className="text-sm text-gray-600">Google</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded" />
                      <span className="text-sm text-gray-600">Clutch</span>
                    </div>
                  </div>
                </div>

                {/* Trend Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Breakdown (All Reps)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Requested</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Google</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clutch</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Response Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.trendData.map((month, idx) => {
                          const responseRate = month.requested > 0 ? (month.total / month.requested) * 100 : 0;
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{month.monthLabel}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{month.requested}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 text-center font-medium">{month.google}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 text-center font-medium">{month.clutch}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-amber-600 text-center">{month.total}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                <span className={responseRate >= 50 ? 'text-green-600' : responseRate >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                                  {responseRate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {(!data || data.reps.every(r => r.monthlyData.length === 0)) && viewMode !== 'summary' && viewMode !== 'trend' && (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No review data yet</h2>
            <p className="mt-2 text-gray-600">Start tracking your reviews by adding an entry.</p>
          </div>
        )}
      </main>

      {/* Entry Form Modal */}
      {showEntryForm && (
        <ReviewEntryForm
          reps={reps}
          onSuccess={handleEntrySuccess}
          onCancel={() => {
            setShowEntryForm(false);
            setEditData(null);
          }}
          editData={editData || undefined}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Reviews Dashboard - Google & Clutch Review Tracking
          </p>
        </div>
      </footer>

      {/* AI Chat Assistant */}
      <ChatBot context="sales" data={data ? { reps: data.reps, overall: data.overall, lastUpdated: data.lastUpdated } : undefined} />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface TriageEntry {
  id: string;
  weekDate: string;
  weekLabel: string;
  triageBooked: number;
  triageTaken: number;
  qualifiedForIntro: number;
  showRate: number;
  qualificationRate: number;
}

interface RepTriageData {
  repId: string;
  repName: string;
  weeklyData: TriageEntry[];
  monthlySummaries: {
    month: string;
    booked: number;
    taken: number;
    qualified: number;
    showRate: number;
    qualificationRate: number;
  }[];
  totals: {
    totalBooked: number;
    totalTaken: number;
    totalQualified: number;
    showRate: number;
    qualificationRate: number;
  };
}

interface TriageData {
  reps: RepTriageData[];
  overall: {
    totalBooked: number;
    totalTaken: number;
    totalQualified: number;
    showRate: number;
    qualificationRate: number;
  };
  lastUpdated: string;
}

interface SalesRep {
  id: string;
  name: string;
}

type ViewMode = 'weekly' | 'monthly' | 'summary';

export default function TriagePage() {
  const [data, setData] = useState<TriageData | null>(null);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editEntry, setEditEntry] = useState<{
    id?: string;
    salesRepId: string;
    weekStartDate: string;
    triageBooked: number;
    triageTaken: number;
    qualifiedForIntro: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
    fetchReps();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/triage/data');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching triage data:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry) return;

    try {
      const url = editEntry.id
        ? `/api/triage/${editEntry.id}`
        : '/api/triage';
      const method = editEntry.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEntry),
      });

      if (response.ok) {
        setShowEntryForm(false);
        setEditEntry(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`/api/triage/${id}`, {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading triage data...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Triage Dashboard</h1>
              {data && (
                <p className="text-sm text-gray-500">
                  Last updated: {new Date(data.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Sales
              </a>
              <button
                onClick={() => {
                  setEditEntry({
                    salesRepId: reps[0]?.id || '',
                    weekStartDate: new Date().toISOString().split('T')[0],
                    triageBooked: 0,
                    triageTaken: 0,
                    qualifiedForIntro: 0,
                  });
                  setShowEntryForm(true);
                }}
                disabled={reps.length === 0}
                className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
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

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'weekly', label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'summary', label: 'Summary' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key as ViewMode)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === tab.key
                      ? 'bg-white text-teal-600 shadow-sm'
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
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm text-gray-900"
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
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Triage Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Triage Booked</div>
                  <div className="text-3xl font-bold text-teal-600">{data.overall.totalBooked}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Triage Taken</div>
                  <div className="text-3xl font-bold text-blue-600">{data.overall.totalTaken}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Show Rate</div>
                  <div className="text-3xl font-bold text-purple-600">{data.overall.showRate.toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Qualified for Intro</div>
                  <div className="text-3xl font-bold text-green-600">{data.overall.totalQualified}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Qualification Rate</div>
                  <div className="text-3xl font-bold text-emerald-600">{data.overall.qualificationRate.toFixed(1)}%</div>
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
                  <div className="bg-teal-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase">Booked</div>
                    <div className="text-xl font-bold text-teal-700">{rep.totals.totalBooked}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 uppercase">Taken</div>
                    <div className="text-xl font-bold text-blue-700">{rep.totals.totalTaken}</div>
                    <div className="text-xs text-gray-400">{rep.totals.showRate.toFixed(1)}% show</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 col-span-2">
                    <div className="text-xs text-gray-500 uppercase">Qualified for Intro</div>
                    <div className="text-xl font-bold text-green-700">{rep.totals.totalQualified}</div>
                    <div className="text-xs text-gray-400">{rep.totals.qualificationRate.toFixed(1)}% qual rate</div>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Booked to Qualified</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {rep.totals.totalBooked > 0
                        ? ((rep.totals.totalQualified / rep.totals.totalBooked) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Weekly View */}
        {viewMode === 'weekly' && (
          <div className="space-y-8">
            {filteredReps.map((rep) => (
              <div key={rep.repId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{rep.repName} - Weekly Triage</h2>
                {rep.weeklyData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No triage data yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Booked</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Taken</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Show Rate</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qualified</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qual Rate</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rep.weeklyData.map((entry, idx) => (
                          <tr key={entry.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{entry.weekLabel}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{entry.triageBooked}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{entry.triageTaken}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <span className={entry.showRate >= 80 ? 'text-green-600' : entry.showRate >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                                {entry.showRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">{entry.qualifiedForIntro}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <span className={entry.qualificationRate >= 50 ? 'text-green-600' : entry.qualificationRate >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                                {entry.qualificationRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <button
                                onClick={() => {
                                  setEditEntry({
                                    id: entry.id,
                                    salesRepId: rep.repId,
                                    weekStartDate: new Date(entry.weekDate).toISOString().split('T')[0],
                                    triageBooked: entry.triageBooked,
                                    triageTaken: entry.triageTaken,
                                    qualifiedForIntro: entry.qualifiedForIntro,
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
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Monthly View */}
        {viewMode === 'monthly' && (
          <div className="space-y-8">
            {filteredReps.map((rep) => (
              <div key={rep.repId} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{rep.repName} - Monthly Triage</h2>
                {rep.monthlySummaries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No monthly data yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Booked</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Taken</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Show Rate</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qualified</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qual Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rep.monthlySummaries.map((month, idx) => (
                          <tr key={month.month} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{month.booked}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{month.taken}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <span className={month.showRate >= 80 ? 'text-green-600' : month.showRate >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                                {month.showRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">{month.qualified}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <span className={month.qualificationRate >= 50 ? 'text-green-600' : month.qualificationRate >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                                {month.qualificationRate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {(!data || data.reps.every(r => r.weeklyData.length === 0)) && viewMode !== 'summary' && (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No triage data yet</h2>
            <p className="mt-2 text-gray-600">Start tracking your triage calls by adding an entry.</p>
          </div>
        )}
      </main>

      {/* Entry Form Modal */}
      {showEntryForm && editEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editEntry.id ? 'Edit Triage Entry' : 'Add Triage Entry'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Rep</label>
                <select
                  value={editEntry.salesRepId}
                  onChange={(e) => setEditEntry({ ...editEntry, salesRepId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-gray-900"
                  disabled={!!editEntry.id}
                >
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>{rep.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Start Date</label>
                <input
                  type="date"
                  value={editEntry.weekStartDate}
                  onChange={(e) => setEditEntry({ ...editEntry, weekStartDate: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-gray-900"
                  disabled={!!editEntry.id}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booked</label>
                  <input
                    type="number"
                    min="0"
                    value={editEntry.triageBooked}
                    onChange={(e) => setEditEntry({ ...editEntry, triageBooked: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taken</label>
                  <input
                    type="number"
                    min="0"
                    value={editEntry.triageTaken}
                    onChange={(e) => setEditEntry({ ...editEntry, triageTaken: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualified</label>
                  <input
                    type="number"
                    min="0"
                    value={editEntry.qualifiedForIntro}
                    onChange={(e) => setEditEntry({ ...editEntry, qualifiedForIntro: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-gray-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEntryForm(false);
                    setEditEntry(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  {editEntry.id ? 'Update' : 'Add'} Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Triage Dashboard - Call Qualification Tracking
          </p>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ChangeHistory } from '@/components/ChangeHistory';
import { MarketingTriageEntryForm } from '@/components/marketing/MarketingTriageEntryForm';

interface MarketingChannel {
  id: string;
  name: string;
}

interface MarketingTriageEntry {
  id: string;
  weekDate: string;
  weekLabel: string;
  leadsReceived: number;
  leadsContacted: number;
  leadsQualified: number;
  contactRate: number;
  qualificationRate: number;
}

interface ChannelData {
  id: string;
  name: string;
  weeklyData: MarketingTriageEntry[];
  monthlySummaries: {
    month: string;
    leadsReceived: number;
    leadsContacted: number;
    leadsQualified: number;
    contactRate: number;
    qualificationRate: number;
  }[];
  totals: {
    leadsReceived: number;
    leadsContacted: number;
    leadsQualified: number;
    contactRate: number;
    qualificationRate: number;
  };
}

interface DashboardData {
  channels: ChannelData[];
  overallTotals: {
    leadsReceived: number;
    leadsContacted: number;
    leadsQualified: number;
    contactRate: number;
    qualificationRate: number;
  };
  lastUpdated: string;
}

type ViewMode = 'weekly' | 'monthly' | 'summary';

export default function MarketingTriageDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editWeek, setEditWeek] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchData();
    fetchChannels();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketing-triage/data');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/marketing/channels');
      if (response.ok) {
        const result = await response.json();
        setChannels(result);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const handleEntrySuccess = () => {
    setShowEntryForm(false);
    setEditWeek(undefined);
    fetchData();
  };

  const handleDeleteWeek = async (weekDate: string) => {
    if (!confirm('Are you sure you want to delete all triage data for this week?')) return;

    try {
      // Get all entries for this week and delete them
      const channelData = data?.channels || [];
      for (const channel of channelData) {
        const entry = channel.weeklyData.find(e => e.weekDate.split('T')[0] === weekDate.split('T')[0]);
        if (entry) {
          await fetch(`/api/marketing-triage/${entry.id}`, { method: 'DELETE' });
        }
      }
      fetchData();
    } catch (error) {
      console.error('Error deleting week:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading triage data...</p>
        </div>
      </div>
    );
  }

  const filteredChannels = data
    ? selectedChannel === 'all'
      ? data.channels
      : data.channels.filter((c) => c.id === selectedChannel)
    : [];

  // Get unique weeks across all channels for the weekly view
  const allWeeks = new Map<string, { weekDate: string; weekLabel: string }>();
  data?.channels.forEach(channel => {
    channel.weeklyData.forEach(entry => {
      const key = entry.weekDate.split('T')[0];
      if (!allWeeks.has(key)) {
        allWeeks.set(key, { weekDate: entry.weekDate, weekLabel: entry.weekLabel });
      }
    });
  });
  const sortedWeeks = Array.from(allWeeks.values()).sort(
    (a, b) => new Date(b.weekDate).getTime() - new Date(a.weekDate).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Triage Dashboard</h1>
              <p className="text-sm text-gray-500">Track lead qualification by marketing channel</p>
            </div>
            <div className="flex gap-2">
              <a
                href="/marketing"
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Marketing
              </a>
              <button
                onClick={() => {
                  setEditWeek(undefined);
                  setShowEntryForm(true);
                }}
                disabled={channels.length === 0}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Entry
              </button>
              <ChangeHistory entityType="MarketingTriageEntry" onUndo={fetchData} />
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
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-900">Channel:</label>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm text-gray-900"
              >
                <option value="all">All Channels</option>
                {data?.channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 uppercase">Leads Received</div>
              <div className="text-2xl font-bold text-purple-600">
                {selectedChannel === 'all'
                  ? data.overallTotals.leadsReceived
                  : filteredChannels[0]?.totals.leadsReceived || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 uppercase">Leads Contacted</div>
              <div className="text-2xl font-bold text-blue-600">
                {selectedChannel === 'all'
                  ? data.overallTotals.leadsContacted
                  : filteredChannels[0]?.totals.leadsContacted || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 uppercase">Leads Qualified</div>
              <div className="text-2xl font-bold text-green-600">
                {selectedChannel === 'all'
                  ? data.overallTotals.leadsQualified
                  : filteredChannels[0]?.totals.leadsQualified || 0}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 uppercase">Contact Rate</div>
              <div className="text-2xl font-bold text-orange-600">
                {(selectedChannel === 'all'
                  ? data.overallTotals.contactRate
                  : filteredChannels[0]?.totals.contactRate || 0
                ).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 uppercase">Qualification Rate</div>
              <div className="text-2xl font-bold text-teal-600">
                {(selectedChannel === 'all'
                  ? data.overallTotals.qualificationRate
                  : filteredChannels[0]?.totals.qualificationRate || 0
                ).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Weekly View - All channels per week (like Marketing dashboard) */}
        {viewMode === 'weekly' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Triage Data</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                    {(selectedChannel === 'all' ? channels : channels.filter(c => c.id === selectedChannel)).map(ch => (
                      <th key={ch.id} colSpan={3} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-200">
                        {ch.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-200">Actions</th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2"></th>
                    {(selectedChannel === 'all' ? channels : channels.filter(c => c.id === selectedChannel)).map(ch => (
                      <React.Fragment key={ch.id}>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-400 border-l border-gray-200">Rcvd</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-400">Cntd</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-400">Qual</th>
                      </React.Fragment>
                    ))}
                    <th className="px-4 py-2 border-l border-gray-200"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedWeeks.length === 0 ? (
                    <tr>
                      <td colSpan={100} className="px-4 py-8 text-center text-gray-500">
                        No data yet. Click &quot;Add Entry&quot; to get started.
                      </td>
                    </tr>
                  ) : (
                    sortedWeeks.map((week) => {
                      const displayChannels = selectedChannel === 'all' ? channels : channels.filter(c => c.id === selectedChannel);
                      return (
                        <tr key={week.weekDate} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{week.weekLabel}</td>
                          {displayChannels.map(ch => {
                            const channelData = data?.channels.find(c => c.id === ch.id);
                            const entry = channelData?.weeklyData.find(e => e.weekDate.split('T')[0] === week.weekDate.split('T')[0]);
                            return (
                              <React.Fragment key={ch.id}>
                                <td className="px-2 py-3 text-sm text-center text-gray-900 border-l border-gray-100">
                                  {entry?.leadsReceived || 0}
                                </td>
                                <td className="px-2 py-3 text-sm text-center text-gray-900">
                                  {entry?.leadsContacted || 0}
                                </td>
                                <td className="px-2 py-3 text-sm text-center text-gray-900">
                                  {entry?.leadsQualified || 0}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="px-4 py-3 text-sm text-center border-l border-gray-100">
                            <button
                              onClick={() => {
                                setEditWeek(week.weekDate.split('T')[0]);
                                setShowEntryForm(true);
                              }}
                              className="text-purple-600 hover:text-purple-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteWeek(week.weekDate)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly View */}
        {viewMode === 'monthly' && (
          <div className="space-y-6">
            {filteredChannels.map((channel) => (
              <div key={channel.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">{channel.name}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Contacted</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qualified</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Contact %</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qual %</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {channel.monthlySummaries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No monthly data available.
                          </td>
                        </tr>
                      ) : (
                        channel.monthlySummaries.map((month, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{month.month}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{month.leadsReceived}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{month.leadsContacted}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{month.leadsQualified}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{month.contactRate.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{month.qualificationRate.toFixed(1)}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary View */}
        {viewMode === 'summary' && data && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Channel Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Received</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Contacted</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Qualified</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Contact Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qual Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.channels.map((channel) => (
                    <tr key={channel.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{channel.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{channel.totals.leadsReceived}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{channel.totals.leadsContacted}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{channel.totals.leadsQualified}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{channel.totals.contactRate.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{channel.totals.qualificationRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{data.overallTotals.leadsReceived}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{data.overallTotals.leadsContacted}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{data.overallTotals.leadsQualified}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{data.overallTotals.contactRate.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{data.overallTotals.qualificationRate.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Triage Dashboard - Lead Qualification Tracking
          </p>
        </div>
      </footer>

      {/* Entry Form Modal */}
      {showEntryForm && (
        <MarketingTriageEntryForm
          channels={channels}
          onSuccess={handleEntrySuccess}
          onCancel={() => {
            setShowEntryForm(false);
            setEditWeek(undefined);
          }}
          editWeek={editWeek}
        />
      )}
    </div>
  );
}

// Need to import React for fragments
import React from 'react';

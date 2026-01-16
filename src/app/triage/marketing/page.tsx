'use client';

import React, { useState, useEffect } from 'react';
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
}

interface ChannelData {
  id: string;
  name: string;
  weeklyData: MarketingTriageEntry[];
  monthlySummaries: {
    month: string;
    leadsReceived: number;
  }[];
  totalLeadsReceived: number;
}

interface DashboardData {
  channels: ChannelData[];
  overallTotal: number;
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
    if (!confirm('Are you sure you want to delete all lead data for this week?')) return;

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
          <p className="text-gray-600">Loading data...</p>
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
              <p className="text-sm text-gray-500">Track leads received by marketing channel</p>
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
        {/* Summary Card */}
        {data && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase mb-1">Total Leads Received</div>
              <div className="text-4xl font-bold text-purple-600">
                {selectedChannel === 'all'
                  ? data.overallTotal
                  : filteredChannels[0]?.totalLeadsReceived || 0}
              </div>
            </div>
          </div>
        )}

        {/* Weekly View - All channels per week */}
        {viewMode === 'weekly' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Leads Received</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                    {(selectedChannel === 'all' ? channels : channels.filter(c => c.id === selectedChannel)).map(ch => (
                      <th key={ch.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {ch.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                      let weekTotal = 0;

                      return (
                        <tr key={week.weekDate} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">{week.weekLabel}</td>
                          {displayChannels.map(ch => {
                            const channelData = data?.channels.find(c => c.id === ch.id);
                            const entry = channelData?.weeklyData.find(e => e.weekDate.split('T')[0] === week.weekDate.split('T')[0]);
                            const leads = entry?.leadsReceived || 0;
                            weekTotal += leads;
                            return (
                              <td key={ch.id} className="px-4 py-3 text-sm text-center text-gray-900">
                                {leads}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-sm text-center font-bold text-purple-600 bg-purple-50">
                            {weekTotal}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
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
                {sortedWeeks.length > 0 && (
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">All Time Total</td>
                      {(selectedChannel === 'all' ? channels : channels.filter(c => c.id === selectedChannel)).map(ch => {
                        const channelData = data?.channels.find(c => c.id === ch.id);
                        return (
                          <td key={ch.id} className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                            {channelData?.totalLeadsReceived || 0}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-sm text-center font-bold text-purple-700 bg-purple-100">
                        {selectedChannel === 'all' ? data?.overallTotal || 0 : filteredChannels[0]?.totalLeadsReceived || 0}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Monthly View */}
        {viewMode === 'monthly' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Leads Received</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    {(selectedChannel === 'all' ? channels : channels.filter(c => c.id === selectedChannel)).map(ch => (
                      <th key={ch.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {ch.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Get all unique months
                    const allMonths = new Set<string>();
                    filteredChannels.forEach(ch => {
                      ch.monthlySummaries.forEach(m => allMonths.add(m.month));
                    });
                    const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                    if (sortedMonths.length === 0) {
                      return (
                        <tr>
                          <td colSpan={100} className="px-4 py-8 text-center text-gray-500">
                            No monthly data available.
                          </td>
                        </tr>
                      );
                    }

                    return sortedMonths.map((month) => {
                      const displayChannels = selectedChannel === 'all' ? channels : channels.filter(c => c.id === selectedChannel);
                      let monthTotal = 0;

                      return (
                        <tr key={month} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{month}</td>
                          {displayChannels.map(ch => {
                            const channelData = data?.channels.find(c => c.id === ch.id);
                            const monthData = channelData?.monthlySummaries.find(m => m.month === month);
                            const leads = monthData?.leadsReceived || 0;
                            monthTotal += leads;
                            return (
                              <td key={ch.id} className="px-4 py-3 text-sm text-center text-gray-900">
                                {leads}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-sm text-center font-bold text-purple-600 bg-purple-50">
                            {monthTotal}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Leads Received</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.channels.map((channel) => (
                    <tr key={channel.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{channel.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{channel.totalLeadsReceived}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {data.overallTotal > 0 ? ((channel.totalLeadsReceived / data.overallTotal) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-purple-700">{data.overallTotal}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-500">100%</td>
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
            Triage Dashboard - Leads Received by Channel
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

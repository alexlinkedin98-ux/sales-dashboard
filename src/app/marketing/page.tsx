'use client';

import { useState, useEffect } from 'react';
import { MarketingEntryForm } from '@/components/marketing/MarketingEntryForm';
import { ChannelManager } from '@/components/marketing/ChannelManager';
import {
  MarketingTrendChart,
  MarketingComparisonChart,
  MarketingMonthlyTrendChart,
  MarketingCostMetricChart,
} from '@/components/marketing/MarketingCharts';

type ViewMode = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'comparison';

interface MarketingChannel {
  id: string;
  name: string;
}

interface MonthlyStats {
  channelId: string;
  monthStartDate: string;
  monthLabel: string;
  spend: number;
  clientsClosed: number;
}

interface WeeklyData {
  id: string;
  week: string;
  weekDate: Date;
  leadsGenerated: number;
}

interface MonthlySummary {
  month: string;
  totalLeads: number;
  weekCount: number;
  avgLeadsPerWeek: number;
}

interface QuarterlySummary {
  quarter: string;
  totalLeads: number;
  weekCount: number;
  avgLeadsPerWeek: number;
}

interface ChannelData {
  name: string;
  weeklyData: WeeklyData[];
  monthlySummaries: MonthlySummary[];
  quarterlySummaries: QuarterlySummary[];
  allTimeTotal: number;
}

interface MarketingData {
  channels: ChannelData[];
  combinedWeeklyData: { week: string; weekDate: Date; leadsGenerated: number }[];
  lastUpdated: string;
}

// Build week-based data structure for the table
interface WeekRow {
  week: string;
  weekDate: string;
  channelData: Record<string, number>;
  total: number;
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export default function MarketingDashboard() {
  const [data, setData] = useState<MarketingData | null>(null);
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [compareChannels, setCompareChannels] = useState<Set<string>>(new Set());

  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showChannelManager, setShowChannelManager] = useState(false);
  const [editWeek, setEditWeek] = useState<string | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set());

  // Monthly stats state
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [editingStats, setEditingStats] = useState<Record<string, { spend: number; clientsClosed: number }>>({});
  const [savingStats, setSavingStats] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dataRes, channelsRes, statsRes] = await Promise.all([
        fetch('/api/marketing/data'),
        fetch('/api/marketing/channels'),
        fetch('/api/marketing/monthly-stats'),
      ]);

      if (!dataRes.ok || !channelsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const marketingData = await dataRes.json();
      const channelsList = await channelsRes.json();
      const stats = statsRes.ok ? await statsRes.json() : [];

      setData(marketingData);
      setChannels(channelsList);
      setMonthlyStats(stats);

      if (marketingData.channels.length > 0 && marketingData.channels[0].monthlySummaries.length > 0) {
        setSelectedMonth(
          marketingData.channels[0].monthlySummaries[
            marketingData.channels[0].monthlySummaries.length - 1
          ].month
        );
      }

      const channelsWithData = marketingData.channels
        .filter((ch: ChannelData) => ch.monthlySummaries.length > 0)
        .map((ch: ChannelData) => ch.name);
      setCompareChannels(new Set(channelsWithData));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEntrySuccess = () => {
    setShowEntryForm(false);
    setEditWeek(null);
    fetchData();
  };

  const handleChannelUpdate = () => {
    fetchData();
    fetch('/api/marketing/channels')
      .then((res) => res.json())
      .then(setChannels);
  };

  const handleDeleteWeek = async (weekDate: string) => {
    if (!confirm('Are you sure you want to delete all entries for this week?')) return;

    try {
      const response = await fetch(`/api/marketing/entries?weekDate=${weekDate}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to delete entries');
      }
    } catch (error) {
      console.error('Error deleting week:', error);
      alert('Failed to delete entries');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedWeeks.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedWeeks.size} week(s) of entries?`)) return;

    try {
      const deletePromises = Array.from(selectedWeeks).map((weekDate) =>
        fetch(`/api/marketing/entries?weekDate=${weekDate}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      setSelectedWeeks(new Set());
      fetchData();
    } catch (error) {
      console.error('Error bulk deleting weeks:', error);
      alert('Failed to delete some entries');
    }
  };

  const toggleWeekSelection = (weekDate: string) => {
    const newSelected = new Set(selectedWeeks);
    if (newSelected.has(weekDate)) {
      newSelected.delete(weekDate);
    } else {
      newSelected.add(weekDate);
    }
    setSelectedWeeks(newSelected);
  };

  const toggleAllWeeks = () => {
    if (selectedWeeks.size === weekRows.length) {
      setSelectedWeeks(new Set());
    } else {
      setSelectedWeeks(new Set(weekRows.map((row) => row.weekDate)));
    }
  };

  // Initialize editing stats when month changes
  useEffect(() => {
    if (selectedMonth && channels.length > 0) {
      const newEditingStats: Record<string, { spend: number; clientsClosed: number }> = {};
      channels.forEach((ch) => {
        const stats = monthlyStats.find(
          (s) => s.channelId === ch.id && s.monthLabel === selectedMonth
        );
        newEditingStats[ch.id] = {
          spend: stats?.spend || 0,
          clientsClosed: stats?.clientsClosed || 0,
        };
      });
      setEditingStats(newEditingStats);
    }
  }, [selectedMonth, channels, monthlyStats]);

  // Save monthly stats for a channel
  const saveMonthlyStats = async (channelId: string) => {
    if (!selectedMonth) return;

    setSavingStats(true);
    try {
      // Parse selected month to get first day of month
      const monthDate = new Date(selectedMonth + ' 1');
      const monthStartDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

      await fetch('/api/marketing/monthly-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          monthStartDate: monthStartDate.toISOString(),
          monthLabel: selectedMonth,
          spend: editingStats[channelId]?.spend || 0,
          clientsClosed: editingStats[channelId]?.clientsClosed || 0,
        }),
      });

      // Refresh stats
      const statsRes = await fetch('/api/marketing/monthly-stats');
      if (statsRes.ok) {
        setMonthlyStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Error saving monthly stats:', err);
    } finally {
      setSavingStats(false);
    }
  };

  // Save all monthly stats at once
  const saveAllMonthlyStats = async () => {
    setSavingStats(true);
    try {
      const monthDate = new Date(selectedMonth + ' 1');
      const monthStartDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

      await Promise.all(
        channels.map((ch) =>
          fetch('/api/marketing/monthly-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelId: ch.id,
              monthStartDate: monthStartDate.toISOString(),
              monthLabel: selectedMonth,
              spend: editingStats[ch.id]?.spend || 0,
              clientsClosed: editingStats[ch.id]?.clientsClosed || 0,
            }),
          })
        )
      );

      // Refresh stats
      const statsRes = await fetch('/api/marketing/monthly-stats');
      if (statsRes.ok) {
        setMonthlyStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Error saving monthly stats:', err);
    } finally {
      setSavingStats(false);
    }
  };

  // Build week rows from channel data
  const buildWeekRows = (): WeekRow[] => {
    if (!data) return [];

    const weekMap = new Map<string, WeekRow>();

    data.channels.forEach((channel) => {
      channel.weeklyData.forEach((week) => {
        const weekDate = new Date(week.weekDate).toISOString().split('T')[0];
        if (!weekMap.has(weekDate)) {
          weekMap.set(weekDate, {
            week: week.week,
            weekDate,
            channelData: {},
            total: 0,
          });
        }
        const row = weekMap.get(weekDate)!;
        row.channelData[channel.name] = week.leadsGenerated;
        row.total += week.leadsGenerated;
      });
    });

    return Array.from(weekMap.values()).sort(
      (a, b) => new Date(b.weekDate).getTime() - new Date(a.weekDate).getTime()
    );
  };

  const weekRows = buildWeekRows();

  // Build monthly summary data
  const buildMonthlySummary = () => {
    if (!data || !selectedMonth) return null;

    const summary: Record<string, number> = {};
    let total = 0;

    data.channels.forEach((channel) => {
      const monthData = channel.monthlySummaries.find((m) => m.month === selectedMonth);
      summary[channel.name] = monthData?.totalLeads || 0;
      total += monthData?.totalLeads || 0;
    });

    // Get previous month data for comparison
    const prevSummary: Record<string, number> = {};
    let prevTotal = 0;
    const allMonths = Array.from(
      new Set(data.channels.flatMap((ch) => ch.monthlySummaries.map((m) => m.month)))
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const monthIndex = allMonths.indexOf(selectedMonth);
    const prevMonth = monthIndex > 0 ? allMonths[monthIndex - 1] : null;

    if (prevMonth) {
      data.channels.forEach((channel) => {
        const monthData = channel.monthlySummaries.find((m) => m.month === prevMonth);
        prevSummary[channel.name] = monthData?.totalLeads || 0;
        prevTotal += monthData?.totalLeads || 0;
      });
    }

    return { summary, total, prevSummary, prevTotal, prevMonth };
  };

  // Build quarterly summary data
  const buildQuarterlySummary = () => {
    if (!data) return [];

    const quarterMap = new Map<string, { summary: Record<string, number>; total: number }>();

    data.channels.forEach((channel) => {
      channel.quarterlySummaries.forEach((q) => {
        if (!quarterMap.has(q.quarter)) {
          quarterMap.set(q.quarter, { summary: {}, total: 0 });
        }
        const row = quarterMap.get(q.quarter)!;
        row.summary[channel.name] = q.totalLeads;
        row.total += q.totalLeads;
      });
    });

    return Array.from(quarterMap.entries())
      .sort((a, b) => {
        const [qA, yA] = a[0].split(' ');
        const [qB, yB] = b[0].split(' ');
        if (yA !== yB) return parseInt(yB) - parseInt(yA);
        return parseInt(qB.slice(1)) - parseInt(qA.slice(1));
      })
      .map(([quarter, data]) => ({ quarter, ...data }));
  };

  // Build monthly trend data for chart
  const buildMonthlyTrendData = () => {
    if (!data) return [];

    const monthTotals = new Map<string, number>();
    data.channels.forEach((channel) => {
      channel.monthlySummaries.forEach((m) => {
        const current = monthTotals.get(m.month) || 0;
        monthTotals.set(m.month, current + m.totalLeads);
      });
    });

    return Array.from(monthTotals.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, leads]) => ({ month, leads }));
  };

  const monthlyTrendData = buildMonthlyTrendData();

  // Build monthly cost metrics data for charts
  const buildMonthlyCostData = () => {
    if (!data || !monthlyStats.length) return [];

    const monthData = new Map<string, { leads: number; spend: number; clients: number }>();

    // Get leads per month
    data.channels.forEach((channel) => {
      channel.monthlySummaries.forEach((m) => {
        const current = monthData.get(m.month) || { leads: 0, spend: 0, clients: 0 };
        monthData.set(m.month, { ...current, leads: current.leads + m.totalLeads });
      });
    });

    // Add spend and clients from monthly stats
    monthlyStats.forEach((stat) => {
      const current = monthData.get(stat.monthLabel);
      if (current) {
        monthData.set(stat.monthLabel, {
          ...current,
          spend: current.spend + stat.spend,
          clients: current.clients + stat.clientsClosed,
        });
      }
    });

    return Array.from(monthData.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, d]) => ({
        month,
        leads: d.leads,
        spend: d.spend,
        clients: d.clients,
        costPerLead: d.leads > 0 ? d.spend / d.leads : 0,
        costPerAcquisition: d.clients > 0 ? d.spend / d.clients : 0,
      }));
  };

  const monthlyCostData = buildMonthlyCostData();

  // Get quarterly cost metrics
  const getQuarterlyStatsForQuarter = (quarter: string) => {
    // Parse quarter like "Q4 2025" to get months
    const [q, year] = quarter.split(' ');
    const quarterNum = parseInt(q.slice(1));
    const startMonth = (quarterNum - 1) * 3;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    const quarterMonths = [
      `${monthNames[startMonth]} ${year}`,
      `${monthNames[startMonth + 1]} ${year}`,
      `${monthNames[startMonth + 2]} ${year}`,
    ];

    let totalSpend = 0;
    let totalClients = 0;

    monthlyStats.forEach((stat) => {
      if (quarterMonths.includes(stat.monthLabel)) {
        totalSpend += stat.spend;
        totalClients += stat.clientsClosed;
      }
    });

    return { spend: totalSpend, clients: totalClients };
  };

  // Build annual summary data
  const buildAnnualSummary = () => {
    if (!data) return [];

    const yearMap = new Map<string, {
      summary: Record<string, number>;
      total: number;
      spend: number;
      clients: number;
    }>();

    // Aggregate leads by year from weekly data
    data.channels.forEach((channel) => {
      channel.weeklyData.forEach((week) => {
        const year = new Date(week.weekDate).getFullYear().toString();
        if (!yearMap.has(year)) {
          yearMap.set(year, { summary: {}, total: 0, spend: 0, clients: 0 });
        }
        const row = yearMap.get(year)!;
        row.summary[channel.name] = (row.summary[channel.name] || 0) + week.leadsGenerated;
        row.total += week.leadsGenerated;
      });
    });

    // Add spend and clients from monthly stats
    monthlyStats.forEach((stat) => {
      const year = new Date(stat.monthStartDate).getFullYear().toString();
      const row = yearMap.get(year);
      if (row) {
        row.spend += stat.spend;
        row.clients += stat.clientsClosed;
      }
    });

    return Array.from(yearMap.entries())
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .map(([year, d]) => ({
        year,
        ...d,
        costPerLead: d.total > 0 ? d.spend / d.total : 0,
        costPerAcquisition: d.clients > 0 ? d.spend / d.clients : 0,
      }));
  };

  const annualSummary = buildAnnualSummary();

  // Get available years for filtering
  const availableYears = data
    ? Array.from(new Set(
        data.channels.flatMap((ch) =>
          ch.weeklyData.map((w) => new Date(w.weekDate).getFullYear().toString())
        )
      )).sort((a, b) => parseInt(b) - parseInt(a))
    : [];

  const allMonths = data
    ? Array.from(
        new Set(data.channels.flatMap((ch) => ch.monthlySummaries.map((m) => m.month)))
      ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    : [];

  const viewTabs: { mode: ViewMode; label: string }[] = [
    { mode: 'weekly', label: 'Weekly' },
    { mode: 'monthly', label: 'Monthly' },
    { mode: 'quarterly', label: 'Quarterly' },
    { mode: 'annual', label: 'Annual' },
    { mode: 'comparison', label: 'Comparison' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading marketing data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  const channelNames = data?.channels.map((ch) => ch.name) || [];
  const monthlySummary = buildMonthlySummary();
  const quarterlySummary = buildQuarterlySummary();

  // Calculate all-time totals per channel
  const channelTotals: Record<string, number> = {};
  data?.channels.forEach((ch) => {
    channelTotals[ch.name] = ch.allTimeTotal;
  });
  const grandTotal = Object.values(channelTotals).reduce((sum, v) => sum + v, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Marketing Channels Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Track lead generation across marketing channels
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Sales Dashboard
              </a>
              <a
                href="/call-analysis"
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors"
              >
                Call Analysis
              </a>
              <button
                onClick={() => setShowChannelManager(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Manage Channels
              </button>
              <button
                onClick={() => {
                  setEditWeek(null);
                  setShowEntryForm(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      </header>

      {showEntryForm && (
        <MarketingEntryForm
          channels={channels}
          onSuccess={handleEntrySuccess}
          onCancel={() => {
            setShowEntryForm(false);
            setEditWeek(null);
          }}
          editWeek={editWeek || undefined}
        />
      )}

      {showChannelManager && (
        <ChannelManager
          channels={channels}
          onUpdate={handleChannelUpdate}
          onClose={() => setShowChannelManager(false)}
        />
      )}

      {data && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex gap-2">
              {viewTabs.map((tab) => (
                <button
                  key={tab.mode}
                  onClick={() => setViewMode(tab.mode)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === tab.mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              {viewMode === 'comparison' && (
                <>
                  <label className="text-sm font-medium text-gray-900">Compare:</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {channelNames.map((name) => (
                      <label key={name} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareChannels.has(name)}
                          onChange={(e) => {
                            const newSet = new Set(compareChannels);
                            if (e.target.checked) {
                              newSet.add(name);
                            } else {
                              newSet.delete(name);
                            }
                            setCompareChannels(newSet);
                          }}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{name}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {viewMode === 'monthly' && allMonths.length > 0 && (
                <>
                  <label className="text-sm font-medium text-gray-900">Month:</label>
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

          {/* Weekly View - Weeks as rows, Channels as columns */}
          {viewMode === 'weekly' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Weekly Data
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      (All Time: {grandTotal} leads)
                    </span>
                  </h2>
                  {selectedWeeks.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Delete Selected ({selectedWeeks.size})
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                          <input
                            type="checkbox"
                            checked={weekRows.length > 0 && selectedWeeks.size === weekRows.length}
                            onChange={toggleAllWeeks}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Week
                        </th>
                        {channelNames.map((name) => (
                          <th
                            key={name}
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {name}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                          Total
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {weekRows.map((row, idx) => (
                        <tr key={row.weekDate} className={`${idx === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'} ${selectedWeeks.has(row.weekDate) ? 'bg-blue-100' : ''}`}>
                          <td className="px-2 py-3 whitespace-nowrap text-center">
                            <input
                              type="checkbox"
                              checked={selectedWeeks.has(row.weekDate)}
                              onChange={() => toggleWeekSelection(row.weekDate)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.week}
                          </td>
                          {channelNames.map((name) => (
                            <td
                              key={name}
                              className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900"
                            >
                              {row.channelData[name] || 0}
                            </td>
                          ))}
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold text-blue-700 bg-blue-50">
                            {row.total}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            <button
                              onClick={() => {
                                setEditWeek(row.weekDate);
                                setShowEntryForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteWeek(row.weekDate)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {weekRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={channelNames.length + 4}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No data yet. Click "Add Entry" to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {weekRows.length > 0 && (
                      <tfoot className="bg-gray-100">
                        <tr>
                          <td></td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">
                            All Time Total
                          </td>
                          {channelNames.map((name) => (
                            <td
                              key={name}
                              className="px-4 py-3 text-sm text-center font-bold text-gray-900"
                            >
                              {channelTotals[name] || 0}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-sm text-center font-bold text-blue-700 bg-blue-100">
                            {grandTotal}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {data.combinedWeeklyData.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <MarketingTrendChart
                    data={data.combinedWeeklyData}
                    title="Total Leads Generated - Weekly Trend"
                    color="#3B82F6"
                  />
                </div>
              )}
            </div>
          )}

          {/* Monthly View */}
          {viewMode === 'monthly' && monthlySummary && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedMonth} Summary
                  </h2>
                  <button
                    onClick={saveAllMonthlyStats}
                    disabled={savingStats}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {savingStats ? 'Saving...' : 'Save All'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Channel
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Leads
                        </th>
                        {monthlySummary.prevMonth && (
                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            vs Prev
                          </th>
                        )}
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                          Spend ($)
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">
                          Clients Closed
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                          Cost/Lead
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                          Cost/Acquisition
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {channelNames.map((name) => {
                        const channel = channels.find((ch) => ch.name === name);
                        const channelId = channel?.id || '';
                        const current = monthlySummary.summary[name] || 0;
                        const prev = monthlySummary.prevSummary[name] || 0;
                        const change = monthlySummary.prevMonth ? calcChange(current, prev) : null;

                        const spend = editingStats[channelId]?.spend || 0;
                        const clientsClosed = editingStats[channelId]?.clientsClosed || 0;
                        const costPerLead = current > 0 ? spend / current : 0;
                        const costPerAcquisition = clientsClosed > 0 ? spend / clientsClosed : 0;

                        return (
                          <tr key={name} className="hover:bg-gray-50">
                            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {name}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-900">
                              {current}
                            </td>
                            {monthlySummary.prevMonth && (
                              <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                                {change !== null ? (
                                  <span
                                    className={`font-medium ${
                                      change > 0
                                        ? 'text-green-600'
                                        : change < 0
                                        ? 'text-red-600'
                                        : 'text-gray-500'
                                    }`}
                                  >
                                    {change > 0 ? '+' : ''}
                                    {change.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            )}
                            <td className="px-3 py-3 whitespace-nowrap bg-yellow-50">
                              <input
                                type="number"
                                value={spend || ''}
                                onChange={(e) =>
                                  setEditingStats((prev) => ({
                                    ...prev,
                                    [channelId]: {
                                      ...prev[channelId],
                                      spend: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                placeholder="0"
                                min="0"
                                step="0.01"
                                className="w-24 rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-right"
                              />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap bg-purple-50">
                              <input
                                type="number"
                                value={clientsClosed || ''}
                                onChange={(e) =>
                                  setEditingStats((prev) => ({
                                    ...prev,
                                    [channelId]: {
                                      ...prev[channelId],
                                      clientsClosed: parseInt(e.target.value) || 0,
                                    },
                                  }))
                                }
                                placeholder="0"
                                min="0"
                                className="w-20 rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-right"
                              />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-blue-50">
                              {spend > 0 && current > 0 ? (
                                <span className="font-medium text-blue-700">
                                  ${costPerLead.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-green-50">
                              {spend > 0 && clientsClosed > 0 ? (
                                <span className="font-medium text-green-700">
                                  ${costPerAcquisition.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      {(() => {
                        const totalLeads = monthlySummary.total;
                        const totalSpend = Object.values(editingStats).reduce((sum, s) => sum + (s.spend || 0), 0);
                        const totalClients = Object.values(editingStats).reduce((sum, s) => sum + (s.clientsClosed || 0), 0);
                        const avgCostPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
                        const avgCostPerAcquisition = totalClients > 0 ? totalSpend / totalClients : 0;
                        const totalChange = monthlySummary.prevMonth
                          ? calcChange(monthlySummary.total, monthlySummary.prevTotal)
                          : null;

                        return (
                          <tr>
                            <td className="px-3 py-3 text-sm font-bold text-gray-900">Total</td>
                            <td className="px-3 py-3 text-sm text-center font-bold text-blue-700">
                              {totalLeads}
                            </td>
                            {monthlySummary.prevMonth && (
                              <td className="px-3 py-3 text-sm text-center">
                                {totalChange !== null ? (
                                  <span
                                    className={`font-bold ${
                                      totalChange > 0
                                        ? 'text-green-600'
                                        : totalChange < 0
                                        ? 'text-red-600'
                                        : 'text-gray-500'
                                    }`}
                                  >
                                    {totalChange > 0 ? '+' : ''}
                                    {totalChange.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            )}
                            <td className="px-3 py-3 text-sm text-center font-bold text-yellow-700 bg-yellow-100">
                              ${totalSpend.toFixed(2)}
                            </td>
                            <td className="px-3 py-3 text-sm text-center font-bold text-purple-700 bg-purple-100">
                              {totalClients}
                            </td>
                            <td className="px-3 py-3 text-sm text-center font-bold text-blue-700 bg-blue-100">
                              {avgCostPerLead > 0 ? `$${avgCostPerLead.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-3 py-3 text-sm text-center font-bold text-green-700 bg-green-100">
                              {avgCostPerAcquisition > 0 ? `$${avgCostPerAcquisition.toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Monthly Trend Charts */}
              {monthlyTrendData.length > 1 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <MarketingMonthlyTrendChart
                    data={monthlyTrendData}
                    title="Total Leads Generated - Monthly Trend"
                  />
                </div>
              )}

              {/* Cost Metric Charts */}
              {monthlyCostData.length > 1 && monthlyCostData.some(d => d.spend > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MarketingCostMetricChart
                    data={monthlyCostData}
                    metric="spend"
                    title="Total Spend - Monthly Trend"
                    color="#F59E0B"
                  />
                  <MarketingCostMetricChart
                    data={monthlyCostData}
                    metric="costPerLead"
                    title="Cost per Lead - Monthly Trend"
                    color="#3B82F6"
                  />
                  <MarketingCostMetricChart
                    data={monthlyCostData}
                    metric="costPerAcquisition"
                    title="Cost per Acquisition - Monthly Trend"
                    color="#10B981"
                  />
                </div>
              )}

            </div>
          )}

          {/* Quarterly View */}
          {viewMode === 'quarterly' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quarterly Summary</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quarter
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Leads
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                          Spend
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">
                          Clients
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                          Cost/Lead
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                          Cost/Acquisition
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quarterlySummary.map((row, idx) => {
                        const qStats = getQuarterlyStatsForQuarter(row.quarter);
                        const costPerLead = row.total > 0 ? qStats.spend / row.total : 0;
                        const costPerAcquisition = qStats.clients > 0 ? qStats.spend / qStats.clients : 0;

                        return (
                          <tr key={row.quarter} className={idx === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {row.quarter}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-center font-bold text-blue-700">
                              {row.total}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-yellow-700 bg-yellow-50">
                              {qStats.spend > 0 ? `$${qStats.spend.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-purple-700 bg-purple-50">
                              {qStats.clients > 0 ? qStats.clients : '-'}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-blue-700 bg-blue-50">
                              {costPerLead > 0 ? `$${costPerLead.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-green-700 bg-green-50">
                              {costPerAcquisition > 0 ? `$${costPerAcquisition.toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      {(() => {
                        const totalSpend = monthlyStats.reduce((sum, s) => sum + s.spend, 0);
                        const totalClients = monthlyStats.reduce((sum, s) => sum + s.clientsClosed, 0);
                        const avgCostPerLead = grandTotal > 0 ? totalSpend / grandTotal : 0;
                        const avgCostPerAcquisition = totalClients > 0 ? totalSpend / totalClients : 0;

                        return (
                          <tr>
                            <td className="px-3 py-3 text-sm font-bold text-gray-900">All Time</td>
                            <td className="px-3 py-3 text-sm text-center font-bold text-blue-700">
                              {grandTotal}
                            </td>
                            <td className="px-3 py-3 text-sm text-center font-bold text-yellow-700 bg-yellow-100">
                              {totalSpend > 0 ? `$${totalSpend.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-3 py-3 text-sm text-center font-bold text-purple-700 bg-purple-100">
                              {totalClients > 0 ? totalClients : '-'}
                            </td>
                            <td className="px-3 py-3 text-sm text-center font-bold text-blue-700 bg-blue-100">
                              {avgCostPerLead > 0 ? `$${avgCostPerLead.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-3 py-3 text-sm text-center font-bold text-green-700 bg-green-100">
                              {avgCostPerAcquisition > 0 ? `$${avgCostPerAcquisition.toFixed(2)}` : '-'}
                            </td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Annual View */}
          {viewMode === 'annual' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Annual Performance</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Year
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Leads
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                          Total Spend
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">
                          Clients Closed
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                          Cost/Lead
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                          Cost/Acquisition
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          vs Prev Year
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {annualSummary.map((row, idx) => {
                        const prevYear = annualSummary[idx + 1];
                        const change = prevYear ? calcChange(row.total, prevYear.total) : null;

                        return (
                          <tr key={row.year} className={idx === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {row.year}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold text-blue-700">
                              {row.total}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-yellow-700 bg-yellow-50">
                              {row.spend > 0 ? `$${row.spend.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-purple-700 bg-purple-50">
                              {row.clients > 0 ? row.clients : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-blue-700 bg-blue-50">
                              {row.costPerLead > 0 ? `$${row.costPerLead.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-green-700 bg-green-50">
                              {row.costPerAcquisition > 0 ? `$${row.costPerAcquisition.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              {change !== null ? (
                                <span
                                  className={`font-medium ${
                                    change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
                                  }`}
                                >
                                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      {(() => {
                        const totalSpend = annualSummary.reduce((sum, y) => sum + y.spend, 0);
                        const totalClients = annualSummary.reduce((sum, y) => sum + y.clients, 0);
                        const avgCostPerLead = grandTotal > 0 ? totalSpend / grandTotal : 0;
                        const avgCostPerAcquisition = totalClients > 0 ? totalSpend / totalClients : 0;

                        return (
                          <tr>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900">All Time</td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-blue-700">
                              {grandTotal}
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-yellow-700 bg-yellow-100">
                              {totalSpend > 0 ? `$${totalSpend.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-purple-700 bg-purple-100">
                              {totalClients > 0 ? totalClients : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-blue-700 bg-blue-100">
                              {avgCostPerLead > 0 ? `$${avgCostPerLead.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-bold text-green-700 bg-green-100">
                              {avgCostPerAcquisition > 0 ? `$${avgCostPerAcquisition.toFixed(2)}` : '-'}
                            </td>
                            <td></td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Per-Channel Annual Breakdown */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Annual Leads by Channel</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Year
                        </th>
                        {channelNames.map((name) => (
                          <th
                            key={name}
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {name}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {annualSummary.map((row, idx) => (
                        <tr key={row.year} className={idx === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.year}
                          </td>
                          {channelNames.map((name) => (
                            <td
                              key={name}
                              className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900"
                            >
                              {row.summary[name] || 0}
                            </td>
                          ))}
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold text-blue-700 bg-blue-50">
                            {row.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">All Time</td>
                        {channelNames.map((name) => (
                          <td
                            key={name}
                            className="px-4 py-3 text-sm text-center font-bold text-gray-900"
                          >
                            {channelTotals[name] || 0}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-sm text-center font-bold text-blue-700 bg-blue-100">
                          {grandTotal}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Comparison View */}
          {viewMode === 'comparison' && data && data.channels.length > 0 && (
            <div className="space-y-8">
              {/* Channel Summary Cards with Cost Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(() => {
                  const filtered = data.channels.filter((ch) => compareChannels.has(ch.name));
                  const maxLeads = Math.max(...filtered.map((c) => c.allTimeTotal));

                  // Build cost data for comparison
                  const channelCostMap = new Map<string, { spend: number; clients: number; costPerLead: number; costPerAcquisition: number }>();
                  filtered.forEach((ch) => {
                    const channel = channels.find((c) => c.name === ch.name);
                    const channelId = channel?.id || '';
                    const channelStats = monthlyStats.filter((s) => s.channelId === channelId);
                    const totalSpend = channelStats.reduce((sum, s) => sum + s.spend, 0);
                    const totalClients = channelStats.reduce((sum, s) => sum + s.clientsClosed, 0);
                    const costPerLead = ch.allTimeTotal > 0 ? totalSpend / ch.allTimeTotal : 0;
                    const costPerAcquisition = totalClients > 0 ? totalSpend / totalClients : 0;
                    channelCostMap.set(ch.name, { spend: totalSpend, clients: totalClients, costPerLead, costPerAcquisition });
                  });

                  const costsWithData = Array.from(channelCostMap.values()).filter(c => c.costPerLead > 0);
                  const bestCPL = costsWithData.length > 0 ? Math.min(...costsWithData.map(c => c.costPerLead)) : 0;
                  const bestCAC = costsWithData.filter(c => c.costPerAcquisition > 0).length > 0
                    ? Math.min(...costsWithData.filter(c => c.costPerAcquisition > 0).map(c => c.costPerAcquisition))
                    : 0;

                  return filtered.map((ch) => {
                    const costs = channelCostMap.get(ch.name)!;
                    return (
                      <div
                        key={ch.name}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{ch.name}</h3>

                        {/* Leads */}
                        <div className="mb-4">
                          <div className="text-3xl font-bold text-blue-700">{ch.allTimeTotal}</div>
                          <div className="text-sm text-gray-500">Total Leads</div>
                          {filtered.length > 1 && (
                            <div className={`text-xs mt-1 font-medium ${ch.allTimeTotal === maxLeads ? 'text-green-600' : 'text-gray-500'}`}>
                              {ch.allTimeTotal === maxLeads ? 'Most Leads' : `${((ch.allTimeTotal - maxLeads) / maxLeads * 100).toFixed(0)}% vs best`}
                            </div>
                          )}
                        </div>

                        {/* Cost Metrics */}
                        <div className="border-t border-gray-200 pt-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Total Spend</span>
                            <span className="text-sm font-medium text-yellow-700">
                              {costs.spend > 0 ? `$${costs.spend.toFixed(2)}` : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Clients Closed</span>
                            <span className="text-sm font-medium text-purple-700">
                              {costs.clients > 0 ? costs.clients : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Cost/Lead</span>
                            <span className={`text-sm font-medium ${costs.costPerLead === bestCPL && bestCPL > 0 ? 'text-green-600' : 'text-blue-700'}`}>
                              {costs.costPerLead > 0 ? `$${costs.costPerLead.toFixed(2)}` : '-'}
                              {costs.costPerLead === bestCPL && bestCPL > 0 && ' (Best)'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Cost/Acquisition</span>
                            <span className={`text-sm font-medium ${costs.costPerAcquisition === bestCAC && bestCAC > 0 ? 'text-green-600' : 'text-green-700'}`}>
                              {costs.costPerAcquisition > 0 ? `$${costs.costPerAcquisition.toFixed(2)}` : '-'}
                              {costs.costPerAcquisition === bestCAC && bestCAC > 0 && ' (Best)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Channel Cost Comparison Table */}
              {compareChannels.size > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Channel Cost Comparison</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">Spend</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">Clients</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Cost/Lead</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Cost/Acq</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">vs Best CPL</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          const filtered = data.channels.filter((ch) => compareChannels.has(ch.name));
                          const channelCostData = filtered.map((ch) => {
                            const channel = channels.find((c) => c.name === ch.name);
                            const channelId = channel?.id || '';
                            const channelStats = monthlyStats.filter((s) => s.channelId === channelId);
                            const totalSpend = channelStats.reduce((sum, s) => sum + s.spend, 0);
                            const totalClients = channelStats.reduce((sum, s) => sum + s.clientsClosed, 0);
                            const costPerLead = ch.allTimeTotal > 0 ? totalSpend / ch.allTimeTotal : 0;
                            const costPerAcquisition = totalClients > 0 ? totalSpend / totalClients : 0;
                            return { name: ch.name, leads: ch.allTimeTotal, spend: totalSpend, clients: totalClients, costPerLead, costPerAcquisition };
                          });

                          const sortedByEfficiency = [...channelCostData].filter(c => c.costPerLead > 0).sort((a, b) => a.costPerLead - b.costPerLead);
                          const bestCPL = sortedByEfficiency[0]?.costPerLead || 0;
                          const sortedByCAC = [...channelCostData].filter(c => c.costPerAcquisition > 0).sort((a, b) => a.costPerAcquisition - b.costPerAcquisition);
                          const bestCAC = sortedByCAC[0]?.costPerAcquisition || 0;

                          return channelCostData.map((ch) => {
                            const vsBestCPL = ch.costPerLead > 0 && bestCPL > 0
                              ? ((ch.costPerLead - bestCPL) / bestCPL) * 100
                              : null;

                            return (
                              <tr key={ch.name} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{ch.name}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">{ch.leads}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-yellow-700 bg-yellow-50">
                                  {ch.spend > 0 ? `$${ch.spend.toFixed(2)}` : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-purple-700 bg-purple-50">
                                  {ch.clients > 0 ? ch.clients : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-blue-50">
                                  {ch.costPerLead > 0 ? (
                                    <span className={`font-medium ${ch.costPerLead === bestCPL ? 'text-green-600' : 'text-blue-700'}`}>
                                      ${ch.costPerLead.toFixed(2)}{ch.costPerLead === bestCPL && ' (Best)'}
                                    </span>
                                  ) : <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-green-50">
                                  {ch.costPerAcquisition > 0 ? (
                                    <span className={`font-medium ${ch.costPerAcquisition === bestCAC ? 'text-green-600' : 'text-green-700'}`}>
                                      ${ch.costPerAcquisition.toFixed(2)}{ch.costPerAcquisition === bestCAC && ' (Best)'}
                                    </span>
                                  ) : <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                  {vsBestCPL !== null ? (
                                    <span className={`font-medium ${vsBestCPL === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {vsBestCPL === 0 ? 'Best' : `+${vsBestCPL.toFixed(0)}%`}
                                    </span>
                                  ) : <span className="text-gray-400">-</span>}
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

              {/* Lead Trend Comparison Chart */}
              {compareChannels.size > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Generation Trends</h3>
                  <MarketingComparisonChart
                    channels={data.channels.filter((c) => compareChannels.has(c.name))}
                    dataKey="totalLeads"
                    title="Leads by Month"
                  />
                </div>
              )}

              {/* Cost Metric Trend Charts */}
              {monthlyCostData.length > 1 && monthlyCostData.some(d => d.spend > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MarketingCostMetricChart
                    data={monthlyCostData}
                    metric="spend"
                    title="Total Spend - Monthly Trend"
                    color="#F59E0B"
                  />
                  <MarketingCostMetricChart
                    data={monthlyCostData}
                    metric="costPerLead"
                    title="Cost per Lead - Monthly Trend"
                    color="#3B82F6"
                  />
                  <MarketingCostMetricChart
                    data={monthlyCostData}
                    metric="costPerAcquisition"
                    title="Cost per Acquisition - Monthly Trend"
                    color="#10B981"
                  />
                </div>
              )}
            </div>
          )}
        </main>
      )}

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500">
          Marketing Channels Dashboard{' '}
          {data?.lastUpdated && `• Last updated: ${new Date(data.lastUpdated).toLocaleString()}`}
        </div>
      </footer>
    </div>
  );
}

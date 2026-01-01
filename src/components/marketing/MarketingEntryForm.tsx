'use client';

import { useState, useEffect } from 'react';

interface MarketingChannel {
  id: string;
  name: string;
}

interface ExistingWeekData {
  weekStartDate: string;
  entries: { channelId: string; leadsGenerated: number; id: string }[];
}

interface MarketingEntryFormProps {
  channels: MarketingChannel[];
  onSuccess: () => void;
  onCancel: () => void;
  editWeek?: string; // Week to edit (pre-populate with existing data)
}

function getCurrentWeekMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getRecentMondays(): { date: string; label: string }[] {
  const mondays = [];
  const today = new Date();

  for (let i = 0; i < 9; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1) - (i * 7));
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    let suffix = '';
    if (i === 0) suffix = ' (This Week)';
    else if (i === 1) suffix = ' (Last Week)';

    mondays.push({ date: dateStr, label: `${label}${suffix}` });
  }

  return mondays;
}

export function MarketingEntryForm({ channels, onSuccess, onCancel, editWeek }: MarketingEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingEntries, setFetchingEntries] = useState(true);
  const [existingWeeks, setExistingWeeks] = useState<ExistingWeekData[]>([]);

  const recentMondays = getRecentMondays();
  const currentWeekMonday = getCurrentWeekMonday();

  const [selectedWeek, setSelectedWeek] = useState(editWeek || currentWeekMonday);

  // Initialize channel values - one entry per channel
  const [channelValues, setChannelValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    channels.forEach(ch => { initial[ch.id] = 0; });
    return initial;
  });

  // Track which entries exist (for updates vs creates)
  const [existingEntryIds, setExistingEntryIds] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/marketing/entries');
        if (response.ok) {
          const entries = await response.json();
          // Group entries by week
          const weekMap = new Map<string, ExistingWeekData>();
          entries.forEach((e: { weekStartDate: string; channelId: string; leadsGenerated: number; id: string }) => {
            const weekDate = e.weekStartDate.split('T')[0];
            if (!weekMap.has(weekDate)) {
              weekMap.set(weekDate, { weekStartDate: weekDate, entries: [] });
            }
            weekMap.get(weekDate)!.entries.push({
              channelId: e.channelId,
              leadsGenerated: e.leadsGenerated,
              id: e.id,
            });
          });
          setExistingWeeks(Array.from(weekMap.values()));
        }
      } catch (err) {
        console.error('Error fetching entries:', err);
      } finally {
        setFetchingEntries(false);
      }
    };
    fetchEntries();
  }, []);

  // When week changes or existing data loads, populate form
  useEffect(() => {
    const weekData = existingWeeks.find(w => w.weekStartDate === selectedWeek);
    const newValues: Record<string, number> = {};
    const newIds: Record<string, string> = {};

    channels.forEach(ch => {
      const entry = weekData?.entries.find(e => e.channelId === ch.id);
      newValues[ch.id] = entry?.leadsGenerated || 0;
      if (entry?.id) {
        newIds[ch.id] = entry.id;
      }
    });

    setChannelValues(newValues);
    setExistingEntryIds(newIds);
  }, [selectedWeek, existingWeeks, channels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Submit each channel that has a value > 0 or needs updating
      const promises = channels.map(async (channel) => {
        const value = channelValues[channel.id] || 0;
        const existingId = existingEntryIds[channel.id];

        if (existingId) {
          // Update existing entry
          if (value === 0) {
            // Delete if zero
            await fetch(`/api/marketing/entries/${existingId}`, { method: 'DELETE' });
          } else {
            await fetch(`/api/marketing/entries/${existingId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadsGenerated: value }),
            });
          }
        } else if (value > 0) {
          // Create new entry
          await fetch('/api/marketing/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelId: channel.id,
              weekStartDate: selectedWeek,
              leadsGenerated: value,
            }),
          });
        }
      });

      await Promise.all(promises);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelValueChange = (channelId: string, value: number) => {
    setChannelValues(prev => ({ ...prev, [channelId]: value }));
  };

  const weekHasData = existingWeeks.some(w => w.weekStartDate === selectedWeek);
  const totalLeads = Object.values(channelValues).reduce((sum, v) => sum + v, 0);

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {weekHasData ? 'Edit Weekly Entry' : 'Add Weekly Entry'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Week Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week Starting
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                disabled={!!editWeek}
                className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {recentMondays.map((monday) => {
                  const hasData = existingWeeks.some(w => w.weekStartDate === monday.date);
                  return (
                    <option key={monday.date} value={monday.date}>
                      {monday.label}{hasData ? ' (has data)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Channel Inputs */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Leads Generated by Channel
              </h3>
              {fetchingEntries ? (
                <div className="text-center text-gray-500 py-4">Loading...</div>
              ) : (
                <div className="space-y-3">
                  {channels.map((channel) => (
                    <div key={channel.id} className="flex items-center gap-3">
                      <label className="flex-1 text-sm text-gray-700">
                        {channel.name}
                      </label>
                      <input
                        type="number"
                        value={channelValues[channel.id] || 0}
                        onChange={(e) => handleChannelValueChange(channel.id, parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-24 rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-right"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-200">
                <span className="flex-1 text-sm font-semibold text-gray-900">
                  Total Leads
                </span>
                <span className="w-24 text-right font-bold text-blue-600">
                  {totalLeads}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : weekHasData ? 'Update Entry' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

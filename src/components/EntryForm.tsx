'use client';

import { useState, useEffect } from 'react';

interface SalesRep {
  id: string;
  name: string;
}

interface ExistingEntry {
  weekStartDate: string;
  salesRepId: string;
}

interface EntryFormProps {
  reps: SalesRep[];
  onSuccess: () => void;
  onCancel: () => void;
  existingEntries?: ExistingEntry[];
  editData?: {
    id: string;
    salesRepId: string;
    weekStartDate: string;
    introCallsScheduled: number;
    introCallsTaken: number;
    accountsAudited: number;
    proposalsPitched: number;
    dealsClosed: number;
    mrr: number;
  };
}

// Get Monday of the current week
function getCurrentWeekMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Get recent Mondays (last 8 weeks + current week)
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

export function EntryForm({ reps, onSuccess, onCancel, existingEntries = [], editData }: EntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingEntries, setFetchingEntries] = useState(true);
  const [repEntries, setRepEntries] = useState<ExistingEntry[]>(existingEntries);

  const recentMondays = getRecentMondays();
  const currentWeekMonday = getCurrentWeekMonday();

  const [formData, setFormData] = useState({
    salesRepId: editData?.salesRepId || (reps.length === 1 ? reps[0].id : ''),
    weekStartDate: editData?.weekStartDate || currentWeekMonday,
    introCallsScheduled: editData?.introCallsScheduled || 0,
    introCallsTaken: editData?.introCallsTaken || 0,
    accountsAudited: editData?.accountsAudited || 0,
    proposalsPitched: editData?.proposalsPitched || 0,
    dealsClosed: editData?.dealsClosed || 0,
    mrr: editData?.mrr || 0,
  });

  // Fetch existing entries to know which weeks are already filled
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/entries');
        if (response.ok) {
          const entries = await response.json();
          setRepEntries(entries.map((e: { weekStartDate: string; salesRepId: string }) => ({
            weekStartDate: e.weekStartDate.split('T')[0],
            salesRepId: e.salesRepId,
          })));
        }
      } catch (err) {
        console.error('Error fetching entries:', err);
      } finally {
        setFetchingEntries(false);
      }
    };
    fetchEntries();
  }, []);

  // Check if a week already has an entry for the selected rep
  const isWeekTaken = (date: string, repId: string): boolean => {
    return repEntries.some(e => e.weekStartDate === date && e.salesRepId === repId);
  };

  // Find the next available week for the selected rep
  const getNextAvailableWeek = (repId: string): string => {
    for (const monday of recentMondays) {
      if (!isWeekTaken(monday.date, repId)) {
        return monday.date;
      }
    }
    return currentWeekMonday;
  };

  // When rep changes, auto-select next available week
  const handleRepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRepId = e.target.value;
    setFormData(prev => ({
      ...prev,
      salesRepId: newRepId,
      weekStartDate: newRepId ? getNextAvailableWeek(newRepId) : prev.weekStartDate,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editData ? `/api/entries/${editData.id}` : '/api/entries';
      const method = editData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save entry');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const selectedRepName = reps.find(r => r.id === formData.salesRepId)?.name;

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editData ? 'Edit Weekly Entry' : 'Add Weekly Entry'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sales Rep */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Rep
              </label>
              <select
                name="salesRepId"
                value={formData.salesRepId}
                onChange={handleRepChange}
                required
                disabled={!!editData}
                className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Select a rep...</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Week Selection - Dropdown of recent weeks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week Starting
              </label>
              <select
                name="weekStartDate"
                value={formData.weekStartDate}
                onChange={handleChange}
                required
                disabled={!!editData}
                className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {recentMondays.map((monday) => {
                  const taken = formData.salesRepId && isWeekTaken(monday.date, formData.salesRepId);
                  return (
                    <option
                      key={monday.date}
                      value={monday.date}
                      disabled={Boolean(taken && !editData)}
                      className={taken ? 'text-gray-400' : ''}
                    >
                      {monday.label}{taken ? ' - Already entered' : ''}
                    </option>
                  );
                })}
              </select>
              {formData.salesRepId && !fetchingEntries && (
                <p className="text-xs text-gray-500 mt-1">
                  Weeks already entered for {selectedRepName} are disabled
                </p>
              )}
            </div>

            {/* Sales Stages */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Sales Stages</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Intro Calls Scheduled
                  </label>
                  <input
                    type="number"
                    name="introCallsScheduled"
                    value={formData.introCallsScheduled}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Intro Calls Taken
                  </label>
                  <input
                    type="number"
                    name="introCallsTaken"
                    value={formData.introCallsTaken}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Accounts Audited
                  </label>
                  <input
                    type="number"
                    name="accountsAudited"
                    value={formData.accountsAudited}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Proposals Pitched
                  </label>
                  <input
                    type="number"
                    name="proposalsPitched"
                    value={formData.proposalsPitched}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Deals Closed
                  </label>
                  <input
                    type="number"
                    name="dealsClosed"
                    value={formData.dealsClosed}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    MRR ($)
                  </label>
                  <input
                    type="number"
                    name="mrr"
                    value={formData.mrr}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
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
                {loading ? 'Saving...' : editData ? 'Update Entry' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

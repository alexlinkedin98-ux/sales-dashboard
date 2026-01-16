'use client';

import { useState, useEffect } from 'react';

interface SalesRep {
  id: string;
  name: string;
}

interface ExistingWeekData {
  weekStartDate: string;
  entries: {
    salesRepId: string;
    triageBooked: number;
    triageTaken: number;
    qualifiedForIntro: number;
    id: string;
  }[];
}

interface TriageEntryFormProps {
  reps: SalesRep[];
  onSuccess: () => void;
  onCancel: () => void;
  editWeek?: string;
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

interface RepTriageValues {
  triageBooked: number;
  triageTaken: number;
  qualifiedForIntro: number;
}

export function TriageEntryForm({ reps, onSuccess, onCancel, editWeek }: TriageEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingEntries, setFetchingEntries] = useState(true);
  const [existingWeeks, setExistingWeeks] = useState<ExistingWeekData[]>([]);

  const recentMondays = getRecentMondays();
  const currentWeekMonday = getCurrentWeekMonday();

  const [selectedWeek, setSelectedWeek] = useState(editWeek || currentWeekMonday);

  // Initialize rep values - one entry per rep with 3 fields
  const [repValues, setRepValues] = useState<Record<string, RepTriageValues>>(() => {
    const initial: Record<string, RepTriageValues> = {};
    reps.forEach(rep => {
      initial[rep.id] = { triageBooked: 0, triageTaken: 0, qualifiedForIntro: 0 };
    });
    return initial;
  });

  // Track which entries exist (for updates vs creates)
  const [existingEntryIds, setExistingEntryIds] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/triage');
        if (response.ok) {
          const entries = await response.json();
          // Group entries by week
          const weekMap = new Map<string, ExistingWeekData>();
          entries.forEach((e: {
            weekStartDate: string;
            salesRepId: string;
            triageBooked: number;
            triageTaken: number;
            qualifiedForIntro: number;
            id: string;
          }) => {
            const weekDate = e.weekStartDate.split('T')[0];
            if (!weekMap.has(weekDate)) {
              weekMap.set(weekDate, { weekStartDate: weekDate, entries: [] });
            }
            weekMap.get(weekDate)!.entries.push({
              salesRepId: e.salesRepId,
              triageBooked: e.triageBooked,
              triageTaken: e.triageTaken,
              qualifiedForIntro: e.qualifiedForIntro,
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
    const newValues: Record<string, RepTriageValues> = {};
    const newIds: Record<string, string> = {};

    reps.forEach(rep => {
      const entry = weekData?.entries.find(e => e.salesRepId === rep.id);
      newValues[rep.id] = {
        triageBooked: entry?.triageBooked || 0,
        triageTaken: entry?.triageTaken || 0,
        qualifiedForIntro: entry?.qualifiedForIntro || 0,
      };
      if (entry?.id) {
        newIds[rep.id] = entry.id;
      }
    });

    setRepValues(newValues);
    setExistingEntryIds(newIds);
  }, [selectedWeek, existingWeeks, reps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Submit each rep that has values or needs updating
      const promises = reps.map(async (rep) => {
        const values = repValues[rep.id] || { triageBooked: 0, triageTaken: 0, qualifiedForIntro: 0 };
        const existingId = existingEntryIds[rep.id];
        const hasValues = values.triageBooked > 0 || values.triageTaken > 0 || values.qualifiedForIntro > 0;

        if (existingId) {
          // Update existing entry
          if (!hasValues) {
            // Delete if all zeros
            await fetch(`/api/triage/${existingId}`, { method: 'DELETE' });
          } else {
            await fetch(`/api/triage/${existingId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            });
          }
        } else if (hasValues) {
          // Create new entry
          await fetch('/api/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              salesRepId: rep.id,
              weekStartDate: selectedWeek,
              ...values,
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

  const handleValueChange = (repId: string, field: keyof RepTriageValues, value: number) => {
    setRepValues(prev => ({
      ...prev,
      [repId]: { ...prev[repId], [field]: value }
    }));
  };

  const weekHasData = existingWeeks.some(w => w.weekStartDate === selectedWeek);

  // Calculate totals
  const totals = reps.reduce(
    (acc, rep) => {
      const v = repValues[rep.id] || { triageBooked: 0, triageTaken: 0, qualifiedForIntro: 0 };
      return {
        triageBooked: acc.triageBooked + v.triageBooked,
        triageTaken: acc.triageTaken + v.triageTaken,
        qualifiedForIntro: acc.qualifiedForIntro + v.qualifiedForIntro,
      };
    },
    { triageBooked: 0, triageTaken: 0, qualifiedForIntro: 0 }
  );

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {weekHasData ? 'Edit Triage Entry' : 'Add Triage Entry'}
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
                className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500"
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

            {/* Rep Inputs */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Triage Data by Sales Rep
              </h3>

              {/* Header row */}
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500 uppercase">
                <div className="flex-1">Sales Rep</div>
                <div className="w-20 text-center">Booked</div>
                <div className="w-20 text-center">Taken</div>
                <div className="w-20 text-center">Qualified</div>
              </div>

              {fetchingEntries ? (
                <div className="text-center text-gray-500 py-4">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {reps.map((rep) => (
                    <div key={rep.id} className="flex items-center gap-2">
                      <label className="flex-1 text-sm text-gray-700 truncate">
                        {rep.name}
                      </label>
                      <input
                        type="number"
                        value={repValues[rep.id]?.triageBooked || 0}
                        onChange={(e) => handleValueChange(rep.id, 'triageBooked', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-20 rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-center text-sm"
                      />
                      <input
                        type="number"
                        value={repValues[rep.id]?.triageTaken || 0}
                        onChange={(e) => handleValueChange(rep.id, 'triageTaken', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-20 rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-center text-sm"
                      />
                      <input
                        type="number"
                        value={repValues[rep.id]?.qualifiedForIntro || 0}
                        onChange={(e) => handleValueChange(rep.id, 'qualifiedForIntro', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-20 rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-center text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
                <span className="flex-1 text-sm font-semibold text-gray-900">
                  Total
                </span>
                <span className="w-20 text-center font-bold text-teal-600">
                  {totals.triageBooked}
                </span>
                <span className="w-20 text-center font-bold text-blue-600">
                  {totals.triageTaken}
                </span>
                <span className="w-20 text-center font-bold text-green-600">
                  {totals.qualifiedForIntro}
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
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50"
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

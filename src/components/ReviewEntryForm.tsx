'use client';

import { useState, useEffect } from 'react';

interface SalesRep {
  id: string;
  name: string;
}

interface ExistingEntry {
  monthStartDate: string;
  salesRepId: string;
}

interface ReviewEntryFormProps {
  reps: SalesRep[];
  onSuccess: () => void;
  onCancel: () => void;
  editData?: {
    id: string;
    salesRepId: string;
    monthStartDate: string;
    reviewsRequested: number;
    googleReviews: number;
    clutchReviews: number;
  };
}

// Get first day of current month
function getCurrentMonth(): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
}

// Get recent months (last 12 months + current month)
function getRecentMonths(): { date: string; label: string }[] {
  const months = [];
  const today = new Date();

  for (let i = 0; i < 13; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    let suffix = '';
    if (i === 0) suffix = ' (This Month)';
    else if (i === 1) suffix = ' (Last Month)';

    months.push({ date: dateStr, label: `${label}${suffix}` });
  }

  return months;
}

export function ReviewEntryForm({ reps, onSuccess, onCancel, editData }: ReviewEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingEntries, setFetchingEntries] = useState(true);
  const [repEntries, setRepEntries] = useState<ExistingEntry[]>([]);

  const recentMonths = getRecentMonths();
  const currentMonth = getCurrentMonth();

  const [formData, setFormData] = useState({
    salesRepId: editData?.salesRepId || (reps.length === 1 ? reps[0].id : ''),
    monthStartDate: editData?.monthStartDate || currentMonth,
    reviewsRequested: editData?.reviewsRequested || 0,
    googleReviews: editData?.googleReviews || 0,
    clutchReviews: editData?.clutchReviews || 0,
  });

  // Fetch existing entries to know which months are already filled
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const response = await fetch('/api/reviews');
        if (response.ok) {
          const entries = await response.json();
          setRepEntries(entries.map((e: { monthStartDate: string; salesRepId: string }) => ({
            monthStartDate: e.monthStartDate.split('T')[0],
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

  // Check if a month already has an entry for the selected rep
  const isMonthTaken = (date: string, repId: string): boolean => {
    return repEntries.some(e => e.monthStartDate === date && e.salesRepId === repId);
  };

  // Find the next available month for the selected rep
  const getNextAvailableMonth = (repId: string): string => {
    for (const month of recentMonths) {
      if (!isMonthTaken(month.date, repId)) {
        return month.date;
      }
    }
    return currentMonth;
  };

  // When rep changes, auto-select next available month
  const handleRepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRepId = e.target.value;
    setFormData(prev => ({
      ...prev,
      salesRepId: newRepId,
      monthStartDate: newRepId ? getNextAvailableMonth(newRepId) : prev.monthStartDate,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editData ? `/api/reviews/${editData.id}` : '/api/reviews';
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
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
  };

  const selectedRepName = reps.find(r => r.id === formData.salesRepId)?.name;
  const totalReceived = formData.googleReviews + formData.clutchReviews;
  const responseRate = formData.reviewsRequested > 0
    ? ((totalReceived / formData.reviewsRequested) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editData ? 'Edit Review Entry' : 'Add Review Entry'}
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
                className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-amber-500 focus:ring-amber-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Select a rep...</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                name="monthStartDate"
                value={formData.monthStartDate}
                onChange={handleChange}
                required
                disabled={!!editData}
                className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-amber-500 focus:ring-amber-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                {recentMonths.map((month) => {
                  const taken = formData.salesRepId && isMonthTaken(month.date, formData.salesRepId);
                  return (
                    <option
                      key={month.date}
                      value={month.date}
                      disabled={Boolean(taken && !editData)}
                      className={taken ? 'text-gray-400' : ''}
                    >
                      {month.label}{taken ? ' - Already entered' : ''}
                    </option>
                  );
                })}
              </select>
              {formData.salesRepId && !fetchingEntries && (
                <p className="text-xs text-gray-500 mt-1">
                  Months already entered for {selectedRepName} are disabled
                </p>
              )}
            </div>

            {/* Review Data */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Review Data</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Reviews Requested
                  </label>
                  <input
                    type="number"
                    name="reviewsRequested"
                    value={formData.reviewsRequested}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Google Reviews
                    </label>
                    <input
                      type="number"
                      name="googleReviews"
                      value={formData.googleReviews}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Clutch Reviews
                    </label>
                    <input
                      type="number"
                      name="clutchReviews"
                      value={formData.clutchReviews}
                      onChange={handleChange}
                      min="0"
                      className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Requested</div>
                  <div className="text-lg font-bold text-gray-900">{formData.reviewsRequested}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Received</div>
                  <div className="text-lg font-bold text-amber-600">{totalReceived}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Response Rate</div>
                  <div className="text-lg font-bold text-green-600">{responseRate}%</div>
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
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50"
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

'use client';

import { WeeklyData } from '@/lib/types';
import { useState } from 'react';

interface WeeklyTableProps {
  data: WeeklyData[];
  repName: string;
  onEdit?: (entry: WeeklyData) => void;
  onDelete?: (entryId: string) => void;
  onBulkDelete?: (entryIds: string[]) => void;
}

export function WeeklyTable({ data, repName, onEdit, onDelete, onBulkDelete }: WeeklyTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  if (data.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        No weekly data available for {repName}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    setDeletingId(entryId);
    try {
      const res = await fetch(`/api/entries/${entryId}`, { method: 'DELETE' });
      if (res.ok && onDelete) {
        onDelete(entryId);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(data.map(w => w.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} selected ${count === 1 ? 'entry' : 'entries'}?`)) return;

    setBulkDeleting(true);
    try {
      // Delete all selected entries
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/entries/${id}`, { method: 'DELETE' })
      );
      await Promise.all(deletePromises);

      setSelectedIds(new Set());
      if (onBulkDelete) {
        onBulkDelete(Array.from(selectedIds));
      } else if (onDelete) {
        // Fallback: trigger single onDelete to refresh
        onDelete('');
      }
    } catch (error) {
      console.error('Error bulk deleting entries:', error);
    } finally {
      setBulkDeleting(false);
    }
  };

  const allSelected = data.length > 0 && selectedIds.size === data.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  return (
    <div>
      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-800">
            {selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Calls Scheduled
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Calls Taken
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Show Up Rate
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accept. Rate
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Audited
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proposals
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Closed
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Close Rate
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                MRR
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                MRR/Call
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                MRR/Audit
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                MRR/Sale
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((week, index) => (
              <tr
                key={week.id || index}
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedIds.has(week.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(week.id)}
                    onChange={(e) => handleSelectOne(week.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {week.week}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  {week.introCallsScheduled}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  {week.introCallsTaken}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  <span className={week.showUpRate >= 75 ? 'text-green-600' : week.showUpRate >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                    {formatPercent(week.showUpRate)}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  {formatPercent(week.acceptanceQualityRate)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  {week.accountsAudited}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  {week.proposalsPitched}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center font-semibold">
                  {week.dealsClosed}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  <span className={week.closeRate >= 50 ? 'text-green-600' : week.closeRate >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                    {formatPercent(week.closeRate)}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">
                  {formatCurrency(week.thisMonthMRR)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  {formatCurrency(week.mrrPerCallTaken)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  {formatCurrency(week.mrrPerAudit)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                  {formatCurrency(week.mrrPerSales)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                  <div className="flex items-center justify-center gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(week)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(week.id)}
                        disabled={deletingId === week.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                      >
                        {deletingId === week.id ? '...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

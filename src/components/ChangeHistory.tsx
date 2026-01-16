'use client';

import { useState, useEffect } from 'react';

interface ChangeLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  previousData: string | null;
  newData: string | null;
  description: string;
  relatedName: string | null;
  canUndo: boolean;
  undone: boolean;
  createdAt: string;
}

interface ChangeHistoryProps {
  entityType?: string;
  onUndo?: () => void;
  limit?: number;
}

export function ChangeHistory({ entityType, onUndo, limit = 20 }: ChangeHistoryProps) {
  const [changes, setChanges] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchChanges = async () => {
    try {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      params.set('limit', limit.toString());

      const response = await fetch(`/api/changelog?${params}`);
      if (response.ok) {
        const data = await response.json();
        setChanges(data);
      }
    } catch (error) {
      console.error('Error fetching change history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChanges();
    }
  }, [isOpen, entityType, limit]);

  const handleUndo = async (changeId: string) => {
    setUndoing(changeId);
    try {
      const response = await fetch('/api/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeLogId: changeId }),
      });

      if (response.ok) {
        await fetchChanges();
        if (onUndo) {
          onUndo();
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to undo change');
      }
    } catch (error) {
      console.error('Error undoing change:', error);
      alert('Failed to undo change');
    } finally {
      setUndoing(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </span>
        );
      case 'delete':
        return (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </span>
        );
      default:
        return null;
    }
  };

  const undoableChanges = changes.filter(c => c.canUndo && !c.undone);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        History
        {undoableChanges.length > 0 && (
          <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            {undoableChanges.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 max-h-[70vh] overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-900">Change History</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(70vh-56px)]">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : changes.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No changes yet</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {changes.map((change) => (
                    <div
                      key={change.id}
                      className={`p-3 hover:bg-gray-50 ${change.undone ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {getActionIcon(change.action)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {change.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(change.createdAt)}
                            {change.undone && (
                              <span className="ml-2 text-orange-600">(Undone)</span>
                            )}
                          </p>
                        </div>
                        {change.canUndo && !change.undone && (
                          <button
                            onClick={() => handleUndo(change.id)}
                            disabled={undoing === change.id}
                            className="flex-shrink-0 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                          >
                            {undoing === change.id ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Undoing
                              </span>
                            ) : (
                              'Undo'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

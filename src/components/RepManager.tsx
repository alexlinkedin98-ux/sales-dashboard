'use client';

import { useState } from 'react';

interface SalesRep {
  id: string;
  name: string;
}

interface RepManagerProps {
  reps: SalesRep[];
  onUpdate: () => void;
  onClose: () => void;
}

export function RepManager({ reps, onUpdate, onClose }: RepManagerProps) {
  const [newRepName, setNewRepName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddRep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRepName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add rep');
      }

      setNewRepName('');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRep = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will also delete all their entries.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reps/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rep');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage Sales Reps</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Add New Rep Form */}
          <form onSubmit={handleAddRep} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newRepName}
              onChange={(e) => setNewRepName(e.target.value)}
              placeholder="Enter rep name..."
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !newRepName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </form>

          {/* Existing Reps List */}
          <div className="border rounded-md divide-y">
            {reps.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No sales reps yet. Add one above!
              </div>
            ) : (
              reps.map((rep) => (
                <div key={rep.id} className="flex items-center justify-between p-3">
                  <span className="font-medium text-gray-900">{rep.name}</span>
                  <button
                    onClick={() => handleDeleteRep(rep.id, rep.name)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

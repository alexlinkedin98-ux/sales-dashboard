'use client';

import { useState, useEffect } from 'react';

interface SalesRep {
  id: string;
  name: string;
}

interface TraineeSelectorProps {
  selected: string | null;
  onSelect: (traineeId: string) => void;
}

export function TraineeSelector({ selected, onSelect }: TraineeSelectorProps) {
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReps();
  }, []);

  const fetchReps = async () => {
    try {
      const response = await fetch('/api/reps');
      if (response.ok) {
        const data = await response.json();
        setReps(data);
        // Auto-select first rep if none selected
        if (!selected && data.length > 0) {
          onSelect(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch reps:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-10 w-40" />
    );
  }

  if (reps.length === 0) {
    return (
      <div className="text-sm text-gray-500">No trainees available</div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">Trainee:</label>
      <select
        value={selected || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="block w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {reps.map((rep) => (
          <option key={rep.id} value={rep.id}>
            {rep.name}
          </option>
        ))}
      </select>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Navigation } from '@/components/Navigation';

interface SalesRep {
  id: string;
  name: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface ChecklistCompletion {
  id: string;
  itemId: string;
  completed: boolean;
  completedAt: string | null;
}

interface WeeklyHistory {
  weekLabel: string;
  weekStartDate: string;
  totalItems: number;
  completedItems: number;
  completionRate: number;
}

interface WeekStats {
  totalItems: number;
  completedItems: number;
  completionRate: number;
  streak: number;
}

export default function SalesChecklistPage() {
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [selectedRep, setSelectedRep] = useState<string>('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([]);
  const [history, setHistory] = useState<WeeklyHistory[]>([]);
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', category: '' });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekLabel = format(weekStart, 'MMM d, yyyy');

  // Fetch sales reps
  useEffect(() => {
    fetch('/api/reps')
      .then((res) => res.json())
      .then((data) => {
        setSalesReps(data);
        if (data.length > 0) {
          setSelectedRep(data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch checklist data when rep changes
  const fetchChecklistData = useCallback(async () => {
    if (!selectedRep) return;

    setLoading(true);
    try {
      const [itemsRes, historyRes] = await Promise.all([
        fetch(`/api/checklist/items?salesRepId=${selectedRep}`),
        fetch(`/api/checklist/history?salesRepId=${selectedRep}&weeks=8`),
      ]);

      const itemsData = await itemsRes.json();
      const historyData = await historyRes.json();

      setItems(itemsData.items || []);
      setCompletions(itemsData.completions || []);
      setHistory(historyData.history || []);
      setWeekStats(historyData.currentWeek || null);

      // If no items exist, seed default items
      if (!itemsData.items || itemsData.items.length === 0) {
        await fetch('/api/checklist/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ salesRepId: selectedRep }),
        });
        // Refetch after seeding
        const newItemsRes = await fetch(`/api/checklist/items?salesRepId=${selectedRep}`);
        const newItemsData = await newItemsRes.json();
        setItems(newItemsData.items || []);
        setCompletions(newItemsData.completions || []);
      }
    } catch (error) {
      console.error('Error fetching checklist data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedRep]);

  useEffect(() => {
    fetchChecklistData();
  }, [fetchChecklistData]);

  // Toggle item completion
  const toggleCompletion = async (itemId: string) => {
    try {
      const res = await fetch('/api/checklist/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesRepId: selectedRep, itemId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setCompletions((prev) => {
          const existing = prev.find((c) => c.itemId === itemId);
          if (existing) {
            return prev.map((c) =>
              c.itemId === itemId ? { ...c, completed: data.completion.completed } : c
            );
          }
          return [...prev, data.completion];
        });
        // Update week stats
        setWeekStats(data.weekStats);
      }
    } catch (error) {
      console.error('Error toggling completion:', error);
    }
  };

  // Add new item
  const addItem = async () => {
    if (!newItem.title.trim()) return;

    try {
      const res = await fetch('/api/checklist/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesRepId: selectedRep,
          ...newItem,
          sortOrder: items.length + 1,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, data]);
        setNewItem({ title: '', description: '', category: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  // Update item
  const updateItem = async (itemId: string, updates: Partial<ChecklistItem>) => {
    try {
      const res = await fetch(`/api/checklist/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setItems((prev) => prev.map((i) => (i.id === itemId ? data : i)));
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  // Delete item
  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`/api/checklist/items/${itemId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setCompletions((prev) => prev.filter((c) => c.itemId !== itemId));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>
  );

  // Get completion status for an item
  const isCompleted = (itemId: string) => {
    return completions.find((c) => c.itemId === itemId)?.completed || false;
  };

  // Calculate completion percentage
  const completionRate = weekStats?.completionRate || 0;

  // Get progress bar color based on completion rate
  const getProgressColor = (rate: number) => {
    if (rate >= 100) return 'bg-yellow-500'; // Champion
    if (rate >= 75) return 'bg-green-500'; // Ideal
    if (rate >= 50) return 'bg-blue-500'; // Minimum
    return 'bg-red-500'; // Below minimum
  };

  // Get status text
  const getStatusText = (rate: number) => {
    if (rate >= 100) return { text: 'Champion!', color: 'text-yellow-600', emoji: '🏆' };
    if (rate >= 75) return { text: 'Ideal Progress', color: 'text-green-600', emoji: '⭐' };
    if (rate >= 50) return { text: 'On Track', color: 'text-blue-600', emoji: '👍' };
    return { text: 'Keep Going!', color: 'text-red-600', emoji: '💪' };
  };

  const status = getStatusText(completionRate);

  // Chart data for history
  const chartData = history.map((h) => ({
    week: h.weekLabel,
    rate: Math.round(h.completionRate),
    completed: h.completedItems,
    total: h.totalItems,
  }));

  // Category colors
  const categoryColors: Record<string, string> = {
    'Warm-up': 'bg-orange-100 text-orange-700 border-orange-200',
    Learning: 'bg-blue-100 text-blue-700 border-blue-200',
    Energy: 'bg-purple-100 text-purple-700 border-purple-200',
    Content: 'bg-pink-100 text-pink-700 border-pink-200',
    Community: 'bg-green-100 text-green-700 border-green-200',
    Practice: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Action: 'bg-red-100 text-red-700 border-red-200',
    Uncategorized: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  if (loading && salesReps.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Navigation currentPage="sales-checklist" />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Checklist</h1>
          <p className="text-gray-600">
            Week of {weekLabel} - Track your daily sales development activities
          </p>
        </div>

        {/* Rep Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Sales Rep</label>
          <select
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {salesReps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Weekly Progress</h2>
            <div className={`flex items-center gap-2 ${status.color}`}>
              <span className="text-2xl">{status.emoji}</span>
              <span className="font-medium">{status.text}</span>
            </div>
          </div>

          {/* Progress Bar with Milestones */}
          <div className="relative pt-6 pb-2">
            {/* Milestone markers */}
            <div className="absolute top-0 left-0 right-0 flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span className="absolute left-1/2 -translate-x-1/2 text-blue-600 font-medium">
                50% Min
              </span>
              <span className="absolute left-3/4 -translate-x-1/2 text-green-600 font-medium">
                75% Ideal
              </span>
              <span className="text-yellow-600 font-medium">100% Champion</span>
            </div>

            {/* Progress bar background */}
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden relative">
              {/* Milestone lines */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-400 z-10" />
              <div className="absolute left-3/4 top-0 bottom-0 w-0.5 bg-green-400 z-10" />

              {/* Progress fill */}
              <div
                className={`h-full ${getProgressColor(completionRate)} transition-all duration-500`}
                style={{ width: `${Math.min(completionRate, 100)}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-gray-600">
                {weekStats?.completedItems || 0} of {weekStats?.totalItems || 0} completed
              </span>
              <span className="font-bold text-gray-900">{Math.round(completionRate)}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checklist Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Checklist Items</h2>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  + Add Item
                </button>
              </div>

              {/* Add Item Form */}
              {showAddForm && (
                <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Item title"
                      value={newItem.title}
                      onChange={(e) => setNewItem((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select Category</option>
                      <option value="Warm-up">Warm-up</option>
                      <option value="Learning">Learning</option>
                      <option value="Energy">Energy</option>
                      <option value="Content">Content</option>
                      <option value="Community">Community</option>
                      <option value="Practice">Practice</option>
                      <option value="Action">Action</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={addItem}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewItem({ title: '', description: '', category: '' });
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Items by Category */}
              <div className="divide-y divide-gray-100">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div
                      className={`px-6 py-2 ${categoryColors[category]?.split(' ')[0] || 'bg-gray-100'}`}
                    >
                      <span
                        className={`text-sm font-medium ${categoryColors[category]?.split(' ')[1] || 'text-gray-700'}`}
                      >
                        {category}
                      </span>
                    </div>

                    {/* Category Items */}
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={`px-6 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                          isCompleted(item.id) ? 'bg-green-50' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleCompletion(item.id)}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isCompleted(item.id)
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {isCompleted(item.id) && (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {editingItem === item.id ? (
                            <EditItemForm
                              item={item}
                              onSave={(updates) => updateItem(item.id, updates)}
                              onCancel={() => setEditingItem(null)}
                            />
                          ) : (
                            <>
                              <div
                                className={`font-medium ${isCompleted(item.id) ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                              >
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-sm text-gray-500 mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        {editingItem !== item.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100">
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Edit"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {items.length === 0 && !loading && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <p>No checklist items yet.</p>
                    <p className="text-sm mt-1">
                      Click &quot;Add Item&quot; to create your first checklist item.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Week-over-Week Progress</h2>
              </div>

              {/* Chart */}
              <div className="p-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${value}%`,
                          'Completion Rate',
                        ]}
                        labelFormatter={(label) => `Week of ${label}`}
                      />
                      <ReferenceLine y={50} stroke="#3b82f6" strokeDasharray="3 3" />
                      <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="3 3" />
                      <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.rate >= 100
                                ? '#eab308'
                                : entry.rate >= 75
                                  ? '#22c55e'
                                  : entry.rate >= 50
                                    ? '#3b82f6'
                                    : '#ef4444'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
                    No history data yet
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span>&lt;50%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>50-74%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>75-99%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-yellow-500" />
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* History List */}
              <div className="border-t border-gray-200">
                <div className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">
                  Recent Weeks
                </div>
                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {history.map((week, index) => (
                    <div key={index} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{week.weekLabel}</div>
                        <div className="text-xs text-gray-500">
                          {week.completedItems}/{week.totalItems} completed
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          week.completionRate >= 100
                            ? 'text-yellow-600'
                            : week.completionRate >= 75
                              ? 'text-green-600'
                              : week.completionRate >= 50
                                ? 'text-blue-600'
                                : 'text-red-600'
                        }`}
                      >
                        {Math.round(week.completionRate)}%
                      </div>
                    </div>
                  ))}

                  {history.length === 0 && (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                      No history yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Item Form Component
function EditItemForm({
  item,
  onSave,
  onCancel,
}: {
  item: ChecklistItem;
  onSave: (updates: Partial<ChecklistItem>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [category, setCategory] = useState(item.category || '');

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">No Category</option>
        <option value="Warm-up">Warm-up</option>
        <option value="Learning">Learning</option>
        <option value="Energy">Energy</option>
        <option value="Content">Content</option>
        <option value="Community">Community</option>
        <option value="Practice">Practice</option>
        <option value="Action">Action</option>
      </select>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ title, description, category })}
          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

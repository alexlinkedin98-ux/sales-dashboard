'use client';

import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, format, subMonths, addMonths } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { Navigation } from '@/components/Navigation';

interface FinanceUser {
  id: string;
  name: string;
}

interface SalesItem {
  name: string;
  amount: number;
  notes?: string;
}

interface FinanceEntry {
  id: string;
  userId: string;
  monthStartDate: string;
  monthLabel: string;
  salesItems: string | null;
  salesTotal: number;
  reviewsExpense: number;
  paidAuditsExpense: number;
  lpExpense: number;
  bookingsExpense: number;
  tenPercentExpense: number;
  otherExpenses: string | null;
  expensesTotal: number;
  netTotal: number;
  notes: string | null;
}

interface Stats {
  totalSales: number;
  totalExpenses: number;
  netTotal: number;
  avgMonthlySales: number;
  avgMonthlyExpenses: number;
  monthCount: number;
}

export default function FinanceTrackerPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<FinanceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<FinanceUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Data state
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  // Editing state
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);

  // Form state
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [newSaleItem, setNewSaleItem] = useState({ name: '', amount: '' });
  const [expenses, setExpenses] = useState({
    reviews: 0,
    paidAudits: 0,
    lp: 0,
    bookings: 0,
    tenPercent: 0,
  });
  const [notes, setNotes] = useState('');

  // Fetch existing users
  useEffect(() => {
    fetch('/api/finance/auth')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
        }
      })
      .catch(console.error);
  }, []);

  // Handle login/register
  const handleAuth = async () => {
    setAuthError('');

    if (!authName.trim() || !authPassword.trim()) {
      setAuthError('Please enter both name and password');
      return;
    }

    try {
      const res = await fetch('/api/finance/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName.trim(),
          password: authPassword,
          action: authMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }

      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setAuthPassword('');

      // Refresh users list if registered
      if (authMode === 'register') {
        setUsers((prev) => [...prev, data.user]);
      }
    } catch (error) {
      setAuthError('Authentication failed');
    }
  };

  // Fetch finance entries
  const fetchEntries = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/finance/entries?userId=${currentUser.id}&months=12`);
      const data = await res.json();

      setEntries(data.entries || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchEntries();
    }
  }, [isAuthenticated, currentUser, fetchEntries]);

  // Open entry form for a month
  const openEntryForm = (month: Date, existingEntry?: FinanceEntry) => {
    setSelectedMonth(month);
    setShowEntryForm(true);

    if (existingEntry) {
      setEditingEntry(existingEntry);
      setSalesItems(existingEntry.salesItems ? JSON.parse(existingEntry.salesItems) : []);
      setExpenses({
        reviews: existingEntry.reviewsExpense,
        paidAudits: existingEntry.paidAuditsExpense,
        lp: existingEntry.lpExpense,
        bookings: existingEntry.bookingsExpense,
        tenPercent: existingEntry.tenPercentExpense,
      });
      setNotes(existingEntry.notes || '');
    } else {
      setEditingEntry(null);
      setSalesItems([]);
      setExpenses({ reviews: 0, paidAudits: 0, lp: 0, bookings: 0, tenPercent: 0 });
      setNotes('');
    }
  };

  // Add sales item
  const addSalesItem = () => {
    if (!newSaleItem.name || !newSaleItem.amount) return;
    setSalesItems((prev) => [
      ...prev,
      { name: newSaleItem.name, amount: parseFloat(newSaleItem.amount) || 0 },
    ]);
    setNewSaleItem({ name: '', amount: '' });
  };

  // Remove sales item
  const removeSalesItem = (index: number) => {
    setSalesItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Save entry
  const saveEntry = async () => {
    if (!currentUser) return;

    try {
      const res = await fetch('/api/finance/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          monthStartDate: selectedMonth.toISOString(),
          salesItems,
          reviewsExpense: expenses.reviews,
          paidAuditsExpense: expenses.paidAudits,
          lpExpense: expenses.lp,
          bookingsExpense: expenses.bookings,
          tenPercentExpense: expenses.tenPercent,
          notes,
        }),
      });

      if (res.ok) {
        setShowEntryForm(false);
        fetchEntries();
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  // Calculate totals for form preview
  const salesTotal = salesItems.reduce((sum, item) => sum + item.amount, 0);
  const expensesTotal =
    expenses.reviews + expenses.paidAudits + expenses.lp + expenses.bookings + expenses.tenPercent;
  const netTotal = salesTotal - expensesTotal;

  // Chart data
  const chartData = entries
    .slice()
    .reverse()
    .map((entry) => ({
      month: format(new Date(entry.monthStartDate), 'MMM yy'),
      sales: entry.salesTotal,
      expenses: entry.expensesTotal,
      net: entry.netTotal,
    }));

  // Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setEntries([]);
    setStats(null);
    setAuthPassword('');
  };

  // Login/Register Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">🔒</div>
              <h1 className="text-2xl font-bold text-gray-900">Finance Tracker</h1>
              <p className="text-gray-600 mt-2">Password protected</p>
            </div>

            {/* Auth Mode Tabs */}
            <div className="flex mb-6 border-b border-gray-200">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`flex-1 py-2 text-sm font-medium ${
                  authMode === 'login'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`flex-1 py-2 text-sm font-medium ${
                  authMode === 'register'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Existing Users Quick Select (only for login) */}
            {authMode === 'login' && users.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Account
                </label>
                <div className="flex flex-wrap gap-2">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setAuthName(user.name)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        authName === user.name
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {user.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Auth Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder={authMode === 'register' ? 'Enter your name' : 'Select or enter name'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  placeholder={authMode === 'register' ? 'Create a password' : 'Enter password'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {authError && (
                <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  {authError}
                </div>
              )}

              <button
                onClick={handleAuth}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                {authMode === 'register' ? 'Create Account' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Finance Tracker UI
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Navigation currentPage="finance" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Finance Tracker</h1>
            <p className="text-gray-600">
              Logged in as <span className="font-semibold">{currentUser?.name}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Total Sales ({stats.monthCount} months)</div>
              <div className="text-2xl font-bold text-green-600">
                ${stats.totalSales.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Total Expenses</div>
              <div className="text-2xl font-bold text-red-600">
                ${stats.totalExpenses.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Net Total</div>
              <div
                className={`text-2xl font-bold ${stats.netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                ${stats.netTotal.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Avg Monthly Net</div>
              <div
                className={`text-2xl font-bold ${stats.avgMonthlySales - stats.avgMonthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                ${(stats.avgMonthlySales - stats.avgMonthlyExpenses).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" name="Net" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Entries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Entries</h2>
            <button
              onClick={() => openEntryForm(startOfMonth(new Date()))}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Add Month
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {entries.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No entries yet. Click &quot;Add Month&quot; to create your first entry.
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openEntryForm(new Date(entry.monthStartDate), entry)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{entry.monthLabel}</div>
                      <div className="text-sm text-gray-500">
                        {entry.salesItems
                          ? JSON.parse(entry.salesItems).length
                          : 0}{' '}
                        sales items
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-medium">
                        +${entry.salesTotal.toLocaleString()}
                      </div>
                      <div className="text-red-600 text-sm">
                        -${entry.expensesTotal.toLocaleString()}
                      </div>
                      <div
                        className={`font-bold ${entry.netTotal >= 0 ? 'text-blue-600' : 'text-red-600'}`}
                      >
                        = ${entry.netTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Entry Form Modal */}
      {showEntryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingEntry ? 'Edit Entry' : 'New Entry'}
                </h3>
                <p className="text-sm text-gray-500">{format(selectedMonth, 'MMMM yyyy')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  ←
                </button>
                <button
                  onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  →
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Sales Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Sales / Income</h4>

                {/* Existing sales items */}
                <div className="space-y-2 mb-3">
                  {salesItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg"
                    >
                      <span className="text-gray-900">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-700">
                          ${item.amount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => removeSalesItem(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new sales item */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Client/Source name"
                    value={newSaleItem.name}
                    onChange={(e) => setNewSaleItem((prev) => ({ ...prev, name: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newSaleItem.amount}
                    onChange={(e) =>
                      setNewSaleItem((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={addSalesItem}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>

                <div className="text-right mt-2 text-green-700 font-semibold">
                  Sales Total: ${salesTotal.toLocaleString()}
                </div>
              </div>

              {/* Expenses */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Expenses</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Reviews</label>
                    <input
                      type="number"
                      value={expenses.reviews || ''}
                      onChange={(e) =>
                        setExpenses((prev) => ({
                          ...prev,
                          reviews: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Paid Audits</label>
                    <input
                      type="number"
                      value={expenses.paidAudits || ''}
                      onChange={(e) =>
                        setExpenses((prev) => ({
                          ...prev,
                          paidAudits: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">LP (Landing Page)</label>
                    <input
                      type="number"
                      value={expenses.lp || ''}
                      onChange={(e) =>
                        setExpenses((prev) => ({ ...prev, lp: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">Bookings</label>
                    <input
                      type="number"
                      value={expenses.bookings || ''}
                      onChange={(e) =>
                        setExpenses((prev) => ({
                          ...prev,
                          bookings: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">10% (Commission)</label>
                    <input
                      type="number"
                      value={expenses.tenPercent || ''}
                      onChange={(e) =>
                        setExpenses((prev) => ({
                          ...prev,
                          tenPercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="text-right mt-2 text-red-600 font-semibold">
                  Expenses Total: ${expensesTotal.toLocaleString()}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Net Total:</span>
                  <span className={`font-bold ${netTotal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${netTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowEntryForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveEntry}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

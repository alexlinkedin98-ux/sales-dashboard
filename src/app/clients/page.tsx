'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

interface FeeEntry {
  id: string;
  monthStartDate: string;
  monthLabel: string;
  monthlyFee: number;
  commission: number;
}

interface Client {
  id: string;
  clientName: string;
  clientType: string;
  dateAcquired: string;
  dateAcquiredLabel: string;
  isActive: boolean;
  churned: boolean;
  churnMonth: number | null;
  fupSequenceActive: boolean;
  notes: string | null;
  currentFee: number;
  currentCommission: number;
  feeTrend: 'up' | 'down' | 'stable';
  feeChange: number;
  monthsActive: number;
  feeHistory: FeeEntry[];
}

interface ClientData {
  clients: Client[];
  summary: {
    totalClients: number;
    activeClients: number;
    churnedClients: number;
    currentMonthFees: number;
    currentMonthCommission: number;
    totalFees: number;
    totalCommission: number;
    avgMonthlyFee: number;
    retentionRate: number;
  };
  monthlyBreakdown: {
    month: string;
    monthDate: string;
    totalFees: number;
    totalCommission: number;
    activeClients: number;
  }[];
  clientTypeBreakdown: Record<string, { count: number; totalFees: number }>;
  lastUpdated: string;
}

type ViewMode = 'clients' | 'monthly' | 'summary';
type FilterMode = 'all' | 'active' | 'churned';

const CLIENT_TYPES = ['Google Ads', 'Meta', 'Google + Meta'];

export default function ClientsPage() {
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('clients');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddFee, setShowAddFee] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);

  // Form states
  const [newClient, setNewClient] = useState({
    clientName: '',
    clientType: 'Google Ads',
    dateAcquired: new Date().toISOString().split('T')[0],
    initialFee: 0,
    fupSequenceActive: true,
    notes: '',
  });

  const [newFee, setNewFee] = useState({
    monthStartDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    monthlyFee: 0,
  });

  const [churnData, setChurnData] = useState({
    churned: false,
    churnMonth: 2,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients/data');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });

      if (response.ok) {
        setShowAddClient(false);
        setNewClient({
          clientName: '',
          clientType: 'Google Ads',
          dateAcquired: new Date().toISOString().split('T')[0],
          initialFee: 0,
          fupSequenceActive: true,
          notes: '',
        });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add client');
      }
    } catch (error) {
      console.error('Error adding client:', error);
      alert('Failed to add client');
    }
  };

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const response = await fetch(`/api/clients/${selectedClient.id}/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFee),
      });

      if (response.ok) {
        setShowAddFee(false);
        setSelectedClient(null);
        setNewFee({
          monthStartDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            .toISOString()
            .split('T')[0],
          monthlyFee: 0,
        });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add fee');
      }
    } catch (error) {
      console.error('Error adding fee:', error);
      alert('Failed to add fee');
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient) return;

    try {
      const response = await fetch(`/api/clients/${editClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: editClient.clientName,
          clientType: editClient.clientType,
          fupSequenceActive: editClient.fupSequenceActive,
          churned: churnData.churned,
          churnMonth: churnData.churned ? churnData.churnMonth : null,
          notes: editClient.notes,
        }),
      });

      if (response.ok) {
        setEditClient(null);
        setChurnData({ churned: false, churnMonth: 2 });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Failed to update client');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client and all their fee history?')) return;

    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const filteredClients = data
    ? data.clients.filter((client) => {
        if (filterMode === 'active') return client.isActive && !client.churned;
        if (filterMode === 'churned') return client.churned;
        return true;
      })
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading client portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Portfolio</h1>
              {data && (
                <p className="text-sm text-gray-500">
                  {data.summary.activeClients} active clients | Last updated:{' '}
                  {new Date(data.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Navigation currentPage="clients" />
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={() => setShowAddClient(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Client
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'clients', label: 'Clients' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'summary', label: 'Summary' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key as ViewMode)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === tab.key
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {viewMode === 'clients' && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-900">Filter:</label>
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                  className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-900"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        {data && viewMode === 'summary' && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Total Clients</div>
                  <div className="text-3xl font-bold text-indigo-600">{data.summary.totalClients}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Active</div>
                  <div className="text-3xl font-bold text-green-600">{data.summary.activeClients}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Churned</div>
                  <div className="text-3xl font-bold text-red-600">{data.summary.churnedClients}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">This Month Fees</div>
                  <div className="text-3xl font-bold text-blue-600">
                    ${data.summary.currentMonthFees.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">This Month Commission</div>
                  <div className="text-3xl font-bold text-emerald-600">
                    ${data.summary.currentMonthCommission.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-indigo-100">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">All-Time Fees</div>
                  <div className="text-xl font-bold text-gray-700">
                    ${data.summary.totalFees.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">All-Time Commission</div>
                  <div className="text-xl font-bold text-gray-700">
                    ${data.summary.totalCommission.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Avg Monthly Fee</div>
                  <div className="text-xl font-bold text-gray-700">
                    ${data.summary.avgMonthlyFee.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">Retention Rate</div>
                  <div className="text-xl font-bold text-gray-700">
                    {data.summary.retentionRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Client Type Breakdown */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Type Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(data.clientTypeBreakdown).map(([type, info]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700">{type}</div>
                    <div className="text-2xl font-bold text-indigo-600">{info.count} clients</div>
                    <div className="text-sm text-gray-500">
                      ${info.totalFees.toLocaleString()} monthly fees
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Monthly View */}
        {data && viewMode === 'monthly' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Month
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Active Clients
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Total Fees
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Commission (10%)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.monthlyBreakdown.map((month, idx) => (
                    <tr key={month.monthDate} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {month.month}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                        {month.activeClients}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600 text-center">
                        ${month.totalFees.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 text-center">
                        ${month.totalCommission.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Clients View */}
        {viewMode === 'clients' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {filterMode === 'all' ? 'All Clients' : filterMode === 'active' ? 'Active Clients' : 'Churned Clients'}
              <span className="text-sm font-normal text-gray-500 ml-2">({filteredClients.length})</span>
            </h2>
            {filteredClients.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No clients found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Acquired
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Months
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Current Fee
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Commission
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Trend
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        FUP
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client, idx) => (
                      <tr key={client.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.clientName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {client.clientType}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                          {client.dateAcquiredLabel}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                          {client.monthsActive}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600 text-center">
                          ${client.currentFee.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-emerald-600 text-center">
                          ${client.currentCommission.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {client.feeTrend === 'up' && (
                            <span className="text-green-600">
                              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              +${client.feeChange.toLocaleString()}
                            </span>
                          )}
                          {client.feeTrend === 'down' && (
                            <span className="text-red-600">
                              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              ${client.feeChange.toLocaleString()}
                            </span>
                          )}
                          {client.feeTrend === 'stable' && (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {client.fupSequenceActive ? (
                            <span className="text-green-600" title="FUP Sequence Active">
                              <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          ) : (
                            <span className="text-red-600" title="FUP Sequence Inactive">
                              <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {client.churned ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Churned M{client.churnMonth}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              setNewFee({
                                monthStartDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                  .toISOString()
                                  .split('T')[0],
                                monthlyFee: client.currentFee,
                              });
                              setShowAddFee(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Add Fee"
                          >
                            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setEditClient(client);
                              setChurnData({
                                churned: client.churned,
                                churnMonth: client.churnMonth || 2,
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {(!data || data.clients.length === 0) && viewMode !== 'summary' && (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No clients yet</h2>
            <p className="mt-2 text-gray-600">Start tracking your client portfolio by adding a client.</p>
          </div>
        )}
      </main>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Client</h3>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={newClient.clientName}
                  onChange={(e) => setNewClient({ ...newClient, clientName: e.target.value })}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                  placeholder="e.g., Saberspro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Type</label>
                <select
                  value={newClient.clientType}
                  onChange={(e) => setNewClient({ ...newClient, clientType: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                >
                  {CLIENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Acquired</label>
                <input
                  type="date"
                  value={newClient.dateAcquired}
                  onChange={(e) => setNewClient({ ...newClient, dateAcquired: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Monthly Fee ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newClient.initialFee}
                  onChange={(e) => setNewClient({ ...newClient, initialFee: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                />
                {newClient.initialFee > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Commission: ${(newClient.initialFee * 0.1).toLocaleString()} (10%)
                  </p>
                )}
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fupSequenceActive"
                  checked={newClient.fupSequenceActive}
                  onChange={(e) => setNewClient({ ...newClient, fupSequenceActive: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="fupSequenceActive" className="ml-2 text-sm text-gray-700">
                  FUP Sequence Active (loyalty emails)
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fee Modal */}
      {showAddFee && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Monthly Fee - {selectedClient.clientName}
            </h3>
            <form onSubmit={handleAddFee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <input
                  type="date"
                  value={newFee.monthStartDate}
                  onChange={(e) => setNewFee({ ...newFee, monthStartDate: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Select any day in the month - it will be recorded as the first of that month</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Fee ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newFee.monthlyFee}
                  onChange={(e) => setNewFee({ ...newFee, monthlyFee: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                />
                {newFee.monthlyFee > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Commission: ${(newFee.monthlyFee * 0.1).toLocaleString()} (10%)
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFee(false);
                    setSelectedClient(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Add Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Client - {editClient.clientName}</h3>
            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={editClient.clientName}
                  onChange={(e) => setEditClient({ ...editClient, clientName: e.target.value })}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Type</label>
                <select
                  value={editClient.clientType}
                  onChange={(e) => setEditClient({ ...editClient, clientType: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                >
                  {CLIENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editFupSequenceActive"
                  checked={editClient.fupSequenceActive}
                  onChange={(e) => setEditClient({ ...editClient, fupSequenceActive: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="editFupSequenceActive" className="ml-2 text-sm text-gray-700">
                  FUP Sequence Active
                </label>
              </div>

              {/* Churn Status */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="churned"
                    checked={churnData.churned}
                    onChange={(e) => setChurnData({ ...churnData, churned: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="churned" className="ml-2 text-sm text-gray-700">
                    Client has churned
                  </label>
                </div>
                {churnData.churned && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Churn Month</label>
                    <select
                      value={churnData.churnMonth}
                      onChange={(e) => setChurnData({ ...churnData, churnMonth: parseInt(e.target.value) })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-gray-900"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <option key={m} value={m}>
                          Month {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editClient.notes || ''}
                  onChange={(e) => setEditClient({ ...editClient, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditClient(null);
                    setChurnData({ churned: false, churnMonth: 2 });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">Client Portfolio - Commission Tracking Dashboard</p>
        </div>
      </footer>
    </div>
  );
}

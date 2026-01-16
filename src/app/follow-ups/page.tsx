'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { Navigation } from '@/components/Navigation';

interface FollowUpSequence {
  id: string;
  callAnalysisId: string;
  contactName: string;
  contactEmail: string | null;
  sequenceStartDate: string;
  cooldownEndDate: string;
  status: 'cooling' | 'active' | 'completed' | 'won';
  currentCycle: number;
  email1Due: string | null;
  email1Sent: boolean;
  email1Content: string | null;
  email2Due: string | null;
  email2Sent: boolean;
  email3Due: string | null;
  email3Sent: boolean;
  nextCooldownEnd: string | null;
  notes: string | null;
  callAnalysis: {
    id: string;
    callLabel: string;
    callDate: string;
    transcript: string | null;
    crmLink: string | null;
    salesRep: {
      id: string;
      name: string;
    };
  };
}

type ViewMode = 'active' | 'cooling' | 'won' | 'all';

export default function WarmFollowUpsPage() {
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [generatingEmail, setGeneratingEmail] = useState<string | null>(null);
  const [expandedSequence, setExpandedSequence] = useState<string | null>(null);
  const [updatingSequence, setUpdatingSequence] = useState<string | null>(null);

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/follow-ups');
      if (response.ok) {
        const data = await response.json();
        setSequences(data);
      }
    } catch (error) {
      console.error('Error fetching sequences:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEmail = async (sequenceId: string) => {
    setGeneratingEmail(sequenceId);
    try {
      const response = await fetch(`/api/follow-ups/${sequenceId}/generate-email`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setSequences(prev =>
          prev.map(seq =>
            seq.id === sequenceId ? { ...seq, email1Content: data.email } : seq
          )
        );
        setExpandedSequence(sequenceId);
      }
    } catch (error) {
      console.error('Error generating email:', error);
    } finally {
      setGeneratingEmail(null);
    }
  };

  const markEmailSent = async (sequenceId: string, emailNumber: 1 | 2 | 3) => {
    setUpdatingSequence(sequenceId);
    try {
      const response = await fetch(`/api/follow-ups/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`markEmail${emailNumber}Sent`]: true }),
      });
      if (response.ok) {
        fetchSequences();
      }
    } catch (error) {
      console.error('Error marking email sent:', error);
    } finally {
      setUpdatingSequence(null);
    }
  };

  const markAsWon = async (sequenceId: string) => {
    if (!confirm('Mark this prospect as Won? This will end the follow-up sequence.')) return;

    setUpdatingSequence(sequenceId);
    try {
      const response = await fetch(`/api/follow-ups/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'won' }),
      });
      if (response.ok) {
        fetchSequences();
      }
    } catch (error) {
      console.error('Error marking as won:', error);
    } finally {
      setUpdatingSequence(null);
    }
  };

  const deleteSequence = async (sequenceId: string) => {
    if (!confirm('Remove this prospect from the follow-up sequence?')) return;

    try {
      const response = await fetch(`/api/follow-ups/${sequenceId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchSequences();
      }
    } catch (error) {
      console.error('Error deleting sequence:', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Email copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const filteredSequences = sequences.filter(seq => {
    if (viewMode === 'all') return true;
    if (viewMode === 'active') return seq.status === 'active';
    if (viewMode === 'cooling') return seq.status === 'cooling';
    if (viewMode === 'won') return seq.status === 'won';
    return true;
  });

  const activeCount = sequences.filter(s => s.status === 'active').length;
  const coolingCount = sequences.filter(s => s.status === 'cooling').length;
  const wonCount = sequences.filter(s => s.status === 'won').length;

  const getNextAction = (seq: FollowUpSequence): { action: string; urgent: boolean; dueDate: Date | null } => {
    if (seq.status === 'won') {
      return { action: 'Closed Won', urgent: false, dueDate: null };
    }
    if (seq.status === 'cooling') {
      return {
        action: `Cooldown until ${format(new Date(seq.cooldownEndDate), 'MMM d, yyyy')}`,
        urgent: false,
        dueDate: new Date(seq.cooldownEndDate)
      };
    }
    if (!seq.email1Sent) {
      const due = seq.email1Due ? new Date(seq.email1Due) : null;
      return {
        action: 'Send Email 1 (Personalized)',
        urgent: due ? isPast(due) || isToday(due) : false,
        dueDate: due
      };
    }
    if (!seq.email2Sent) {
      const due = seq.email2Due ? new Date(seq.email2Due) : null;
      return {
        action: `Send Email 2 ("${seq.contactName.split(' ')[0]}?")`,
        urgent: due ? isPast(due) || isToday(due) : false,
        dueDate: due
      };
    }
    if (!seq.email3Sent) {
      const due = seq.email3Due ? new Date(seq.email3Due) : null;
      return {
        action: `Send Email 3 ("${seq.contactName.split(' ')[0]}?")`,
        urgent: due ? isPast(due) || isToday(due) : false,
        dueDate: due
      };
    }
    return { action: 'Complete cycle', urgent: false, dueDate: null };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading follow-ups...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Warm Follow-ups</h1>
              <p className="text-sm text-gray-500">
                CRM for nurturing prospects over time
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Navigation currentPage="follow-ups" />
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setViewMode('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'active'
                  ? 'bg-rose-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setViewMode('cooling')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'cooling'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cooling ({coolingCount})
            </button>
            <button
              onClick={() => setViewMode('won')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'won'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Won ({wonCount})
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({sequences.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredSequences.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No follow-ups yet</h3>
            <p className="text-gray-500">
              Mark calls as &quot;Warm Follow-up&quot; in Call Analysis to add them here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSequences.map((seq) => {
              const nextAction = getNextAction(seq);
              const isExpanded = expandedSequence === seq.id;

              return (
                <div
                  key={seq.id}
                  className={`bg-white rounded-lg shadow-sm border ${
                    nextAction.urgent ? 'border-rose-300 bg-rose-50' : 'border-gray-200'
                  }`}
                >
                  {/* Main Row */}
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Contact Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {seq.contactName}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            seq.status === 'active' ? 'bg-rose-100 text-rose-800' :
                            seq.status === 'cooling' ? 'bg-blue-100 text-blue-800' :
                            seq.status === 'won' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {seq.status === 'active' ? 'Active' :
                             seq.status === 'cooling' ? `Cooling (Cycle ${seq.currentCycle})` :
                             seq.status === 'won' ? 'Won' : seq.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {seq.callAnalysis.callLabel} • {seq.callAnalysis.salesRep.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Original call: {format(new Date(seq.callAnalysis.callDate), 'MMM d, yyyy')}
                          {seq.callAnalysis.crmLink && (
                            <a
                              href={seq.callAnalysis.crmLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:underline"
                            >
                              View in CRM
                            </a>
                          )}
                        </p>
                      </div>

                      {/* Next Action */}
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-sm font-medium ${nextAction.urgent ? 'text-rose-600' : 'text-gray-700'}`}>
                          {nextAction.action}
                        </p>
                        {nextAction.dueDate && (
                          <p className={`text-xs ${nextAction.urgent ? 'text-rose-500' : 'text-gray-500'}`}>
                            {isPast(nextAction.dueDate) && !isToday(nextAction.dueDate)
                              ? `Overdue by ${formatDistanceToNow(nextAction.dueDate)}`
                              : isToday(nextAction.dueDate)
                              ? 'Due today'
                              : `Due ${formatDistanceToNow(nextAction.dueDate, { addSuffix: true })}`}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        {seq.status === 'active' && !seq.email1Sent && (
                          <>
                            {!seq.email1Content ? (
                              <button
                                onClick={() => generateEmail(seq.id)}
                                disabled={generatingEmail === seq.id}
                                className="px-3 py-1.5 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 disabled:opacity-50"
                              >
                                {generatingEmail === seq.id ? 'Generating...' : 'Generate Email'}
                              </button>
                            ) : (
                              <button
                                onClick={() => setExpandedSequence(isExpanded ? null : seq.id)}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                              >
                                {isExpanded ? 'Hide Email' : 'View Email'}
                              </button>
                            )}
                          </>
                        )}
                        {seq.status === 'active' && seq.email1Sent && !seq.email2Sent && (
                          <button
                            onClick={() => markEmailSent(seq.id, 2)}
                            disabled={updatingSequence === seq.id}
                            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
                          >
                            Mark Email 2 Sent
                          </button>
                        )}
                        {seq.status === 'active' && seq.email2Sent && !seq.email3Sent && (
                          <button
                            onClick={() => markEmailSent(seq.id, 3)}
                            disabled={updatingSequence === seq.id}
                            className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
                          >
                            Mark Email 3 Sent
                          </button>
                        )}
                        {seq.status !== 'won' && (
                          <button
                            onClick={() => markAsWon(seq.id)}
                            disabled={updatingSequence === seq.id}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Won
                          </button>
                        )}
                        <button
                          onClick={() => deleteSequence(seq.id)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Email Progress Bar */}
                    {seq.status === 'active' && (
                      <div className="mt-4 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          seq.email1Sent ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          1
                        </div>
                        <div className={`flex-1 h-1 ${seq.email1Sent ? 'bg-green-500' : 'bg-gray-200'}`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          seq.email2Sent ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          2
                        </div>
                        <div className={`flex-1 h-1 ${seq.email2Sent ? 'bg-green-500' : 'bg-gray-200'}`} />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          seq.email3Sent ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          3
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Email Content */}
                  {isExpanded && seq.email1Content && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-sm font-medium text-gray-700">Generated Email:</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(seq.email1Content!)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Copy to Clipboard
                          </button>
                          <button
                            onClick={() => markEmailSent(seq.id, 1)}
                            disabled={updatingSequence === seq.id}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            Mark as Sent
                          </button>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700">
                        {seq.email1Content}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Warm Follow-ups CRM - Nurture prospects with automated 3-month sequences
          </p>
        </div>
      </footer>
    </div>
  );
}

'use client';

// Follow-ups page with Reset functionality and Change History
import { useState, useEffect } from 'react';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { Navigation } from '@/components/Navigation';
import { ChangeHistory } from '@/components/ChangeHistory';

interface FollowUpSequence {
  id: string;
  callAnalysisId: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  sequenceStartDate: string;
  cooldownEndDate: string;
  status: 'cooling' | 'active' | 'completed' | 'won';
  currentCycle: number;
  // New 5-step fields
  step1Due: string | null;
  step1Done: boolean;
  step1Content: string | null;
  step2Due: string | null;
  step2Done: boolean;
  step3Due: string | null;
  step3Done: boolean;
  step4Due: string | null;
  step4Done: boolean;
  step4Notes: string | null;
  step5Due: string | null;
  step5Done: boolean;
  // Legacy fields (for backwards compatibility)
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

interface SalesRep {
  id: string;
  name: string;
}

// Step definitions for the 5-step sequence
const STEPS = [
  { num: 1, type: 'email', label: 'Email 1', icon: 'envelope', description: 'AI-generated personalized email' },
  { num: 2, type: 'whatsapp', label: 'WhatsApp/Text', icon: 'chat', description: 'Quick text check-in' },
  { num: 3, type: 'email', label: 'Email 2', icon: 'envelope', description: 'Follow-up email' },
  { num: 4, type: 'call', label: 'Phone Call', icon: 'phone', description: 'Direct phone call' },
  { num: 5, type: 'email', label: 'Email 3', icon: 'envelope', description: 'Final email of cycle' },
];

export default function WarmFollowUpsPage() {
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [selectedRepId, setSelectedRepId] = useState<string>('all');
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [generatingEmail, setGeneratingEmail] = useState<string | null>(null);
  const [expandedSequence, setExpandedSequence] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null); // Which step is expanded for viewing
  const [updatingSequence, setUpdatingSequence] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: '', phone: '' });
  const [callNotes, setCallNotes] = useState('');

  useEffect(() => {
    fetchSequences();
    fetchReps();
  }, []);

  const fetchReps = async () => {
    try {
      const response = await fetch('/api/reps');
      if (response.ok) {
        const data = await response.json();
        setReps(data);
      }
    } catch (error) {
      console.error('Error fetching reps:', error);
    }
  };

  // Auto-expand the first active sequence when data loads or view mode changes to active
  useEffect(() => {
    if (!loading && sequences.length > 0) {
      // Only auto-expand if viewing active sequences and nothing is expanded yet
      if (viewMode === 'active' && expandedSequence === null) {
        const firstActive = sequences.find(s => s.status === 'active');
        if (firstActive) {
          setExpandedSequence(firstActive.id);
          setExpandedStep(null); // Show current step content
        }
      }
    }
  }, [loading, sequences, viewMode, expandedSequence]);

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
            seq.id === sequenceId ? { ...seq, step1Content: data.email, email1Content: data.email } : seq
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

  const markStepDone = async (sequenceId: string, stepNumber: 1 | 2 | 3 | 4 | 5, notes?: string) => {
    setUpdatingSequence(sequenceId);
    try {
      const body: Record<string, unknown> = { [`markStep${stepNumber}Done`]: true };
      if (stepNumber === 4 && notes) {
        body.step4Notes = notes;
      }
      const response = await fetch(`/api/follow-ups/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        fetchSequences();
        setCallNotes('');
      }
    } catch (error) {
      console.error('Error marking step done:', error);
    } finally {
      setUpdatingSequence(null);
    }
  };

  const undoStep = async (sequenceId: string, stepNumber: 1 | 2 | 3 | 4 | 5) => {
    if (!confirm(`Undo step ${stepNumber}? This will mark it as not completed.`)) return;

    setUpdatingSequence(sequenceId);
    try {
      const response = await fetch(`/api/follow-ups/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`undoStep${stepNumber}`]: true }),
      });
      if (response.ok) {
        fetchSequences();
      }
    } catch (error) {
      console.error('Error undoing step:', error);
    } finally {
      setUpdatingSequence(null);
    }
  };

  const resetSequence = async (sequenceId: string, contactName: string) => {
    if (!confirm(`Reset "${contactName}" back to the beginning? This will make it active and start from Step 1.`)) return;

    setUpdatingSequence(sequenceId);
    try {
      const response = await fetch(`/api/follow-ups/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetSequence: true }),
      });
      if (response.ok) {
        fetchSequences();
        setExpandedSequence(sequenceId);
        setExpandedStep(null);
      }
    } catch (error) {
      console.error('Error resetting sequence:', error);
    } finally {
      setUpdatingSequence(null);
    }
  };

  const updateContactInfo = async (sequenceId: string) => {
    setUpdatingSequence(sequenceId);
    try {
      const response = await fetch(`/api/follow-ups/${sequenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactEmail: editForm.email || null,
          contactPhone: editForm.phone || null,
        }),
      });
      if (response.ok) {
        fetchSequences();
        setEditingContact(null);
      }
    } catch (error) {
      console.error('Error updating contact:', error);
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
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // First filter by sales rep
  const repFilteredSequences = selectedRepId === 'all'
    ? sequences
    : sequences.filter(seq => seq.callAnalysis.salesRep.id === selectedRepId);

  // Then filter by status
  const filteredSequences = repFilteredSequences.filter(seq => {
    if (viewMode === 'all') return true;
    if (viewMode === 'active') return seq.status === 'active';
    if (viewMode === 'cooling') return seq.status === 'cooling';
    if (viewMode === 'won') return seq.status === 'won';
    return true;
  });

  // Counts based on rep filter
  const activeCount = repFilteredSequences.filter(s => s.status === 'active').length;
  const coolingCount = repFilteredSequences.filter(s => s.status === 'cooling').length;
  const wonCount = repFilteredSequences.filter(s => s.status === 'won').length;

  const getCurrentStep = (seq: FollowUpSequence): number => {
    if (!seq.step1Done) return 1;
    if (!seq.step2Done) return 2;
    if (!seq.step3Done) return 3;
    if (!seq.step4Done) return 4;
    if (!seq.step5Done) return 5;
    return 6; // All done
  };

  const getStepDueDate = (seq: FollowUpSequence, stepNum: number): Date | null => {
    const dueDates: Record<number, string | null> = {
      1: seq.step1Due,
      2: seq.step2Due,
      3: seq.step3Due,
      4: seq.step4Due,
      5: seq.step5Due,
    };
    return dueDates[stepNum] ? new Date(dueDates[stepNum]!) : null;
  };

  const isStepDone = (seq: FollowUpSequence, stepNum: number): boolean => {
    const done: Record<number, boolean> = {
      1: seq.step1Done,
      2: seq.step2Done,
      3: seq.step3Done,
      4: seq.step4Done,
      5: seq.step5Done,
    };
    return done[stepNum] || false;
  };

  const getNextAction = (seq: FollowUpSequence): { action: string; stepNum: number; urgent: boolean; dueDate: Date | null } => {
    if (seq.status === 'won') {
      return { action: 'Closed Won', stepNum: 0, urgent: false, dueDate: null };
    }
    if (seq.status === 'cooling') {
      return {
        action: `Cooldown until ${format(new Date(seq.cooldownEndDate), 'MMM d, yyyy')}`,
        stepNum: 0,
        urgent: false,
        dueDate: new Date(seq.cooldownEndDate)
      };
    }

    const currentStep = getCurrentStep(seq);
    if (currentStep <= 5) {
      const step = STEPS[currentStep - 1];
      const due = getStepDueDate(seq, currentStep);
      return {
        action: step.label,
        stepNum: currentStep,
        urgent: due ? isPast(due) || isToday(due) : false,
        dueDate: due
      };
    }

    return { action: 'Complete cycle', stepNum: 0, urgent: false, dueDate: null };
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
                Multi-channel nurturing: Email &rarr; WhatsApp &rarr; Email &rarr; Call &rarr; Email
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Navigation currentPage="follow-ups" />
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <ChangeHistory />
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Sales Rep Filter */}
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Reps</option>
              {reps.map(rep => (
                <option key={rep.id} value={rep.id}>{rep.name}</option>
              ))}
            </select>

            <div className="w-px h-6 bg-gray-300" />

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
              All ({repFilteredSequences.length})
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
              const currentStep = getCurrentStep(seq);
              const isEditing = editingContact === seq.id;

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

                        {/* Contact details */}
                        {!isEditing ? (
                          <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                            {seq.contactEmail && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {seq.contactEmail}
                              </span>
                            )}
                            {seq.contactPhone && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {seq.contactPhone}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setEditingContact(seq.id);
                                setEditForm({ email: seq.contactEmail || '', phone: seq.contactPhone || '' });
                              }}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              {seq.contactEmail || seq.contactPhone ? 'Edit' : 'Add contact info'}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="email"
                              placeholder="Email"
                              value={editForm.email}
                              onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                              className="px-2 py-1 border rounded text-sm"
                            />
                            <input
                              type="tel"
                              placeholder="Phone"
                              value={editForm.phone}
                              onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                              className="px-2 py-1 border rounded text-sm"
                            />
                            <button
                              onClick={() => updateContactInfo(seq.id)}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingContact(null)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        <p className="text-sm text-gray-500 mt-1">
                          {seq.callAnalysis.callLabel} &bull; {seq.callAnalysis.salesRep.name}
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

                      {/* Quick Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        {seq.status !== 'won' && (
                          <button
                            onClick={() => markAsWon(seq.id)}
                            disabled={updatingSequence === seq.id}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Won
                          </button>
                        )}
                        {(seq.status === 'cooling' || (seq.status === 'active' && getCurrentStep(seq) > 1)) && (
                          <button
                            onClick={() => resetSequence(seq.id, seq.contactName)}
                            disabled={updatingSequence === seq.id}
                            className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 disabled:opacity-50"
                            title="Reset to beginning"
                          >
                            Reset
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

                    {/* 5-Step Progress Bar */}
                    {seq.status === 'active' && (
                      <div className="mt-4">
                        <div className="flex items-center gap-1">
                          {STEPS.map((step, idx) => {
                            const done = isStepDone(seq, step.num);
                            const isCurrent = currentStep === step.num;
                            const isCurrentExpanded = isExpanded && expandedStep === null;
                            return (
                              <div key={step.num} className="flex items-center flex-1">
                                <div
                                  className={`relative w-10 h-10 rounded-full flex flex-col items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                                    done
                                      ? 'bg-green-500 text-white hover:bg-green-600 hover:ring-2 hover:ring-amber-400'
                                      : isCurrent
                                      ? `bg-rose-500 text-white ring-2 ring-rose-300 ${!isCurrentExpanded ? 'animate-pulse' : ''}`
                                      : 'bg-gray-200 text-gray-500'
                                  }`}
                                  onClick={() => {
                                    if (done) {
                                      // Click on completed step to view its content
                                      if (expandedSequence === seq.id && expandedStep === step.num) {
                                        // Already viewing this step, collapse - go back to current step view
                                        setExpandedSequence(seq.id);
                                        setExpandedStep(null);
                                      } else {
                                        setExpandedSequence(seq.id);
                                        setExpandedStep(step.num);
                                      }
                                    } else if (isCurrent) {
                                      // Click on current step to expand/collapse
                                      if (isExpanded && expandedStep === null) {
                                        // Currently viewing current step, collapse
                                        setExpandedSequence(null);
                                        setExpandedStep(null);
                                      } else {
                                        // Either collapsed or viewing a completed step, go to current step
                                        setExpandedSequence(seq.id);
                                        setExpandedStep(null);
                                      }
                                    }
                                  }}
                                  title={done ? `Click to view ${step.label}` : `${step.label}: ${step.description}`}
                                >
                                  {/* Arrow indicator for current step when not expanded */}
                                  {isCurrent && !isCurrentExpanded && (
                                    <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                                      <svg className="w-3 h-3 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 16l-6-6h12l-6 6z" />
                                      </svg>
                                    </div>
                                  )}
                                  {step.type === 'email' && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                  {step.type === 'whatsapp' && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                  )}
                                  {step.type === 'call' && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                  )}
                                </div>
                                {idx < STEPS.length - 1 && (
                                  <div className={`flex-1 h-1 mx-1 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1 mt-3">
                          {STEPS.map((step, idx) => {
                            const done = isStepDone(seq, step.num);
                            const isCurrent = currentStep === step.num;
                            const isCurrentExpanded = isExpanded && expandedStep === null;
                            return (
                              <div key={step.num} className="flex items-center flex-1">
                                <span className={`text-xs w-10 text-center ${
                                  done ? 'text-green-600 cursor-pointer' :
                                  isCurrent ? 'text-rose-600 font-medium cursor-pointer' :
                                  'text-gray-500'
                                }`}>
                                  {done ? 'View' : isCurrent && !isCurrentExpanded ? 'Click' : step.label.split('/')[0]}
                                </span>
                                {idx < STEPS.length - 1 && <div className="flex-1" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Step Content */}
                  {isExpanded && seq.status === 'active' && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {/* Viewing a COMPLETED step */}
                      {expandedStep !== null && isStepDone(seq, expandedStep) && (
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-medium text-gray-700">
                              {STEPS[expandedStep - 1].label} <span className="text-green-600">(Completed)</span>
                            </h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => undoStep(seq.id, expandedStep as 1 | 2 | 3 | 4 | 5)}
                                disabled={updatingSequence === seq.id}
                                className="px-3 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 disabled:opacity-50"
                              >
                                Undo Step
                              </button>
                            </div>
                          </div>

                          {/* Step 1 content - show email */}
                          {expandedStep === 1 && (seq.step1Content || seq.email1Content) && (
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-gray-500">AI-generated email:</span>
                                <button
                                  onClick={() => copyToClipboard(seq.step1Content || seq.email1Content || '')}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700">
                                {seq.step1Content || seq.email1Content}
                              </div>
                            </div>
                          )}

                          {/* Step 2 content - WhatsApp message */}
                          {expandedStep === 2 && (
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-gray-500">WhatsApp/Text message:</span>
                                <button
                                  onClick={() => copyToClipboard(`Hi ${seq.contactName.split(' ')[0]}, just wanted to follow up on our conversation. Let me know if you have any questions!`)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600 italic">
                                &quot;Hi {seq.contactName.split(' ')[0]}, just wanted to follow up on our conversation. Let me know if you have any questions!&quot;
                              </div>
                            </div>
                          )}

                          {/* Step 3 content - Email 2 */}
                          {expandedStep === 3 && (
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-gray-500">Follow-up email:</span>
                                <button
                                  onClick={() => copyToClipboard(`${seq.contactName.split(' ')[0]}?`)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                                &quot;{seq.contactName.split(' ')[0]}?&quot;
                              </div>
                            </div>
                          )}

                          {/* Step 4 content - Phone call notes */}
                          {expandedStep === 4 && (
                            <div>
                              <span className="text-xs text-gray-500">Phone call completed</span>
                              {seq.step4Notes ? (
                                <div className="mt-2 bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Call Notes:</p>
                                  {seq.step4Notes}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 mt-2">No notes recorded for this call.</p>
                              )}
                            </div>
                          )}

                          {/* Step 5 content - Email 3 */}
                          {expandedStep === 5 && (
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-gray-500">Final email:</span>
                                <button
                                  onClick={() => copyToClipboard(`${seq.contactName.split(' ')[0]}?`)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                                &quot;{seq.contactName.split(' ')[0]}?&quot;
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Working on CURRENT step */}
                      {(expandedStep === null || !isStepDone(seq, expandedStep)) && (
                        <>
                          {/* Step 1: Email 1 - AI Generated */}
                          {currentStep === 1 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Step 1: Send AI-Generated Personalized Email
                              </h4>
                              {!seq.step1Content && !seq.email1Content ? (
                                <button
                                  onClick={() => generateEmail(seq.id)}
                                  disabled={generatingEmail === seq.id}
                                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
                                >
                                  {generatingEmail === seq.id ? 'Generating...' : 'Generate Email with AI'}
                                </button>
                              ) : (
                                <div>
                                  <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs text-gray-500">Generated email based on call transcript:</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => copyToClipboard(seq.step1Content || seq.email1Content || '')}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                      >
                                        Copy
                                      </button>
                                      <button
                                        onClick={() => markStepDone(seq.id, 1)}
                                        disabled={updatingSequence === seq.id}
                                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                                      >
                                        Mark Sent
                                      </button>
                                    </div>
                                  </div>
                                  <div className="bg-white border border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700">
                                    {seq.step1Content || seq.email1Content}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Step 2: WhatsApp/Text */}
                          {currentStep === 2 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Step 2: Send WhatsApp or Text Message
                              </h4>
                              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                                <p className="text-sm text-gray-700 font-medium mb-2">Suggested message:</p>
                                <p className="text-sm text-gray-600 italic">
                                  &quot;Hi {seq.contactName.split(' ')[0]}, just wanted to follow up on our conversation. Let me know if you have any questions!&quot;
                                </p>
                              </div>
                              {seq.contactPhone && (
                                <p className="text-sm text-gray-500 mb-3">
                                  Phone: <span className="font-medium">{seq.contactPhone}</span>
                                </p>
                              )}
                              <button
                                onClick={() => markStepDone(seq.id, 2)}
                                disabled={updatingSequence === seq.id}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                Mark WhatsApp/Text Sent
                              </button>
                            </div>
                          )}

                          {/* Step 3: Email 2 */}
                          {currentStep === 3 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Step 3: Send Follow-up Email
                              </h4>
                              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                                <p className="text-sm text-gray-700 font-medium mb-2">Suggested subject: Re: Following up</p>
                                <p className="text-sm text-gray-600">
                                  &quot;{seq.contactName.split(' ')[0]}?&quot;
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  Short and simple - just the first name with a question mark.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => copyToClipboard(`${seq.contactName.split(' ')[0]}?`)}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                >
                                  Copy
                                </button>
                                <button
                                  onClick={() => markStepDone(seq.id, 3)}
                                  disabled={updatingSequence === seq.id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                  Mark Email Sent
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Step 4: Phone Call */}
                          {currentStep === 4 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Step 4: Make a Phone Call
                              </h4>
                              {seq.contactPhone ? (
                                <p className="text-sm text-gray-700 mb-3">
                                  Call: <span className="font-medium text-lg">{seq.contactPhone}</span>
                                </p>
                              ) : (
                                <p className="text-sm text-amber-600 mb-3">
                                  No phone number on file. Add contact info above.
                                </p>
                              )}
                              <div className="mb-3">
                                <label className="block text-sm text-gray-600 mb-1">Call notes (optional):</label>
                                <textarea
                                  value={callNotes}
                                  onChange={(e) => setCallNotes(e.target.value)}
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                  rows={3}
                                  placeholder="What was discussed? Any follow-up needed?"
                                />
                              </div>
                              <button
                                onClick={() => markStepDone(seq.id, 4, callNotes)}
                                disabled={updatingSequence === seq.id}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                Mark Call Complete
                              </button>
                            </div>
                          )}

                          {/* Step 5: Email 3 */}
                          {currentStep === 5 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Step 5: Send Final Email
                              </h4>
                              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                                <p className="text-sm text-gray-700 font-medium mb-2">Suggested subject: Quick check-in</p>
                                <p className="text-sm text-gray-600">
                                  &quot;{seq.contactName.split(' ')[0]}?&quot;
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                  Same format as Email 2. After this, the cycle completes and a 3-month cooldown begins.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => copyToClipboard(`${seq.contactName.split(' ')[0]}?`)}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                >
                                  Copy
                                </button>
                                <button
                                  onClick={() => markStepDone(seq.id, 5)}
                                  disabled={updatingSequence === seq.id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                  Mark Sent & Complete Cycle
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Show call notes if step 4 was completed */}
                          {seq.step4Notes && currentStep > 4 && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs font-medium text-amber-800 mb-1">Call Notes:</p>
                              <p className="text-sm text-amber-900">{seq.step4Notes}</p>
                            </div>
                          )}
                        </>
                      )}
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
            Warm Follow-ups CRM - 5-step multi-channel nurturing with 3-month cooldown cycles
          </p>
        </div>
      </footer>
    </div>
  );
}

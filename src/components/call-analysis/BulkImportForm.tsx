'use client';

import { useState } from 'react';

interface SalesRep {
  id: string;
  name: string;
}

interface BulkImportFormProps {
  reps: SalesRep[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface TranscriptEntry {
  id: number;
  transcript: string;
  callLabel: string;
  analyzing: boolean;
  analyzed: boolean;
  counts?: {
    situationQuestions: number;
    problemQuestions: number;
    implicationQuestions: number;
    needPayoffQuestions: number;
    challengesPresented: number;
    dataPointsShared: number;
    insightsShared: number;
  };
  scores?: {
    spin: number;
    challenger: number;
    insight: number;
    overall: number;
  };
  feedback?: string;
}

export function BulkImportForm({ reps, onSuccess, onCancel }: BulkImportFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesRepId, setSalesRepId] = useState(reps.length === 1 ? reps[0].id : '');
  const [callDate, setCallDate] = useState(new Date().toISOString().split('T')[0]);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([
    { id: 1, transcript: '', callLabel: 'Call 1', analyzing: false, analyzed: false },
  ]);

  const addTranscript = () => {
    const newId = Math.max(...transcripts.map((t) => t.id)) + 1;
    setTranscripts([
      ...transcripts,
      {
        id: newId,
        transcript: '',
        callLabel: `Call ${newId}`,
        analyzing: false,
        analyzed: false,
      },
    ]);
  };

  const removeTranscript = (id: number) => {
    if (transcripts.length > 1) {
      setTranscripts(transcripts.filter((t) => t.id !== id));
    }
  };

  const updateTranscript = (id: number, field: string, value: string) => {
    setTranscripts(
      transcripts.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const analyzeTranscript = async (id: number) => {
    const entry = transcripts.find((t) => t.id === id);
    if (!entry || !entry.transcript.trim()) return;

    setTranscripts(
      transcripts.map((t) => (t.id === id ? { ...t, analyzing: true } : t))
    );

    try {
      const response = await fetch('/api/call-analysis/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: entry.transcript }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze transcript');
      }

      const analysis = await response.json();

      setTranscripts(
        transcripts.map((t) =>
          t.id === id
            ? {
                ...t,
                analyzing: false,
                analyzed: true,
                counts: analysis.counts,
                scores: analysis.scores,
                feedback: analysis.feedback,
              }
            : t
        )
      );
    } catch (err) {
      console.error('Error analyzing transcript:', err);
      setTranscripts(
        transcripts.map((t) => (t.id === id ? { ...t, analyzing: false } : t))
      );
    }
  };

  const analyzeAll = async () => {
    const toAnalyze = transcripts.filter((t) => t.transcript.trim() && !t.analyzed);

    for (const entry of toAnalyze) {
      await analyzeTranscript(entry.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!salesRepId) {
      setError('Please select a sales rep');
      return;
    }

    const validEntries = transcripts.filter((t) => t.transcript.trim() || t.analyzed);

    if (validEntries.length === 0) {
      setError('Please add at least one call with transcript or analysis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = validEntries.map((entry) => ({
        salesRepId,
        callDate,
        callLabel: entry.callLabel,
        transcript: entry.transcript || null,
        situationQuestions: entry.counts?.situationQuestions || 0,
        problemQuestions: entry.counts?.problemQuestions || 0,
        implicationQuestions: entry.counts?.implicationQuestions || 0,
        needPayoffQuestions: entry.counts?.needPayoffQuestions || 0,
        challengesPresented: entry.counts?.challengesPresented || 0,
        dataPointsShared: entry.counts?.dataPointsShared || 0,
        insightsShared: entry.counts?.insightsShared || 0,
        aiScoreSpin: entry.scores?.spin || null,
        aiScoreChallenger: entry.scores?.challenger || null,
        aiScoreInsight: entry.scores?.insight || null,
        aiScoreOverall: entry.scores?.overall || null,
        aiFeedback: entry.feedback || null,
      }));

      const response = await fetch('/api/call-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save call analyses');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const hasTranscriptsToAnalyze = transcripts.some(
    (t) => t.transcript.trim() && !t.analyzed
  );

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Bulk Import Call Analyses
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Rep
                </label>
                <select
                  value={salesRepId}
                  onChange={(e) => setSalesRepId(e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a rep...</option>
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Date (for all calls)
                </label>
                <input
                  type="date"
                  value={callDate}
                  onChange={(e) => setCallDate(e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Transcripts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Call Transcripts</h3>
                <div className="flex gap-2">
                  {hasTranscriptsToAnalyze && (
                    <button
                      type="button"
                      onClick={analyzeAll}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                    >
                      Analyze All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={addTranscript}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    + Add Call
                  </button>
                </div>
              </div>

              {transcripts.map((entry, index) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={entry.callLabel}
                      onChange={(e) =>
                        updateTranscript(entry.id, 'callLabel', e.target.value)
                      }
                      className="text-sm font-medium text-gray-900 border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 px-0"
                      placeholder="Call label..."
                    />
                    <div className="flex items-center gap-2">
                      {entry.analyzed && (
                        <span className="text-xs text-green-600 font-medium">
                          Analyzed
                        </span>
                      )}
                      {transcripts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTranscript(entry.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={entry.transcript}
                    onChange={(e) =>
                      updateTranscript(entry.id, 'transcript', e.target.value)
                    }
                    rows={4}
                    placeholder={`Paste transcript for call ${index + 1}...`}
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />

                  {entry.transcript.trim() && !entry.analyzed && (
                    <button
                      type="button"
                      onClick={() => analyzeTranscript(entry.id)}
                      disabled={entry.analyzing}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {entry.analyzing ? 'Analyzing...' : 'Analyze'}
                    </button>
                  )}

                  {entry.analyzed && entry.scores && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <div className="bg-blue-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">SPIN</div>
                        <div className="text-lg font-bold text-blue-700">
                          {entry.scores.spin.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">Challenger</div>
                        <div className="text-lg font-bold text-purple-700">
                          {entry.scores.challenger.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-green-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">Insight</div>
                        <div className="text-lg font-bold text-green-700">
                          {entry.scores.insight.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-orange-50 rounded p-2 text-center">
                        <div className="text-xs text-gray-500">Overall</div>
                        <div className="text-lg font-bold text-orange-700">
                          {entry.scores.overall.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : `Save ${transcripts.length} Call(s)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

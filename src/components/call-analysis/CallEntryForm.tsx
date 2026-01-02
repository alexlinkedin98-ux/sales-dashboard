'use client';

import { useState } from 'react';

interface SalesRep {
  id: string;
  name: string;
}

interface CallEntryFormProps {
  reps: SalesRep[];
  onSuccess: () => void;
  onCancel: () => void;
  editData?: {
    id: string;
    salesRepId: string;
    callDate: string;
    callLabel: string;
    transcript?: string | null;
    situationQuestions: number;
    problemQuestions: number;
    implicationQuestions: number;
    needPayoffQuestions: number;
    challengesPresented: number;
    dataPointsShared: number;
    insightsShared: number;
    repScoreSpin?: number | null;
    repScoreChallenger?: number | null;
    repScoreInsight?: number | null;
    repScoreOverall?: number | null;
    repNotes?: string | null;
    callDuration?: number | null;
    outcome?: string | null;
    aiScoreSpin?: number | null;
    aiScoreChallenger?: number | null;
    aiScoreInsight?: number | null;
    aiScoreOverall?: number | null;
    aiFeedback?: string | null;
  };
}

const OUTCOMES = [
  { value: '', label: 'Select outcome...' },
  { value: 'booked', label: 'Booked Next Step' },
  { value: 'follow_up', label: 'Follow-up Needed' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'no_show', label: 'No Show' },
];

export function CallEntryForm({ reps, onSuccess, onCancel, editData }: CallEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiScores, setShowAiScores] = useState(!!editData?.aiScoreOverall);

  const [formData, setFormData] = useState({
    salesRepId: editData?.salesRepId || (reps.length === 1 ? reps[0].id : ''),
    callDate: editData?.callDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    callLabel: editData?.callLabel || `Call ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    transcript: editData?.transcript || '',
    situationQuestions: editData?.situationQuestions || 0,
    problemQuestions: editData?.problemQuestions || 0,
    implicationQuestions: editData?.implicationQuestions || 0,
    needPayoffQuestions: editData?.needPayoffQuestions || 0,
    challengesPresented: editData?.challengesPresented || 0,
    dataPointsShared: editData?.dataPointsShared || 0,
    insightsShared: editData?.insightsShared || 0,
    repScoreSpin: editData?.repScoreSpin || 5,
    repScoreChallenger: editData?.repScoreChallenger || 5,
    repScoreInsight: editData?.repScoreInsight || 5,
    repScoreOverall: editData?.repScoreOverall || 5,
    repNotes: editData?.repNotes || '',
    callDuration: editData?.callDuration || 0,
    outcome: editData?.outcome || '',
  });

  const [aiAnalysis, setAiAnalysis] = useState<{
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
  } | null>(
    editData?.aiScoreOverall
      ? {
          scores: {
            spin: editData.aiScoreSpin || 0,
            challenger: editData.aiScoreChallenger || 0,
            insight: editData.aiScoreInsight || 0,
            overall: editData.aiScoreOverall || 0,
          },
          feedback: editData.aiFeedback || '',
        }
      : null
  );

  const handleAnalyzeTranscript = async () => {
    if (!formData.transcript.trim()) {
      setError('Please enter a transcript to analyze');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/call-analysis/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: formData.transcript }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze transcript');
      }

      const analysis = await response.json();
      setAiAnalysis(analysis);

      // Auto-fill counts from AI analysis
      if (analysis.counts) {
        setFormData((prev) => ({
          ...prev,
          situationQuestions: analysis.counts.situationQuestions,
          problemQuestions: analysis.counts.problemQuestions,
          implicationQuestions: analysis.counts.implicationQuestions,
          needPayoffQuestions: analysis.counts.needPayoffQuestions,
          challengesPresented: analysis.counts.challengesPresented,
          dataPointsShared: analysis.counts.dataPointsShared,
          insightsShared: analysis.counts.insightsShared,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRevealAiScores = () => {
    setShowAiScores(true);
  };

  const hasRepScores =
    formData.repScoreSpin > 0 &&
    formData.repScoreChallenger > 0 &&
    formData.repScoreInsight > 0 &&
    formData.repScoreOverall > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editData ? `/api/call-analysis/${editData.id}` : '/api/call-analysis';
      const method = editData ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        aiScoreSpin: aiAnalysis?.scores?.spin || null,
        aiScoreChallenger: aiAnalysis?.scores?.challenger || null,
        aiScoreInsight: aiAnalysis?.scores?.insight || null,
        aiScoreOverall: aiAnalysis?.scores?.overall || null,
        aiFeedback: aiAnalysis?.feedback || null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save call analysis');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editData ? 'Edit Call Analysis' : 'Add Call Analysis'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Rep
                </label>
                <select
                  name="salesRepId"
                  value={formData.salesRepId}
                  onChange={handleChange}
                  required
                  disabled={!!editData}
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
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
                  Call Date
                </label>
                <input
                  type="date"
                  name="callDate"
                  value={formData.callDate}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Label
                </label>
                <input
                  type="text"
                  name="callLabel"
                  value={formData.callLabel}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Call 1 - Morning"
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Duration (minutes)
                </label>
                <input
                  type="number"
                  name="callDuration"
                  value={formData.callDuration}
                  onChange={handleChange}
                  min="0"
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Outcome
                </label>
                <select
                  name="outcome"
                  value={formData.outcome}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transcript */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Call Transcript (optional)
              </label>
              <textarea
                name="transcript"
                value={formData.transcript}
                onChange={handleChange}
                rows={6}
                placeholder="Paste the call transcript here for AI analysis..."
                className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {formData.transcript.trim() && (
                <button
                  type="button"
                  onClick={handleAnalyzeTranscript}
                  disabled={analyzing}
                  className="mt-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                </button>
              )}
            </div>

            {/* SPIN Counts */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">SPIN Questions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Situation (S)
                  </label>
                  <input
                    type="number"
                    name="situationQuestions"
                    value={formData.situationQuestions}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Problem (P)
                  </label>
                  <input
                    type="number"
                    name="problemQuestions"
                    value={formData.problemQuestions}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Implication (I)
                  </label>
                  <input
                    type="number"
                    name="implicationQuestions"
                    value={formData.implicationQuestions}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Need-Payoff (N)
                  </label>
                  <input
                    type="number"
                    name="needPayoffQuestions"
                    value={formData.needPayoffQuestions}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Challenger & Insight Counts */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Challenger Sale & Insight Selling
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Challenges Presented
                  </label>
                  <input
                    type="number"
                    name="challengesPresented"
                    value={formData.challengesPresented}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Data Points Shared
                  </label>
                  <input
                    type="number"
                    name="dataPointsShared"
                    value={formData.dataPointsShared}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Insights Shared
                  </label>
                  <input
                    type="number"
                    name="insightsShared"
                    value={formData.insightsShared}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Rep Self-Assessment */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Self-Assessment Scores (1-10)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    SPIN Score
                  </label>
                  <input
                    type="range"
                    name="repScoreSpin"
                    value={formData.repScoreSpin}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="w-full"
                  />
                  <div className="text-center text-sm font-medium text-gray-900">
                    {formData.repScoreSpin}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Challenger Score
                  </label>
                  <input
                    type="range"
                    name="repScoreChallenger"
                    value={formData.repScoreChallenger}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="w-full"
                  />
                  <div className="text-center text-sm font-medium text-gray-900">
                    {formData.repScoreChallenger}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Insight Score
                  </label>
                  <input
                    type="range"
                    name="repScoreInsight"
                    value={formData.repScoreInsight}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="w-full"
                  />
                  <div className="text-center text-sm font-medium text-gray-900">
                    {formData.repScoreInsight}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Overall Score
                  </label>
                  <input
                    type="range"
                    name="repScoreOverall"
                    value={formData.repScoreOverall}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="w-full"
                  />
                  <div className="text-center text-sm font-medium text-gray-900">
                    {formData.repScoreOverall}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <textarea
                  name="repNotes"
                  value={formData.repNotes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any notes about this call..."
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* AI Scores Section */}
            {aiAnalysis?.scores && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">AI Analysis</h3>

                {!showAiScores && hasRepScores ? (
                  <button
                    type="button"
                    onClick={handleRevealAiScores}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Reveal AI Scores
                  </button>
                ) : !hasRepScores ? (
                  <p className="text-sm text-gray-500 italic">
                    Complete your self-assessment to reveal AI scores
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500">SPIN</div>
                        <div className="text-2xl font-bold text-blue-700">
                          {aiAnalysis.scores.spin.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">
                          You: {formData.repScoreSpin}
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500">Challenger</div>
                        <div className="text-2xl font-bold text-purple-700">
                          {aiAnalysis.scores.challenger.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">
                          You: {formData.repScoreChallenger}
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500">Insight</div>
                        <div className="text-2xl font-bold text-green-700">
                          {aiAnalysis.scores.insight.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">
                          You: {formData.repScoreInsight}
                        </div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-500">Overall</div>
                        <div className="text-2xl font-bold text-orange-700">
                          {aiAnalysis.scores.overall.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">
                          You: {formData.repScoreOverall}
                        </div>
                      </div>
                    </div>

                    {aiAnalysis.feedback && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          AI Feedback
                        </h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {aiAnalysis.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                {loading ? 'Saving...' : editData ? 'Update Analysis' : 'Save Analysis'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

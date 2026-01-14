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
    crmLink?: string | null;
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

type Step = 'transcript' | 'self-assess' | 'compare' | 'quick-edit';

export function CallEntryForm({ reps, onSuccess, onCancel, editData }: CallEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine initial step based on editData
  // If editing an existing call with AI scores, show quick edit mode
  const getInitialStep = (): Step => {
    if (editData?.aiScoreOverall) return 'quick-edit';
    if (editData?.situationQuestions) return 'self-assess';
    return 'transcript';
  };

  const [step, setStep] = useState<Step>(getInitialStep());

  const [formData, setFormData] = useState({
    salesRepId: editData?.salesRepId || (reps.length === 1 ? reps[0].id : ''),
    callDate: editData?.callDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    callLabel: editData?.callLabel || '',
    crmLink: editData?.crmLink || '',
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
          counts: {
            situationQuestions: editData.situationQuestions,
            problemQuestions: editData.problemQuestions,
            implicationQuestions: editData.implicationQuestions,
            needPayoffQuestions: editData.needPayoffQuestions,
            challengesPresented: editData.challengesPresented,
            dataPointsShared: editData.dataPointsShared,
            insightsShared: editData.insightsShared,
          },
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
    if (!formData.salesRepId) {
      setError('Please select a sales rep');
      return;
    }

    if (!formData.callLabel.trim()) {
      setError('Please enter a call name');
      return;
    }

    if (!formData.transcript.trim()) {
      setError('Please paste a call transcript to analyze');
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

      // Move to self-assessment step
      setStep('self-assess');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitSelfAssessment = () => {
    setStep('compare');
  };

  const handleSave = async () => {
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
      [name]: type === 'number' || type === 'range' ? parseFloat(value) || 0 : value,
    }));
  };

  const totalSPIN = formData.situationQuestions + formData.problemQuestions +
                    formData.implicationQuestions + formData.needPayoffQuestions;

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6">
          {/* Header with Steps */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {step === 'quick-edit' ? 'Edit Call Details' : editData ? 'Edit Call Analysis' : 'Analyze Sales Call'}
            </h2>

            {/* Step Indicator - hidden in quick-edit mode */}
            {step !== 'quick-edit' && (
              <div className="flex items-center justify-between">
                {[
                  { key: 'transcript', label: '1. Transcript' },
                  { key: 'self-assess', label: '2. Self-Assess' },
                  { key: 'compare', label: '3. Compare' },
                ].map((s, i) => (
                  <div key={s.key} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        step === s.key
                          ? 'bg-blue-600 text-white'
                          : (step === 'self-assess' && s.key === 'transcript') ||
                            (step === 'compare' && s.key !== 'compare')
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {(step === 'self-assess' && s.key === 'transcript') ||
                      (step === 'compare' && s.key !== 'compare') ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`ml-2 text-sm ${
                        step === s.key ? 'text-blue-600 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {s.label}
                    </span>
                    {i < 2 && (
                      <div className="w-12 h-0.5 mx-2 bg-gray-200" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Step 1: Transcript */}
          {step === 'transcript' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Rep
                  </label>
                  <select
                    name="salesRepId"
                    value={formData.salesRepId}
                    onChange={handleChange}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Name
                </label>
                <input
                  type="text"
                  name="callLabel"
                  value={formData.callLabel}
                  onChange={handleChange}
                  placeholder="e.g., Discovery call with Acme Corp"
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pipedrive Link <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  name="crmLink"
                  value={formData.crmLink}
                  onChange={handleChange}
                  placeholder="https://app.pipedrive.com/deal/..."
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paste Call Transcript
                </label>
                <textarea
                  name="transcript"
                  value={formData.transcript}
                  onChange={handleChange}
                  rows={12}
                  placeholder="Paste the full call transcript here..."
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAnalyzeTranscript}
                  disabled={analyzing || !formData.transcript.trim()}
                  className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
                >
                  {analyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    'Analyze with AI'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Self-Assessment */}
          {step === 'self-assess' && (
            <div className="space-y-6">
              {/* Info box - AI has analyzed, now self-assess */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">AI analysis complete!</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Now rate yourself on each methodology. Be honest - you'll see how the AI scored you after you submit.
                    </p>
                  </div>
                </div>
              </div>

              {/* Self-Assessment */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  How do you think you did? (1-10)
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">SPIN Selling</span>
                      <span className="font-medium text-gray-900">{formData.repScoreSpin}</span>
                    </div>
                    <input
                      type="range"
                      name="repScoreSpin"
                      value={formData.repScoreSpin}
                      onChange={handleChange}
                      min="1"
                      max="10"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Challenger Sale</span>
                      <span className="font-medium text-gray-900">{formData.repScoreChallenger}</span>
                    </div>
                    <input
                      type="range"
                      name="repScoreChallenger"
                      value={formData.repScoreChallenger}
                      onChange={handleChange}
                      min="1"
                      max="10"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Insight Selling</span>
                      <span className="font-medium text-gray-900">{formData.repScoreInsight}</span>
                    </div>
                    <input
                      type="range"
                      name="repScoreInsight"
                      value={formData.repScoreInsight}
                      onChange={handleChange}
                      min="1"
                      max="10"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Overall Performance</span>
                      <span className="font-medium text-gray-900">{formData.repScoreOverall}</span>
                    </div>
                    <input
                      type="range"
                      name="repScoreOverall"
                      value={formData.repScoreOverall}
                      onChange={handleChange}
                      min="1"
                      max="10"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('transcript')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitSelfAssessment}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  See AI Scores
                </button>
              </div>
            </div>
          )}

          {/* Quick Edit Mode - for editing existing calls */}
          {step === 'quick-edit' && editData && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">Quick Edit</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Update the call details below. To re-analyze the transcript, click "Full Edit".
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Rep
                  </label>
                  <select
                    name="salesRepId"
                    value={formData.salesRepId}
                    onChange={handleChange}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Name
                </label>
                <input
                  type="text"
                  name="callLabel"
                  value={formData.callLabel}
                  onChange={handleChange}
                  placeholder="e.g., Discovery call with Acme Corp"
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pipedrive Link <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  name="crmLink"
                  value={formData.crmLink}
                  onChange={handleChange}
                  placeholder="https://app.pipedrive.com/deal/..."
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
                  <option value="">Select outcome...</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  name="repNotes"
                  value={formData.repNotes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any thoughts or takeaways from this call..."
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('transcript')}
                    className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200"
                  >
                    Full Edit
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Compare */}
          {step === 'compare' && aiAnalysis?.scores && (
            <div className="space-y-6">
              {/* AI Found Metrics - Now revealed */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">AI Found in Your Call:</h3>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{formData.situationQuestions}</div>
                    <div className="text-xs text-gray-500">Situation</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{formData.problemQuestions}</div>
                    <div className="text-xs text-gray-500">Problem</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{formData.implicationQuestions}</div>
                    <div className="text-xs text-gray-500">Implication</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{formData.needPayoffQuestions}</div>
                    <div className="text-xs text-gray-500">Need-Payoff</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{formData.challengesPresented}</div>
                    <div className="text-xs text-gray-500">Challenges</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-pink-600">{formData.dataPointsShared}</div>
                    <div className="text-xs text-gray-500">Data Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-cyan-600">{formData.insightsShared}</div>
                    <div className="text-xs text-gray-500">Insights</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                  <span className="text-sm text-gray-600">Total SPIN Questions: </span>
                  <span className="font-bold text-gray-900">{totalSPIN}</span>
                </div>
              </div>

              {/* Score Comparison */}
              <div className="space-y-4">
                {[
                  { label: 'SPIN Selling', rep: formData.repScoreSpin, ai: aiAnalysis.scores.spin, color: 'blue' },
                  { label: 'Challenger Sale', rep: formData.repScoreChallenger, ai: aiAnalysis.scores.challenger, color: 'purple' },
                  { label: 'Insight Selling', rep: formData.repScoreInsight, ai: aiAnalysis.scores.insight, color: 'green' },
                  { label: 'Overall', rep: formData.repScoreOverall, ai: aiAnalysis.scores.overall, color: 'orange' },
                ].map((item) => {
                  const diff = item.rep - item.ai;
                  return (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{item.label}</span>
                        <span
                          className={`text-sm font-medium px-2 py-0.5 rounded ${
                            Math.abs(diff) < 1
                              ? 'bg-gray-200 text-gray-700'
                              : diff > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {Math.abs(diff) < 1
                            ? 'Aligned'
                            : diff > 0
                            ? `You rated ${diff.toFixed(1)} higher`
                            : `AI rated ${Math.abs(diff).toFixed(1)} higher`}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Your Score</span>
                            <span className="font-medium text-gray-900">{item.rep}</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-${item.color}-500 rounded-full`}
                              style={{ width: `${item.rep * 10}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>AI Score</span>
                            <span className="font-medium text-gray-900">{item.ai.toFixed(1)}</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-${item.color}-600 rounded-full`}
                              style={{ width: `${item.ai * 10}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Feedback */}
              {aiAnalysis.feedback && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">AI Feedback</h3>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{aiAnalysis.feedback}</p>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Notes (optional)
                </label>
                <textarea
                  name="repNotes"
                  value={formData.repNotes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any thoughts or takeaways from this call..."
                  className="w-full rounded-md border-gray-300 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('self-assess')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Analysis'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

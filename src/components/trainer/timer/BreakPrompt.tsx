'use client';

import { Grade } from '@/lib/trainer/gradeCalculator';

interface SessionSummary {
  questionsAnswered: number;
  correctAnswers: number;
  xpEarned: number;
  grade: Grade | null;
  streak: number;
  leveledUp: boolean;
  newLevel?: number;
}

interface BreakPromptProps {
  summary: SessionSummary;
  onContinue: () => void;
  onEndSession: () => void;
}

export function BreakPrompt({ summary, onContinue, onEndSession }: BreakPromptProps) {
  const accuracy = summary.questionsAnswered > 0
    ? Math.round((summary.correctAnswers / summary.questionsAnswered) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Level Up Animation */}
        {summary.leveledUp && (
          <div className="text-center mb-6 animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <div className="text-2xl font-bold text-indigo-600">Level Up!</div>
            <div className="text-gray-600">You reached Level {summary.newLevel}</div>
          </div>
        )}

        {/* Session Complete Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⏰</div>
          <h2 className="text-2xl font-bold text-gray-900">Session Complete!</h2>
          <p className="text-gray-600 mt-1">Time for a quick break</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-indigo-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-indigo-600">{summary.questionsAnswered}</div>
            <div className="text-sm text-gray-600">Questions</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{accuracy}%</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">+{summary.xpEarned}</div>
            <div className="text-sm text-gray-600">XP Earned</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{summary.streak}</div>
            <div className="text-sm text-gray-600">Day Streak 🔥</div>
          </div>
        </div>

        {/* Grade Display */}
        {summary.grade && (
          <div className="text-center mb-6">
            <div className="text-sm text-gray-600 mb-1">Session Grade</div>
            <div className={`inline-block text-4xl font-bold px-6 py-2 rounded-xl ${
              summary.grade === 'S' ? 'bg-yellow-100 text-yellow-600' :
              summary.grade === 'A' ? 'bg-green-100 text-green-600' :
              summary.grade === 'B' ? 'bg-blue-100 text-blue-600' :
              summary.grade === 'C' ? 'bg-orange-100 text-orange-600' :
              'bg-red-100 text-red-600'
            }`}>
              {summary.grade}
            </div>
          </div>
        )}

        {/* Break Recommendation */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧘</span>
            <div>
              <div className="font-medium text-gray-900">Take a 5-minute break</div>
              <div className="text-sm text-gray-600 mt-1">
                Stand up, stretch, grab some water. Your brain needs rest to consolidate learning.
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onEndSession}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            End Session
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Continue Training
          </button>
        </div>
      </div>
    </div>
  );
}

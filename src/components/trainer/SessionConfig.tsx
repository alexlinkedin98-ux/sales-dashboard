'use client';

import { useState } from 'react';

export type TrainingMode = 'learn' | 'practice' | 'live_sim';
export type Vertical = 'ecommerce' | 'leadgen' | 'local_services';

export interface SessionConfigData {
  mode: TrainingMode;
  level: number;
  vertical: Vertical;
  timerDuration: number; // seconds
}

interface SessionConfigProps {
  traineeId: string;
  pomodoroMinutes: number;
  highestLevel: number;
  onStart: (config: SessionConfigData) => void;
  onCancel: () => void;
}

const MODES: { value: TrainingMode; label: string; description: string; icon: string }[] = [
  {
    value: 'learn',
    label: 'Learn',
    description: 'No timer, immediate feedback. Focus on accuracy.',
    icon: '📚',
  },
  {
    value: 'practice',
    label: 'Practice',
    description: '30 seconds per question. Building muscle memory.',
    icon: '🎯',
  },
  {
    value: 'live_sim',
    label: 'Live Sim',
    description: '10-15 seconds per question. Real call pressure.',
    icon: '🔥',
  },
];

const VERTICALS: { value: Vertical; label: string; examples: string }[] = [
  {
    value: 'ecommerce',
    label: 'E-commerce',
    examples: 'DTC brands, Shopify stores, dropshipping',
  },
  {
    value: 'leadgen',
    label: 'Lead Generation',
    examples: 'Agencies, SaaS, B2B services',
  },
  {
    value: 'local_services',
    label: 'Local Services',
    examples: 'HVAC, dental, legal, real estate',
  },
];

const LEVELS = [
  { level: 1, name: 'Question Type ID', description: 'Identify if a question is S, P, I, or N-P' },
  { level: 2, name: 'Single Question Craft', description: 'Write one appropriate question' },
  { level: 3, name: 'Two-Question Chains', description: 'Master I → N-P sequences' },
  { level: 4, name: 'Full Scenario', description: '3-5 minute discovery simulation' },
  { level: 5, name: 'Curveball Mode', description: 'Handle deflections and objections' },
];

export function SessionConfig({
  pomodoroMinutes,
  highestLevel,
  onStart,
  onCancel,
}: SessionConfigProps) {
  const [mode, setMode] = useState<TrainingMode>('learn');
  const [level, setLevel] = useState(1);
  const [vertical, setVertical] = useState<Vertical>('ecommerce');
  const [customTimer, setCustomTimer] = useState(pomodoroMinutes);

  const handleStart = () => {
    onStart({
      mode,
      level,
      vertical,
      timerDuration: customTimer * 60,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Configure Training Session</h2>
          <p className="text-gray-600">Choose your training mode, level, and industry focus.</p>
        </div>

        {/* Training Mode Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Training Mode</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode === m.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{m.icon}</div>
                <div className="font-semibold text-gray-900">{m.label}</div>
                <div className="text-sm text-gray-600 mt-1">{m.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Level Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Level</h3>
          <div className="space-y-2">
            {LEVELS.map((l) => {
              const isLocked = l.level > highestLevel + 1;
              return (
                <button
                  key={l.level}
                  onClick={() => !isLocked && setLevel(l.level)}
                  disabled={isLocked}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                    level === l.level
                      ? 'border-indigo-500 bg-indigo-50'
                      : isLocked
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      level === l.level
                        ? 'bg-indigo-500 text-white'
                        : isLocked
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isLocked ? '🔒' : l.level}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{l.name}</div>
                    <div className="text-sm text-gray-600">{l.description}</div>
                  </div>
                  {l.level <= highestLevel && (
                    <span className="text-green-500 text-sm">✓ Completed</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vertical Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Industry Focus</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VERTICALS.map((v) => (
              <button
                key={v.value}
                onClick={() => setVertical(v.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  vertical === v.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">{v.label}</div>
                <div className="text-sm text-gray-600 mt-1">{v.examples}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Session Timer */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Duration</h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={customTimer}
              onChange={(e) => setCustomTimer(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="w-24 text-center">
              <span className="text-2xl font-bold text-indigo-600">{customTimer}</span>
              <span className="text-gray-600 ml-1">min</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Pomodoro-style session with break prompt at the end.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Start Training
          </button>
        </div>
      </div>
    </div>
  );
}

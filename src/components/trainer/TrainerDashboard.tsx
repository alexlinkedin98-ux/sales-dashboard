'use client';

import { useState, useEffect } from 'react';
import { getLevelTitle, progressToNextLevel, xpToNextLevel } from '@/lib/trainer/xpCalculator';

interface TrainerStats {
  id: string;
  traineeId: string;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalQuestionsAnswered: number;
  totalTimeSpentSeconds: number;
  highestLevelLearn: number;
  highestLevelPractice: number;
  highestLevelLiveSim: number;
  pomodoroMinutes: number;
  trainee: {
    id: string;
    name: string;
  };
}

interface TrainerDashboardProps {
  traineeId: string | null;
  onStartTraining: () => void;
  onViewStats: () => void;
}

export function TrainerDashboard({ traineeId, onStartTraining, onViewStats }: TrainerDashboardProps) {
  const [stats, setStats] = useState<TrainerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (traineeId) {
      fetchStats();
    }
  }, [traineeId]);

  const fetchStats = async () => {
    if (!traineeId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/trainer/stats/${traineeId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!traineeId) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👆</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Trainee</h2>
        <p className="text-gray-600">Choose a trainee from the dropdown above to get started.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const progress = stats ? progressToNextLevel(stats.totalXp) : 0;
  const xpNeeded = stats ? xpToNextLevel(stats.totalXp) : 100;
  const levelTitle = stats ? getLevelTitle(stats.currentLevel) : 'Beginner';
  const highestLevel = stats ? Math.max(stats.highestLevelLearn, stats.highestLevelPractice, stats.highestLevelLiveSim) : 1;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome back, {stats?.trainee.name || 'Trainee'}!
            </h2>
            <p className="text-indigo-100">Ready to master SPIN selling?</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{stats?.currentStreak || 0}</div>
            <div className="text-indigo-200">Day Streak 🔥</div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Level {stats?.currentLevel || 1} - {levelTitle}</span>
            <span className="text-indigo-200">{xpNeeded} XP to next level</span>
          </div>
          <div className="h-3 bg-indigo-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-sm text-indigo-200 mt-1">
            {stats?.totalXp || 0} XP total
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-indigo-600">{stats?.totalSessions || 0}</div>
          <div className="text-gray-600 text-sm mt-1">Sessions Completed</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-green-600">{stats?.totalQuestionsAnswered || 0}</div>
          <div className="text-gray-600 text-sm mt-1">Questions Answered</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-purple-600">{formatTime(stats?.totalTimeSpentSeconds || 0)}</div>
          <div className="text-gray-600 text-sm mt-1">Training Time</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-orange-600">{stats?.longestStreak || 0}</div>
          <div className="text-gray-600 text-sm mt-1">Best Streak</div>
        </div>
      </div>

      {/* Training Modes Progress */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📚</span>
              <span className="font-medium text-gray-900">Learn Mode</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    level <= (stats?.highestLevelLearn || 1)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎯</span>
              <span className="font-medium text-gray-900">Practice Mode</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    level <= (stats?.highestLevelPractice || 1)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔥</span>
              <span className="font-medium text-gray-900">Live Sim Mode</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    level <= (stats?.highestLevelLiveSim || 1)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SPIN Overview */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SPIN Question Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <div className="text-3xl font-bold text-blue-600">S</div>
            <div className="font-medium text-gray-900 mt-1">Situation</div>
            <div className="text-xs text-gray-500 mt-1">Gather facts</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-xl">
            <div className="text-3xl font-bold text-orange-600">P</div>
            <div className="font-medium text-gray-900 mt-1">Problem</div>
            <div className="text-xs text-gray-500 mt-1">Find pain points</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <div className="text-3xl font-bold text-red-600">I</div>
            <div className="font-medium text-gray-900 mt-1">Implication</div>
            <div className="text-xs text-gray-500 mt-1">Develop urgency</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="text-3xl font-bold text-green-600">N</div>
            <div className="font-medium text-gray-900 mt-1">Need-Payoff</div>
            <div className="text-xs text-gray-500 mt-1">Paint the future</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onStartTraining}
          className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
        >
          Start Training Session
        </button>
        <button
          onClick={onViewStats}
          className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
        >
          View Detailed Stats
        </button>
      </div>

      {/* Tip of the Day */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-semibold text-yellow-800">Tip of the Day</h4>
            <p className="text-yellow-700 mt-1">
              The best Implication questions use the prospect&apos;s own numbers.
              &quot;You mentioned losing 3 deals a month to competitors. At $10K each,
              that&apos;s $360K a year walking out the door. What&apos;s that doing to your growth plans?&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

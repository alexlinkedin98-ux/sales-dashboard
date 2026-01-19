'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { TraineeSelector } from '@/components/trainer/TraineeSelector';
import { TrainerDashboard } from '@/components/trainer/TrainerDashboard';
import { SessionConfig, SessionConfigData } from '@/components/trainer/SessionConfig';
import { TrainingSession } from '@/components/trainer/TrainingSession';

type View = 'dashboard' | 'config' | 'training' | 'stats';

interface TrainerStats {
  pomodoroMinutes: number;
  highestLevelLearn: number;
  highestLevelPractice: number;
  highestLevelLiveSim: number;
}

export default function TrainerPage() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedTrainee, setSelectedTrainee] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfigData | null>(null);
  const [traineeStats, setTraineeStats] = useState<TrainerStats | null>(null);

  useEffect(() => {
    if (selectedTrainee) {
      fetchTraineeStats();
    }
  }, [selectedTrainee]);

  const fetchTraineeStats = async () => {
    if (!selectedTrainee) return;

    try {
      const response = await fetch(`/api/trainer/stats/${selectedTrainee}`);
      if (response.ok) {
        const data = await response.json();
        setTraineeStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch trainee stats:', error);
    }
  };

  const handleStartTraining = (config: SessionConfigData) => {
    setSessionConfig(config);
    setView('training');
  };

  const handleSessionComplete = () => {
    setSessionConfig(null);
    setView('dashboard');
    // Refresh stats
    fetchTraineeStats();
  };

  const handleSessionPause = () => {
    setSessionConfig(null);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SPIN Question Trainer</h1>
              <p className="text-sm text-gray-500">
                Master SPIN selling with Duolingo-style training
              </p>
            </div>
            <div className="flex items-center gap-4">
              {view !== 'training' && (
                <TraineeSelector
                  selected={selectedTrainee}
                  onSelect={setSelectedTrainee}
                />
              )}
              <Navigation currentPage="call-analysis" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {view === 'dashboard' && (
          <TrainerDashboard
            traineeId={selectedTrainee}
            onStartTraining={() => setView('config')}
            onViewStats={() => setView('stats')}
          />
        )}

        {view === 'config' && selectedTrainee && (
          <SessionConfig
            traineeId={selectedTrainee}
            pomodoroMinutes={traineeStats?.pomodoroMinutes || 15}
            highestLevel={Math.max(
              traineeStats?.highestLevelLearn || 1,
              traineeStats?.highestLevelPractice || 1,
              traineeStats?.highestLevelLiveSim || 1
            )}
            onStart={handleStartTraining}
            onCancel={() => setView('dashboard')}
          />
        )}

        {view === 'training' && selectedTrainee && sessionConfig && (
          <TrainingSession
            traineeId={selectedTrainee}
            config={sessionConfig}
            onComplete={handleSessionComplete}
            onPause={handleSessionPause}
          />
        )}

        {view === 'stats' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Detailed Statistics</h2>
              <button
                onClick={() => setView('dashboard')}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                ← Back to Dashboard
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 text-center py-8">
                Detailed statistics view coming soon...
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

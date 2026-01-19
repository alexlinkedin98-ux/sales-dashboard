'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionConfigData } from './SessionConfig';
import { PomodoroTimer } from './timer/PomodoroTimer';
import { ResponseTimer } from './timer/ResponseTimer';
import { BreakPrompt } from './timer/BreakPrompt';
import { QuestionCard } from './questions/QuestionCard';
import { IdentifyQuestion } from './questions/IdentifyQuestion';
import { CraftQuestion } from './questions/CraftQuestion';
import { GradeDisplay } from './feedback/GradeDisplay';
import { FeedbackCard } from './feedback/FeedbackCard';
import { Grade } from '@/lib/trainer/gradeCalculator';

interface TrainingSessionProps {
  traineeId: string;
  config: SessionConfigData;
  onComplete: () => void;
  onPause: () => void;
}

interface Scenario {
  prospectPersona?: {
    name: string;
    role: string;
    company: string;
    revenue?: string;
    teamSize?: string;
  };
  scenarioContext: string;
  prospectStatement: string;
  sampleQuestion?: string;
  correctAnswer?: string;
  expectedType?: string;
  hints?: string[];
  explanation?: string;
}

interface GradingResult {
  identifiedType: string;
  typeCorrect: boolean;
  typeAccuracy: number;
  qualityScore: number;
  naturalnessScore: number;
  feedback: string;
  improvedVersion?: string;
  grade: Grade;
  overallScore: number;
  breakdown?: {
    typeComponent: number;
    qualityComponent: number;
    naturalnessComponent: number;
  };
}

type SessionPhase = 'loading' | 'question' | 'grading' | 'feedback' | 'break' | 'complete';

export function TrainingSession({ traineeId, config, onComplete, onPause }: TrainingSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [responseStartTime, setResponseStartTime] = useState<number>(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    questionsAnswered: 0,
    correctAnswers: 0,
    totalXp: 0,
  });
  const [breakData, setBreakData] = useState<{
    leveledUp: boolean;
    newLevel?: number;
    streak: number;
    grade: Grade | null;
  } | null>(null);

  // Start session on mount
  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    try {
      const response = await fetch('/api/trainer/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traineeId,
          mode: config.mode,
          level: config.level,
          timerDuration: config.timerDuration,
          vertical: config.vertical,
        }),
      });

      if (response.ok) {
        const session = await response.json();
        setSessionId(session.id);
        loadNextQuestion();
      } else {
        console.error('Failed to start session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const loadNextQuestion = useCallback(async () => {
    setPhase('loading');
    setGradingResult(null);

    try {
      // Determine question type based on level and spaced repetition
      const questionTypes = ['S', 'P', 'I', 'N'];
      const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

      // Determine prompt type based on level
      let promptType = 'identify';
      if (config.level === 1) {
        promptType = 'identify';
      } else if (config.level === 2 || config.level === 3) {
        promptType = 'craft_single';
      } else if (config.level === 4) {
        promptType = 'scenario';
      } else if (config.level === 5) {
        promptType = 'curveball';
      }

      const response = await fetch('/api/trainer/ai/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: config.vertical,
          level: config.level,
          promptType,
          questionType: randomType,
        }),
      });

      if (response.ok) {
        const scenario = await response.json();
        setCurrentScenario({
          ...scenario,
          expectedType: randomType,
        });
        setQuestionNumber((prev) => prev + 1);
        setResponseStartTime(Date.now());
        setResetTrigger((prev) => prev + 1);
        setPhase('question');
      }
    } catch (error) {
      console.error('Error loading question:', error);
    }
  }, [config.level, config.vertical]);

  const handleIdentifyAnswer = async (answer: string) => {
    if (!currentScenario || !sessionId) return;

    setPhase('grading');
    const responseTimeMs = Date.now() - responseStartTime;

    try {
      // Grade the response
      const gradeResponse = await fetch('/api/trainer/ai/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: 'identify',
          promptContext: currentScenario.scenarioContext,
          expectedType: currentScenario.correctAnswer,
          traineeResponse: answer,
        }),
      });

      if (gradeResponse.ok) {
        const result = await gradeResponse.json();
        setGradingResult(result);

        // Save response to database
        await fetch('/api/trainer/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionNumber,
            promptType: 'identify',
            promptContext: currentScenario.sampleQuestion,
            expectedType: currentScenario.correctAnswer,
            traineeResponse: answer,
            responseTimeMs,
            ...result,
          }),
        });

        setSessionStats((prev) => ({
          questionsAnswered: prev.questionsAnswered + 1,
          correctAnswers: prev.correctAnswers + (result.typeCorrect ? 1 : 0),
          totalXp: prev.totalXp + (result.xpAwarded || 0),
        }));

        setPhase('feedback');
      }
    } catch (error) {
      console.error('Error grading response:', error);
    }
  };

  const handleCraftSubmit = async (response: string) => {
    if (!currentScenario || !sessionId) return;

    setPhase('grading');
    const responseTimeMs = Date.now() - responseStartTime;

    try {
      // Grade the response with AI
      const gradeResponse = await fetch('/api/trainer/ai/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: 'craft_single',
          promptContext: `${currentScenario.scenarioContext}\n\nProspect says: "${currentScenario.prospectStatement}"`,
          expectedType: currentScenario.expectedType,
          traineeResponse: response,
        }),
      });

      if (gradeResponse.ok) {
        const result = await gradeResponse.json();
        setGradingResult(result);

        // Save response to database
        const saveResponse = await fetch('/api/trainer/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionNumber,
            promptType: 'craft_single',
            promptContext: `${currentScenario.scenarioContext}\n\nProspect says: "${currentScenario.prospectStatement}"`,
            expectedType: currentScenario.expectedType,
            traineeResponse: response,
            responseTimeMs,
            ...result,
          }),
        });

        if (saveResponse.ok) {
          const savedData = await saveResponse.json();
          setSessionStats((prev) => ({
            questionsAnswered: prev.questionsAnswered + 1,
            correctAnswers: prev.correctAnswers + (result.typeCorrect ? 1 : 0),
            totalXp: prev.totalXp + (savedData.xpAwarded || 0),
          }));
        }

        setPhase('feedback');
      }
    } catch (error) {
      console.error('Error grading response:', error);
    }
  };

  const handleResponseTimeout = () => {
    // Auto-submit empty response on timeout
    if (config.level === 1) {
      handleIdentifyAnswer('');
    } else {
      handleCraftSubmit('(No response - timed out)');
    }
  };

  const handleNextQuestion = () => {
    loadNextQuestion();
  };

  const handlePomodoroComplete = async () => {
    // Complete the session
    if (sessionId) {
      try {
        const response = await fetch(`/api/trainer/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete' }),
        });

        if (response.ok) {
          const result = await response.json();
          setBreakData({
            leveledUp: result.leveledUp,
            newLevel: result.newLevel,
            streak: result.streak,
            grade: result.overallGrade,
          });
          setPhase('break');
        }
      } catch (error) {
        console.error('Error completing session:', error);
      }
    }
  };

  const handleContinueTraining = () => {
    // Reset and start a new session
    setSessionStats({ questionsAnswered: 0, correctAnswers: 0, totalXp: 0 });
    setQuestionNumber(0);
    startSession();
  };

  const handleEndSession = () => {
    onComplete();
  };

  // Render loading state
  if (phase === 'loading' && !currentScenario) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <div className="text-gray-600">Preparing your training session...</div>
        </div>
      </div>
    );
  }

  // Render break prompt
  if (phase === 'break' && breakData) {
    return (
      <BreakPrompt
        summary={{
          questionsAnswered: sessionStats.questionsAnswered,
          correctAnswers: sessionStats.correctAnswers,
          xpEarned: sessionStats.totalXp,
          grade: breakData.grade,
          streak: breakData.streak,
          leveledUp: breakData.leveledUp,
          newLevel: breakData.newLevel,
        }}
        onContinue={handleContinueTraining}
        onEndSession={handleEndSession}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header with Timer */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onPause}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back
          </button>
          <div className="text-sm text-gray-500">
            Question {questionNumber} • Level {config.level}
          </div>
        </div>
        <PomodoroTimer
          durationSeconds={config.timerDuration}
          onComplete={handlePomodoroComplete}
          isPaused={isPaused || phase === 'break'}
        />
      </div>

      {/* Response Timer (for Practice/Live Sim modes) */}
      {phase === 'question' && config.mode !== 'learn' && (
        <div className="mb-6">
          <ResponseTimer
            mode={config.mode}
            onTimeout={handleResponseTimeout}
            isActive={phase === 'question'}
            resetTrigger={resetTrigger}
          />
        </div>
      )}

      {/* Question/Feedback Content */}
      <div className="space-y-6">
        {/* Loading State for New Question */}
        {phase === 'loading' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
              <div className="text-lg font-medium text-gray-900 mb-2">Generating Question...</div>
              <div className="text-sm text-gray-500">Creating a realistic Google Ads prospect scenario</div>
            </div>
          </div>
        )}

        {/* Scenario Card */}
        {currentScenario && (phase === 'question' || phase === 'feedback' || phase === 'grading') && (
          <QuestionCard
            prospectPersona={currentScenario.prospectPersona}
            scenarioContext={currentScenario.scenarioContext}
            prospectStatement={config.level === 1 ? '' : currentScenario.prospectStatement}
            questionType={config.level > 1 ? currentScenario.expectedType : undefined}
            level={config.level}
          />
        )}

        {/* Question Input */}
        {phase === 'question' && currentScenario && (
          config.level === 1 ? (
            <IdentifyQuestion
              sampleQuestion={currentScenario.sampleQuestion || ''}
              scenarioContext={currentScenario.scenarioContext}
              prospectStatement={currentScenario.prospectStatement}
              onAnswer={handleIdentifyAnswer}
            />
          ) : (
            <CraftQuestion
              expectedType={currentScenario.expectedType || 'S'}
              hints={currentScenario.hints}
              onSubmit={handleCraftSubmit}
              mode={config.mode}
            />
          )
        )}

        {/* Grading State */}
        {phase === 'grading' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
            <div className="text-gray-600">Analyzing your response...</div>
          </div>
        )}

        {/* Feedback */}
        {phase === 'feedback' && gradingResult && (
          <div className="space-y-6">
            <GradeDisplay
              grade={gradingResult.grade}
              overallScore={gradingResult.overallScore}
              xpAwarded={sessionStats.totalXp}
            />

            <FeedbackCard
              feedback={gradingResult.feedback}
              improvedVersion={gradingResult.improvedVersion}
              identifiedType={gradingResult.identifiedType}
              expectedType={currentScenario?.expectedType || currentScenario?.correctAnswer || 'S'}
              typeCorrect={gradingResult.typeCorrect}
              breakdown={gradingResult.breakdown}
            />

            <button
              onClick={handleNextQuestion}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors"
            >
              Next Question →
            </button>
          </div>
        )}
      </div>

      {/* Session Stats Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Questions:</span>{' '}
              <span className="font-medium text-gray-900">{sessionStats.questionsAnswered}</span>
            </div>
            <div>
              <span className="text-gray-500">Correct:</span>{' '}
              <span className="font-medium text-green-600">{sessionStats.correctAnswers}</span>
            </div>
            <div>
              <span className="text-gray-500">XP:</span>{' '}
              <span className="font-medium text-yellow-600">+{sessionStats.totalXp}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {config.mode === 'learn' ? '📚 Learn Mode' : config.mode === 'practice' ? '🎯 Practice Mode' : '🔥 Live Sim'}
          </div>
        </div>
      </div>
    </div>
  );
}

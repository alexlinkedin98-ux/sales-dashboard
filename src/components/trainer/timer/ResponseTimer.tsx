'use client';

import { useState, useEffect, useCallback } from 'react';

interface ResponseTimerProps {
  mode: 'learn' | 'practice' | 'live_sim';
  onTimeout: () => void;
  onTick?: (timeLeft: number) => void;
  isActive: boolean;
  resetTrigger?: number; // Change this to reset the timer
}

const TIMER_DURATIONS = {
  learn: 0,       // No timer
  practice: 30,   // 30 seconds
  live_sim: 15,   // 10-15 seconds (we'll use 15 for consistency)
};

export function ResponseTimer({ mode, onTimeout, onTick, isActive, resetTrigger }: ResponseTimerProps) {
  const duration = TIMER_DURATIONS[mode];
  const [timeLeft, setTimeLeft] = useState(duration);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const handleTimeout = useCallback(() => {
    if (!hasTimedOut) {
      setHasTimedOut(true);
      onTimeout();
    }
  }, [hasTimedOut, onTimeout]);

  // Reset timer when resetTrigger changes
  useEffect(() => {
    setTimeLeft(duration);
    setHasTimedOut(false);
  }, [resetTrigger, duration]);

  useEffect(() => {
    if (mode === 'learn' || !isActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (onTick) onTick(newTime);

        if (newTime <= 0) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, isActive, timeLeft, handleTimeout, onTick]);

  // Don't render for learn mode
  if (mode === 'learn') {
    return null;
  }

  const progress = (timeLeft / duration) * 100;

  // Color based on time remaining
  const getBarColor = () => {
    if (progress > 50) return 'bg-green-500';
    if (progress > 25) return 'bg-yellow-500';
    if (progress > 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const isPulsing = progress <= 25;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className={`font-medium ${progress <= 25 ? 'text-red-600' : 'text-gray-700'}`}>
          {timeLeft}s
        </span>
        <span className="text-gray-500">
          {mode === 'practice' ? 'Practice Mode' : 'Live Sim'}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${getBarColor()} ${
            isPulsing ? 'animate-pulse' : ''
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {progress <= 10 && (
        <div className="text-center text-red-600 text-sm font-medium mt-1 animate-pulse">
          Time running out!
        </div>
      )}
    </div>
  );
}

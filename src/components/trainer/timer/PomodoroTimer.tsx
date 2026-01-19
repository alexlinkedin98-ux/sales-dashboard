'use client';

import { useState, useEffect, useCallback } from 'react';

interface PomodoroTimerProps {
  durationSeconds: number;
  onComplete: () => void;
  isPaused: boolean;
}

export function PomodoroTimer({ durationSeconds, onComplete, isPaused }: PomodoroTimerProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [hasCompleted, setHasCompleted] = useState(false);

  const handleComplete = useCallback(() => {
    if (!hasCompleted) {
      setHasCompleted(true);
      onComplete();
    }
  }, [hasCompleted, onComplete]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, timeLeft, handleComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((durationSeconds - timeLeft) / durationSeconds) * 100;

  // Color based on time remaining
  const getColor = () => {
    const percentLeft = (timeLeft / durationSeconds) * 100;
    if (percentLeft > 50) return 'text-green-500';
    if (percentLeft > 25) return 'text-yellow-500';
    if (percentLeft > 10) return 'text-orange-500';
    return 'text-red-500';
  };

  const getStrokeColor = () => {
    const percentLeft = (timeLeft / durationSeconds) * 100;
    if (percentLeft > 50) return '#22c55e';
    if (percentLeft > 25) return '#eab308';
    if (percentLeft > 10) return '#f97316';
    return '#ef4444';
  };

  // Calculate circle dimensions
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
            }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${getColor()}`}>
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="text-sm text-gray-500 mt-2">
        {isPaused ? 'Paused' : 'Session Time'}
      </div>
    </div>
  );
}

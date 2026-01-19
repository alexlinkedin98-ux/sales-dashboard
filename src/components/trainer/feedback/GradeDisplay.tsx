'use client';

import { useEffect, useState } from 'react';
import { Grade, getGradeColor, getGradeBgColor, getGradeDescription } from '@/lib/trainer/gradeCalculator';

interface GradeDisplayProps {
  grade: Grade;
  overallScore: number;
  xpAwarded: number;
  animate?: boolean;
}

export function GradeDisplay({ grade, overallScore, xpAwarded, animate = true }: GradeDisplayProps) {
  const [showGrade, setShowGrade] = useState(!animate);
  const [showScore, setShowScore] = useState(!animate);
  const [showXP, setShowXP] = useState(!animate);

  useEffect(() => {
    if (animate) {
      // Stagger the animations
      setTimeout(() => setShowGrade(true), 100);
      setTimeout(() => setShowScore(true), 500);
      setTimeout(() => setShowXP(true), 900);
    }
  }, [animate]);

  return (
    <div className="text-center space-y-4">
      {/* Grade */}
      <div
        className={`transform transition-all duration-500 ${
          showGrade ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl border-4 ${getGradeBgColor(grade)} ${
            grade === 'S' ? 'animate-pulse' : ''
          }`}
        >
          <span className={`text-5xl font-bold ${getGradeColor(grade)}`}>{grade}</span>
        </div>
        <div className="mt-2 text-gray-600">{getGradeDescription(grade)}</div>
      </div>

      {/* Score */}
      <div
        className={`transform transition-all duration-500 ${
          showScore ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="text-3xl font-bold text-gray-900">{Math.round(overallScore)}%</div>
        <div className="text-sm text-gray-500">Overall Score</div>
      </div>

      {/* XP */}
      <div
        className={`transform transition-all duration-500 ${
          showXP ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
          <span className="text-xl">⭐</span>
          <span className="font-bold">+{xpAwarded} XP</span>
        </div>
      </div>
    </div>
  );
}

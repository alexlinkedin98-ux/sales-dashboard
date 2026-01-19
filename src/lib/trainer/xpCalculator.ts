// XP Calculator for SPIN Question Trainer
// Gamification logic for experience points and levels

import { Grade } from './gradeCalculator';

export type TrainingMode = 'learn' | 'practice' | 'live_sim';

export interface XPConfig {
  baseXP: number;
  levelMultiplier: number;
  modeMultiplier: Record<TrainingMode, number>;
  gradeMultiplier: Record<Grade, number>;
  streakBonusPercent: number;  // Additional % per day of streak
  maxStreakBonus: number;      // Cap on streak bonus
  speedBonus: {
    thresholdSeconds: number;  // Seconds under timer to qualify
    bonus: number;             // Additional XP
  };
}

const DEFAULT_CONFIG: XPConfig = {
  baseXP: 10,
  levelMultiplier: 1.5,  // Each level increases XP potential by 50%
  modeMultiplier: {
    learn: 1.0,
    practice: 1.5,
    live_sim: 2.0,
  },
  gradeMultiplier: {
    S: 2.0,
    A: 1.5,
    B: 1.0,
    C: 0.5,
    F: 0.1,
  },
  streakBonusPercent: 0.1,  // 10% per streak day
  maxStreakBonus: 1.0,       // Max 100% bonus
  speedBonus: {
    thresholdSeconds: 5,     // If answered 5+ seconds before timer
    bonus: 5,
  },
};

export interface XPInput {
  level: number;
  mode: TrainingMode;
  grade: Grade;
  currentStreak: number;
  responseTimeMs: number;
  timerDurationMs: number;  // 0 for Learn mode (no timer)
}

/**
 * Calculate XP earned for a single response
 */
export function calculateXP(input: XPInput, config = DEFAULT_CONFIG): number {
  const { level, mode, grade, currentStreak, responseTimeMs, timerDurationMs } = input;

  // Base XP scaled by level
  const levelScale = Math.pow(config.levelMultiplier, level - 1);
  let xp = config.baseXP * levelScale;

  // Mode multiplier
  xp *= config.modeMultiplier[mode];

  // Grade multiplier
  xp *= config.gradeMultiplier[grade];

  // Streak bonus (capped)
  const streakMultiplier = Math.min(config.maxStreakBonus, currentStreak * config.streakBonusPercent);
  xp *= (1 + streakMultiplier);

  // Speed bonus (only for timed modes)
  if (timerDurationMs > 0) {
    const timeLeftMs = timerDurationMs - responseTimeMs;
    if (timeLeftMs >= config.speedBonus.thresholdSeconds * 1000) {
      xp += config.speedBonus.bonus;
    }
  }

  return Math.round(xp);
}

/**
 * XP thresholds for each level
 * Level 1 = 0 XP
 * Level 2 = 100 XP
 * Level 3 = 300 XP
 * Level 4 = 600 XP
 * etc. (exponential curve)
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 2));
}

/**
 * Calculate level from total XP
 */
export function levelFromXP(totalXP: number): number {
  // Inverse of xpForLevel: level = sqrt(xp/100) + 1
  return Math.floor(Math.sqrt(totalXP / 100) + 1);
}

/**
 * Calculate progress to next level (0-100%)
 */
export function progressToNextLevel(totalXP: number): number {
  const currentLevel = levelFromXP(totalXP);
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);

  const xpIntoLevel = totalXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;

  return Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100);
}

/**
 * XP needed to reach next level from current total
 */
export function xpToNextLevel(totalXP: number): number {
  const currentLevel = levelFromXP(totalXP);
  const nextLevelXP = xpForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXP - totalXP);
}

/**
 * Check if XP gain triggers a level up
 */
export function checkLevelUp(previousXP: number, newXP: number): { leveledUp: boolean; newLevel: number } {
  const previousLevel = levelFromXP(previousXP);
  const newLevel = levelFromXP(newXP);

  return {
    leveledUp: newLevel > previousLevel,
    newLevel,
  };
}

/**
 * Get level title/rank name
 */
export function getLevelTitle(level: number): string {
  if (level >= 50) return 'SPIN Master';
  if (level >= 40) return 'Sales Virtuoso';
  if (level >= 30) return 'Discovery Expert';
  if (level >= 25) return 'Question Craftsman';
  if (level >= 20) return 'Skilled Qualifier';
  if (level >= 15) return 'Rising Star';
  if (level >= 10) return 'Apprentice';
  if (level >= 5) return 'Trainee';
  return 'Beginner';
}

/**
 * Calculate session XP summary
 */
export function calculateSessionXP(
  responses: Array<{ grade: Grade; responseTimeMs: number }>,
  sessionConfig: { level: number; mode: TrainingMode; timerDurationMs: number },
  currentStreak: number
): number {
  return responses.reduce((total, response) => {
    return total + calculateXP({
      level: sessionConfig.level,
      mode: sessionConfig.mode,
      grade: response.grade,
      currentStreak,
      responseTimeMs: response.responseTimeMs,
      timerDurationMs: sessionConfig.timerDurationMs,
    });
  }, 0);
}

// Spaced Repetition Algorithm (SM-2) for SPIN Question Trainer
// Implements the SuperMemo 2 algorithm for optimal review scheduling

import { Grade } from './gradeCalculator';

export interface SM2Result {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date;
}

export interface SM2Input {
  quality: number;          // 0-5 rating
  currentEF: number;        // Current ease factor (default 2.5)
  currentInterval: number;  // Current interval in days
  currentReps: number;      // Current successful repetitions
}

/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality ratings:
 * 0 - Complete blackout, no recall
 * 1 - Wrong answer, but upon seeing correct, remembered
 * 2 - Wrong answer, but correct seemed easy to recall
 * 3 - Correct with serious difficulty
 * 4 - Correct after hesitation
 * 5 - Perfect response, instant recall
 *
 * If quality < 3: Reset repetitions and interval
 * If quality >= 3: Increase interval using ease factor
 */
export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, currentEF, currentInterval, currentReps } = input;

  // Clamp quality to 0-5
  const q = Math.max(0, Math.min(5, quality));

  // Calculate new ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEF = currentEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  newEF = Math.max(1.3, newEF);  // Minimum EF is 1.3

  let newInterval: number;
  let newReps: number;

  if (q < 3) {
    // Failed - reset to beginning
    newReps = 0;
    newInterval = 1;
  } else {
    // Passed - increase interval
    newReps = currentReps + 1;

    if (currentReps === 0) {
      newInterval = 1;  // First successful review
    } else if (currentReps === 1) {
      newInterval = 6;  // Second successful review
    } else {
      // Subsequent reviews: multiply by ease factor
      newInterval = Math.round(currentInterval * newEF);
    }
  }

  // Calculate next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    easeFactor: Math.round(newEF * 100) / 100,  // Round to 2 decimal places
    intervalDays: newInterval,
    repetitions: newReps,
    nextReviewAt,
  };
}

/**
 * Convert trainer grade to SM-2 quality score
 *
 * S (95%+) → 5 (perfect)
 * A (80%+) → 4 (correct with hesitation)
 * B (65%+) → 3 (correct with difficulty)
 * C (50%+) → 2 (wrong but easy to recall)
 * F (<50%) → 1 (wrong, barely remembered)
 */
export function gradeToQuality(grade: Grade): number {
  switch (grade) {
    case 'S': return 5;
    case 'A': return 4;
    case 'B': return 3;
    case 'C': return 2;
    case 'F': return 1;
    default: return 0;
  }
}

/**
 * Get question types that are due for review
 * Returns types sorted by priority (most overdue first)
 */
export interface ReviewItem {
  questionType: 'S' | 'P' | 'I' | 'N';
  level: number;
  daysSinceReview: number;
  daysOverdue: number;
  priority: number;  // Higher = more urgent
}

export function getReviewPriority(
  nextReviewAt: Date,
  lastReviewedAt: Date | null
): { daysSinceReview: number; daysOverdue: number; priority: number } {
  const now = new Date();

  const daysSinceReview = lastReviewedAt
    ? Math.floor((now.getTime() - lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;  // Never reviewed = high priority

  const daysOverdue = Math.floor((now.getTime() - nextReviewAt.getTime()) / (1000 * 60 * 60 * 24));

  // Priority formula: more overdue = higher priority
  // Bonus for items never reviewed
  let priority = Math.max(0, daysOverdue) * 10;
  if (!lastReviewedAt) {
    priority += 100;  // Never reviewed gets high priority
  }

  return { daysSinceReview, daysOverdue, priority };
}

/**
 * Determine which question types should be included in a session
 * based on spaced repetition data
 */
export function selectQuestionsForSession(
  spacedRepData: Array<{
    questionType: 'S' | 'P' | 'I' | 'N';
    level: number;
    nextReviewAt: Date;
    lastReviewedAt: Date | null;
  }>,
  targetCount: number = 10
): Array<{ questionType: 'S' | 'P' | 'I' | 'N'; level: number }> {
  // Calculate priority for each item
  const withPriority = spacedRepData.map(item => ({
    ...item,
    ...getReviewPriority(item.nextReviewAt, item.lastReviewedAt),
  }));

  // Sort by priority (descending)
  withPriority.sort((a, b) => b.priority - a.priority);

  // Take the most urgent items
  return withPriority
    .slice(0, targetCount)
    .map(({ questionType, level }) => ({ questionType, level }));
}

/**
 * Initialize spaced repetition data for a new trainee
 * Creates entries for all question types at level 1
 */
export function initializeSpacedRepetition(): Array<{
  questionType: 'S' | 'P' | 'I' | 'N';
  level: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date;
}> {
  const types: Array<'S' | 'P' | 'I' | 'N'> = ['S', 'P', 'I', 'N'];
  const now = new Date();

  return types.map(type => ({
    questionType: type,
    level: 1,
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: 0,
    nextReviewAt: now,
  }));
}

/**
 * Get human-readable description of review schedule
 */
export function getReviewScheduleText(nextReviewAt: Date): string {
  const now = new Date();
  const diffMs = nextReviewAt.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return overdue === 1 ? '1 day overdue' : `${overdue} days overdue`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays < 7) {
    return `Due in ${diffDays} days`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? 'Due in 1 week' : `Due in ${weeks} weeks`;
  } else {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? 'Due in 1 month' : `Due in ${months} months`;
  }
}

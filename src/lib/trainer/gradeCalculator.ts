// Grade calculator for SPIN Question Trainer
// Calculates grades based on type accuracy, quality, and naturalness

export type Grade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface GradeInput {
  typeAccuracy: number;      // 0-100 (40% weight)
  qualityScore: number;      // 0-100 (40% weight)
  naturalnessScore: number;  // 0-100 (20% weight)
}

export interface GradeResult {
  overallScore: number;      // 0-100
  grade: Grade;
  breakdown: {
    typeComponent: number;
    qualityComponent: number;
    naturalnessComponent: number;
  };
}

/**
 * Calculate grade from component scores
 * Weights: 40% type accuracy, 40% quality, 20% naturalness
 */
export function calculateGrade(input: GradeInput): GradeResult {
  const typeComponent = input.typeAccuracy * 0.4;
  const qualityComponent = input.qualityScore * 0.4;
  const naturalnessComponent = input.naturalnessScore * 0.2;

  const overallScore = typeComponent + qualityComponent + naturalnessComponent;

  let grade: Grade;
  if (overallScore >= 95) {
    grade = 'S';
  } else if (overallScore >= 80) {
    grade = 'A';
  } else if (overallScore >= 65) {
    grade = 'B';
  } else if (overallScore >= 50) {
    grade = 'C';
  } else {
    grade = 'F';
  }

  return {
    overallScore,
    grade,
    breakdown: {
      typeComponent,
      qualityComponent,
      naturalnessComponent,
    },
  };
}

/**
 * Calculate grade for identification questions (Level 1)
 * Only type accuracy matters (100% weight)
 */
export function calculateIdentifyGrade(isCorrect: boolean): GradeResult {
  const score = isCorrect ? 100 : 0;
  return {
    overallScore: score,
    grade: isCorrect ? 'S' : 'F',
    breakdown: {
      typeComponent: score,
      qualityComponent: 0,
      naturalnessComponent: 0,
    },
  };
}

/**
 * Get color class for grade display
 */
export function getGradeColor(grade: Grade): string {
  switch (grade) {
    case 'S':
      return 'text-yellow-500'; // Gold
    case 'A':
      return 'text-green-500';
    case 'B':
      return 'text-blue-500';
    case 'C':
      return 'text-orange-500';
    case 'F':
      return 'text-red-500';
  }
}

/**
 * Get background color class for grade display
 */
export function getGradeBgColor(grade: Grade): string {
  switch (grade) {
    case 'S':
      return 'bg-yellow-100 border-yellow-500';
    case 'A':
      return 'bg-green-100 border-green-500';
    case 'B':
      return 'bg-blue-100 border-blue-500';
    case 'C':
      return 'bg-orange-100 border-orange-500';
    case 'F':
      return 'bg-red-100 border-red-500';
  }
}

/**
 * Get descriptive text for grade
 */
export function getGradeDescription(grade: Grade): string {
  switch (grade) {
    case 'S':
      return 'Perfect! Natural delivery, correct type';
    case 'A':
      return 'Great! Correct type, minor polish needed';
    case 'B':
      return 'Good! Consider making it more open-ended';
    case 'C':
      return 'Needs work. Wrong type but salvageable';
    case 'F':
      return 'Missed the moment. Review and try again';
  }
}

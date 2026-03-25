/**
 * SM-2 間隔反復アルゴリズム (Anki準拠)
 * grade: 0=完全忘れ, 1=難しかった, 2=思い出せた, 3=普通, 4=簡単, 5=完璧
 */

import type { WordProgress } from "@/types";

export type SRSGrade = 0 | 1 | 2 | 3 | 4 | 5;

export interface SRSResult {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReview: Date;
  isMastered: boolean;
}

export function calcNextReview(
  current: Pick<WordProgress, 'ease_factor' | 'interval_days' | 'repetitions'> | null,
  grade: SRSGrade
): SRSResult {
  let easeFactor = current?.ease_factor ?? 2.5;
  let intervalDays = current?.interval_days ?? 0;
  let repetitions = current?.repetitions ?? 0;

  if (grade >= 3) {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  const isMastered = repetitions >= 3 && intervalDays >= 21;

  return { easeFactor, intervalDays, repetitions, nextReview, isMastered };
}

/** 今日が復習日かどうか */
export function isDue(nextReview: string | null): boolean {
  if (!nextReview) return true;
  return new Date(nextReview) <= new Date();
}

/** グレードのラベル（UI用） */
export const GRADE_LABELS: Record<SRSGrade, string> = {
  0: 'まったく覚えていない',
  1: '難しかった',
  2: '思い出せた',
  3: '普通',
  4: '簡単',
  5: '完璧',
};

/** フラッシュカードの「覚えた」「もう一度」を grade に変換 */
export function gradeFromFeedback(feedback: 'again' | 'hard' | 'good' | 'easy'): SRSGrade {
  switch (feedback) {
    case 'again': return 1;
    case 'hard': return 2;
    case 'good': return 4;
    case 'easy': return 5;
  }
}

/** 習得率の計算（0-100%） */
export function calcMasteryRate(
  progresses: Array<{ is_mastered: boolean }>
): number {
  if (progresses.length === 0) return 0;
  const mastered = progresses.filter((p) => p.is_mastered).length;
  return Math.round((mastered / progresses.length) * 100);
}

export const SESSION_SECONDS = 120;

export function sessionDeadline(now: number): number {
  return now + SESSION_SECONDS * 1000;
}

export type Stats = {
  attempted: number;
  skipped: number;
  correct: number;
  score: number;
  level: number;
  streak: number;
  bestStreak: number;
};
export const EMPTY_STATS: Stats = { attempted: 0, skipped: 0, correct: 0, score: 0, level: 1, streak: 0, bestStreak: 0 };

export function scoreAnswer(stats: Stats, correct: boolean): Stats {
  const streak = correct ? stats.streak + 1 : 0;
  return {
    attempted: stats.attempted + 1,
    skipped: stats.skipped,
    correct: stats.correct + Number(correct),
    score: stats.score + (correct ? stats.level : 0),
    level: correct ? stats.level + 1 : Math.max(1, stats.level - 1),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
  };
}

export function secondsLeft(deadline: number | null, now: number): number {
  return deadline === null ? SESSION_SECONDS : Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function isComplete(deadline: number | null, now: number): boolean {
  return secondsLeft(deadline, now) === 0;
}

export function resultSummary(stats: Stats) {
  const accuracy = stats.attempted > 0 ? Math.round(100 * stats.correct / stats.attempted) : 0;
  const stars = stats.correct === 0 ? 0 : accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
  return { accuracy, stars };
}

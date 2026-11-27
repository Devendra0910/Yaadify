// Pure game logic for Invisible Catch — a ball oscillates at constant speed
// along a horizontal track and vanishes through an opaque hidden region; the
// player taps to stop it as close as possible to a target marker placed
// inside that region. A 60-second session, many rounds, score by proximity.

export const SESSION_SECONDS = 60;
export const REVEAL_DELAY_MS = 800;
export const MIN_LEVEL = 1;

interface LevelConfig {
  hiddenFraction: number;
  baseSpeed: number; // track-fractions per second
}

// Levels 1-6 per the design table; level 7+ randomizes both hidden-region
// size (up to 80%) and speed each round instead of following a fixed row.
const LEVEL_TABLE: LevelConfig[] = [
  { hiddenFraction: 0.2, baseSpeed: 0.45 }, // 1: slow
  { hiddenFraction: 0.3, baseSpeed: 0.45 }, // 2: slow
  { hiddenFraction: 0.4, baseSpeed: 0.65 }, // 3: moderate
  { hiddenFraction: 0.5, baseSpeed: 0.65 }, // 4: moderate
  { hiddenFraction: 0.6, baseSpeed: 0.9 }, // 5: fast
  { hiddenFraction: 0.7, baseSpeed: 0.9 }, // 6: fast
];

const LEVEL7_PLUS = { hiddenFractionMin: 0.7, hiddenFractionMax: 0.8, speedMin: 0.65, speedMax: 1.15 };

function jitter(base: number, amount = 0.1): number {
  return base * (1 + (Math.random() * 2 - 1) * amount);
}

export interface Difficulty {
  hiddenFraction: number;
  hiddenStart: number;
  hiddenEnd: number;
  speed: number;
}

/** Hidden region is centered on the track; only the target's position
 * within it is randomized per round. */
export function resolveDifficulty(level: number): Difficulty {
  const safeLevel = Math.max(MIN_LEVEL, level);
  let hiddenFraction: number;
  let speed: number;

  if (safeLevel <= LEVEL_TABLE.length) {
    const config = LEVEL_TABLE[safeLevel - 1]!;
    hiddenFraction = config.hiddenFraction;
    speed = jitter(config.baseSpeed);
  } else {
    hiddenFraction = LEVEL7_PLUS.hiddenFractionMin + Math.random() * (LEVEL7_PLUS.hiddenFractionMax - LEVEL7_PLUS.hiddenFractionMin);
    speed = LEVEL7_PLUS.speedMin + Math.random() * (LEVEL7_PLUS.speedMax - LEVEL7_PLUS.speedMin);
  }

  const hiddenStart = (1 - hiddenFraction) / 2;
  return { hiddenFraction, hiddenStart, hiddenEnd: hiddenStart + hiddenFraction, speed };
}

export interface RoundSetup {
  difficulty: Difficulty;
  /** 0..1 along the track, always inside the hidden region. */
  targetPosition: number;
}

export function generateRound(level: number): RoundSetup {
  const difficulty = resolveDifficulty(level);
  const targetPosition = difficulty.hiddenStart + Math.random() * difficulty.hiddenFraction;
  return { difficulty, targetPosition };
}

/** Constant-speed triangle wave over [0, 1], reversing instantly at each
 * endpoint. speed is in track-fractions per second, constant for the round. */
export function ballPositionAt(elapsedMs: number, speed: number): number {
  const oneWayMs = 1000 / speed;
  const period = oneWayMs * 2;
  const t = ((elapsedMs % period) + period) % period;
  return t <= oneWayMs ? t / oneWayMs : (period - t) / oneWayMs;
}

export interface ScoreResult {
  points: number;
  label: string;
}

const SCORE_BUCKETS: { maxErrorPercent: number; points: number; label: string }[] = [
  { maxErrorPercent: 1, points: 100, label: "Perfect!" },
  { maxErrorPercent: 2.5, points: 80, label: "Excellent!" },
  { maxErrorPercent: 5, points: 60, label: "Great!" },
  { maxErrorPercent: 7.5, points: 40, label: "Good!" },
  { maxErrorPercent: 10, points: 20, label: "Close!" },
];

export function scoreForErrorPercent(errorPercent: number): ScoreResult {
  for (const bucket of SCORE_BUCKETS) {
    if (errorPercent <= bucket.maxErrorPercent) return { points: bucket.points, label: bucket.label };
  }
  return { points: 0, label: "Missed!" };
}

/** >=60 climbs a level, exactly 0 drops a level (floored at MIN_LEVEL), and
 * 20 or 40 leave the level unchanged. */
export function nextLevel(currentLevel: number, points: number): number {
  if (points >= 60) return currentLevel + 1;
  if (points === 0) return Math.max(MIN_LEVEL, currentLevel - 1);
  return currentLevel;
}

// Pure game logic for Time Detective — a two-interval duration-discrimination
// test. Each round flashes two lights for independently sampled durations
// drawn from the same distribution; the player judges which lasted longer.
// No stated target duration exists anywhere, so there's nothing an external
// stopwatch could usefully time against.

export const MIN_LEVEL = 1;

const BASE_DURATION_MS = 5000;
const SIGMA_START_MS = 1500;
const SIGMA_FLOOR_MS = 150;
const SIGMA_DECAY_PER_LEVEL = 0.92;
const MIN_FLASH_MS = 2000;
const MAX_FLASH_MS = 8000;
const MIN_GAP_MS = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Box-Muller transform — a standard-normal sample. */
function gaussianSample(): number {
  const u1 = Math.random() || Number.EPSILON;
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Spread between the two flash durations, in ms — shrinks with level,
 * floored so late levels stay perceptibly (if barely) beatable. */
export function sigmaForLevel(level: number): number {
  const raw = SIGMA_START_MS * Math.pow(SIGMA_DECAY_PER_LEVEL, Math.max(0, level - 1));
  return Math.max(SIGMA_FLOOR_MS, raw);
}

export type TimeDetectiveSide = "A" | "B";

export interface TimeDetectiveRound {
  durationAMs: number;
  durationBMs: number;
  correct: TimeDetectiveSide;
}

/** Draws two independent samples from N(5s, sigma), clamped to a sane flash
 * range, and resolved into a round. Resamples on a near-tie so every round
 * has a genuine, answerable correct side. */
export function generateRound(level: number): TimeDetectiveRound {
  const sigma = sigmaForLevel(level);
  let a = 0;
  let b = 0;
  do {
    a = clamp(Math.round(BASE_DURATION_MS + gaussianSample() * sigma), MIN_FLASH_MS, MAX_FLASH_MS);
    b = clamp(Math.round(BASE_DURATION_MS + gaussianSample() * sigma), MIN_FLASH_MS, MAX_FLASH_MS);
  } while (Math.abs(a - b) < MIN_GAP_MS);

  return { durationAMs: a, durationBMs: b, correct: a > b ? "A" : "B" };
}

export interface TimeDetectiveScoreResult {
  pointsDelta: number;
  nextLevel: number;
}

/** Correct: +current level, level up by 1. Wrong: flat -1, level down by 1
 * (floored at MIN_LEVEL). Mirrors FactFlip's scoring so point values stay
 * comparable across the hub's shared total score. */
export function applyAnswer(correct: boolean, currentLevel: number): TimeDetectiveScoreResult {
  if (correct) {
    return { pointsDelta: currentLevel, nextLevel: currentLevel + 1 };
  }
  return { pointsDelta: -1, nextLevel: Math.max(MIN_LEVEL, currentLevel - 1) };
}

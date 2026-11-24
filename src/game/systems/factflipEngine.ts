// Pure game logic for FactFlip — kept free of React/DOM so the exact same
// scoring/level/question-selection rules can later drive a 1v1 multiplayer
// match or a bot opponent, not just this single-player screen.

import {
  FACTFLIP_QUESTIONS,
  STARTER_LEVELS,
  STARTER_QUESTIONS,
  tierForLevel,
  type FactFlipQuestion,
} from "../data/factflipQuestions";

export const SESSION_SECONDS = 60;
export const MIN_LEVEL = 1;

/** A small seeded PRNG (mulberry32) instead of Math.random(). For a future
 * 1v1 match, giving both players the same seed makes question selection
 * fully deterministic — everyone gets the same sequence at the same
 * difficulty, so the competition is decided by answers, not luck. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FactFlipGenState {
  usedIds: Set<string>;
  rng: () => number;
  seed: number;
}

/** Pass the same seed to reproduce the exact same question sequence —
 * the basis for fair, deterministic multiplayer question selection. */
export function createGenState(seed?: number): FactFlipGenState {
  const resolvedSeed = seed ?? Math.floor(Math.random() * 2 ** 31);
  return { usedIds: new Set(), rng: mulberry32(resolvedSeed), seed: resolvedSeed };
}

/** Draws from the starter pool through level 5, then from the full tier for
 * the current level. Repeats are allowed once the active pool is exhausted. */
export function pickQuestion(level: number, state: FactFlipGenState): FactFlipQuestion {
  const tierPool = level <= STARTER_LEVELS
    ? STARTER_QUESTIONS
    : FACTFLIP_QUESTIONS[tierForLevel(level)] ?? [];
  let pool = tierPool.filter((q) => !state.usedIds.has(q.id));
  if (pool.length === 0) pool = tierPool;

  const idx = Math.floor(state.rng() * pool.length);
  const question = pool[Math.min(idx, pool.length - 1)]!;
  state.usedIds.add(question.id);
  return question;
}

export interface FactFlipScoreResult {
  pointsDelta: number;
  nextLevel: number;
}

/** Correct: +current level, level up by 1. Wrong: flat -1, level down by 1
 * (floor of MIN_LEVEL). The level is never reset on a wrong answer. */
export function applyAnswer(correct: boolean, currentLevel: number): FactFlipScoreResult {
  if (correct) {
    return { pointsDelta: currentLevel, nextLevel: currentLevel + 1 };
  }
  return { pointsDelta: -1, nextLevel: Math.max(MIN_LEVEL, currentLevel - 1) };
}

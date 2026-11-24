import { recordHubScore, resetHubScore } from "./HubScores";
const STORAGE_KEY = "memomart-factflip-save-v1";

export interface FactFlipSaveData {
  bestScore: number;
  bestLevel: number;
  bestStreak: number;
  /** Seconds deducted from the session clock on a wrong answer. Disabled
   * (0) by default, per spec — configurable for players who want it. */
  wrongAnswerPenaltySeconds: number;
}

const DEFAULT_SAVE: FactFlipSaveData = {
  bestScore: 0,
  bestLevel: 1,
  bestStreak: 0,
  wrongAnswerPenaltySeconds: 0,
};

function loadRaw(): FactFlipSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<FactFlipSaveData>;
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function persist(data: FactFlipSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — progress just won't persist.
  }
}

/** A single comparable number for the Game Hub's cross-game score total. */
export function factflipHubScore(data: FactFlipSaveData): number {
  return data.bestScore;
}

export const FactFlipSave = {
  load(): FactFlipSaveData {
    return loadRaw();
  },

  recordRun(score: number, level: number, streak: number): { isNewBest: boolean } {
    const data = loadRaw();
    recordHubScore("game4", score, data.bestScore);
    const isNewBest = score > data.bestScore;
    if (isNewBest) data.bestScore = score;
    if (level > data.bestLevel) data.bestLevel = level;
    if (streak > data.bestStreak) data.bestStreak = streak;
    persist(data);
    return { isNewBest };
  },

  setWrongAnswerPenalty(seconds: number): void {
    persist({ ...loadRaw(), wrongAnswerPenaltySeconds: Math.max(0, seconds) });
  },

  reset(): void {
    resetHubScore("game4");
    persist({ ...DEFAULT_SAVE });
  },
};

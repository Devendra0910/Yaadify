import { recordHubScore, resetHubScore } from "./HubScores";
const STORAGE_KEY = "memomart-timedetective-save-v1";

export interface TimeDetectiveSaveData {
  bestScore: number;
  bestLevel: number;
  bestStreak: number;
}

const DEFAULT_SAVE: TimeDetectiveSaveData = {
  bestScore: 0,
  bestLevel: 1,
  bestStreak: 0,
};

function loadRaw(): TimeDetectiveSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<TimeDetectiveSaveData>;
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function persist(data: TimeDetectiveSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — progress just won't persist.
  }
}

/** A single comparable number for the Game Hub's cross-game score total. */
export function timeDetectiveHubScore(data: TimeDetectiveSaveData): number {
  return data.bestScore;
}

export const TimeDetectiveSave = {
  load(): TimeDetectiveSaveData {
    return loadRaw();
  },

  recordRun(score: number, level: number, streak: number): { isNewBest: boolean } {
    const data = loadRaw();
    recordHubScore("timedetective", score, data.bestScore);
    const isNewBest = score > data.bestScore;
    if (isNewBest) data.bestScore = score;
    if (level > data.bestLevel) data.bestLevel = level;
    if (streak > data.bestStreak) data.bestStreak = streak;
    persist(data);
    return { isNewBest };
  },

  reset(): void {
    resetHubScore("timedetective");
    persist({ ...DEFAULT_SAVE });
  },
};

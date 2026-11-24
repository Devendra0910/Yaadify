import { recordHubScore, resetHubScore } from "./HubScores";
const STORAGE_KEY = "memomart-mindflip-save-v1";

export interface MindFlipSaveData {
  bestScore: number;
  bestStreak: number;
  reduceMotion: boolean;
  tutorialSeen: boolean;
}

const DEFAULT_SAVE: MindFlipSaveData = {
  bestScore: 0,
  bestStreak: 0,
  reduceMotion: false,
  tutorialSeen: false,
};

function loadRaw(): MindFlipSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<MindFlipSaveData>;
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function persist(data: MindFlipSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — progress just won't persist.
  }
}

/** A single comparable number for the Game Hub's cross-game score total. */
export function mindflipHubScore(data: MindFlipSaveData): number {
  return data.bestScore;
}

export const MindFlipSave = {
  load(): MindFlipSaveData {
    return loadRaw();
  },

  recordRun(score: number, streak: number): { isNewBest: boolean } {
    const data = loadRaw();
    recordHubScore("game3", score, data.bestScore);
    const isNewBest = score > data.bestScore;
    if (isNewBest) data.bestScore = score;
    if (streak > data.bestStreak) data.bestStreak = streak;
    persist(data);
    return { isNewBest };
  },

  setReduceMotion(reduceMotion: boolean): void {
    persist({ ...loadRaw(), reduceMotion });
  },

  setTutorialSeen(): void {
    persist({ ...loadRaw(), tutorialSeen: true });
  },

  reset(): void {
    resetHubScore("game3");
    persist({ ...DEFAULT_SAVE });
  },
};

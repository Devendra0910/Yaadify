import { recordHubScore, resetHubScore } from "./HubScores";
const STORAGE_KEY = "memomart-invisiblecatch-save-v1";

export interface InvisibleCatchSaveData {
  bestScore: number;
  bestLevel: number;
}

const DEFAULT_SAVE: InvisibleCatchSaveData = {
  bestScore: 0,
  bestLevel: 1,
};

function loadRaw(): InvisibleCatchSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<InvisibleCatchSaveData>;
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function persist(data: InvisibleCatchSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — progress just won't persist.
  }
}

/** A single comparable number for the Game Hub's cross-game score total. */
export function invisibleCatchHubScore(data: InvisibleCatchSaveData): number {
  return data.bestScore;
}

export const InvisibleCatchSave = {
  load(): InvisibleCatchSaveData {
    return loadRaw();
  },

  recordRun(score: number, highestLevel: number): { isNewBest: boolean } {
    const data = loadRaw();
    recordHubScore("invisiblecatch", score, data.bestScore);
    const isNewBest = score > data.bestScore;
    if (isNewBest) data.bestScore = score;
    if (highestLevel > data.bestLevel) data.bestLevel = highestLevel;
    persist(data);
    return { isNewBest };
  },

  reset(): void {
    resetHubScore("invisiblecatch");
    persist({ ...DEFAULT_SAVE });
  },
};

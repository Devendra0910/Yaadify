import { recordHubScore, resetHubScore } from "./HubScores";
const STORAGE_KEY = "memomart-pulse-save-v1";

export interface PulseSaveData {
  bestScore: number;
  bestRoundScore: number;
  bestErrorMs: number | null;
}

const DEFAULT_SAVE: PulseSaveData = {
  bestScore: 0,
  bestRoundScore: 0,
  bestErrorMs: null,
};

function loadRaw(): PulseSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<PulseSaveData>;
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function persist(data: PulseSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — progress just won't persist.
  }
}

/** A single comparable number for the Game Hub's cross-game score total. */
export function pulseHubScore(data: PulseSaveData): number {
  return data.bestScore;
}

export const PulseSave = {
  load(): PulseSaveData {
    return loadRaw();
  },

  recordRun(totalScore: number, bestRoundScore: number, bestErrorMs: number | null): { isNewBest: boolean } {
    const data = loadRaw();
    recordHubScore("pulse", totalScore, data.bestScore);
    const isNewBest = totalScore > data.bestScore;
    if (isNewBest) data.bestScore = totalScore;
    if (bestRoundScore > data.bestRoundScore) data.bestRoundScore = bestRoundScore;
    if (bestErrorMs !== null && (data.bestErrorMs === null || bestErrorMs < data.bestErrorMs)) {
      data.bestErrorMs = bestErrorMs;
    }
    persist(data);
    return { isNewBest };
  },

  reset(): void {
    resetHubScore("pulse");
    persist({ ...DEFAULT_SAVE });
  },
};

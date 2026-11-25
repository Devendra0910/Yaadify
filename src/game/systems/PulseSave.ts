import { recordHubScore, resetHubScore } from "./HubScores";
const STORAGE_KEY = "memomart-pulse-save-v1";

export interface PulseSaveData {
  /** Highest single-round score ever achieved — not a session total, since
   * a session has no round limit and a cumulative sum would just reward
   * grinding more rounds rather than guessing accurately. */
  bestScore: number;
  bestErrorMs: number | null;
}

const DEFAULT_SAVE: PulseSaveData = {
  bestScore: 0,
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

  recordRun(bestRoundScore: number, bestErrorMs: number | null): { isNewBest: boolean } {
    const data = loadRaw();
    recordHubScore("pulse", bestRoundScore, data.bestScore);
    const isNewBest = bestRoundScore > data.bestScore;
    if (isNewBest) data.bestScore = bestRoundScore;
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

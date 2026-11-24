import { recordHubScore, resetHubScore } from "./HubScores";
import type { SaveData } from "../types";

const STORAGE_KEY = "memomart-save-v1";

const DEFAULT_SAVE: SaveData = {
  bestRunLevel: 0,
  bestRunScore: 0,
  totalXp: 0,
};

function loadRaw(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      bestRunLevel: parsed.bestRunLevel ?? 0,
      bestRunScore: parsed.bestRunScore ?? 0,
      totalXp: parsed.totalXp ?? 0,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function persist(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode, quota) — progress just won't persist.
  }
}

export const SaveSystem = {
  load(): SaveData {
    return loadRaw();
  },

  /** Called once when a run ends (3 strikes), banking its final result. */
  recordRun(levelReached: number, finalScore: number): { isNewBestScore: boolean; isNewBestLevel: boolean } {
    const data = loadRaw();
    recordHubScore("memomart", finalScore, data.bestRunScore);
    const isNewBestScore = finalScore > data.bestRunScore;
    if (isNewBestScore) data.bestRunScore = finalScore;

    const isNewBestLevel = levelReached > data.bestRunLevel;
    if (isNewBestLevel) data.bestRunLevel = levelReached;

    data.totalXp += Math.round(finalScore / 10);

    persist(data);
    return { isNewBestScore, isNewBestLevel };
  },

  reset(): void {
    resetHubScore("memomart");
    persist({ ...DEFAULT_SAVE });
  },
};

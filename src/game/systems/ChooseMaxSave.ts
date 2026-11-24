import { recordHubScore, resetHubScore } from "./HubScores";
const STORAGE_KEY = "memomart-choosemax-save-v1";

export interface ChooseMaxSaveData {
  bestScore: number;
  bestRound: number;
}

const DEFAULT_SAVE: ChooseMaxSaveData = { bestScore: 0, bestRound: 0 };

function loadRaw(): ChooseMaxSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<ChooseMaxSaveData>;
    return {
      bestScore: parsed.bestScore ?? 0,
      bestRound: parsed.bestRound ?? 0,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function persist(data: ChooseMaxSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — progress just won't persist.
  }
}

export const ChooseMaxSave = {
  load(): ChooseMaxSaveData {
    return loadRaw();
  },

  recordRun(round: number, score: number): { isNewBestScore: boolean; isNewBestRound: boolean } {
    const data = loadRaw();
    recordHubScore("game2", score, data.bestScore);
    const isNewBestScore = score > data.bestScore;
    if (isNewBestScore) data.bestScore = score;
    const isNewBestRound = round > data.bestRound;
    if (isNewBestRound) data.bestRound = round;
    persist(data);
    return { isNewBestScore, isNewBestRound };
  },

  reset(): void {
    resetHubScore("game2");
    persist({ ...DEFAULT_SAVE });
  },
};

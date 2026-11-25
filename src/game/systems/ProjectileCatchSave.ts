import { recordHubScore, resetHubScore } from "./HubScores";
const STORAGE_KEY = "memomart-projectilecatch-save-v1";

export interface ProjectileCatchSaveData {
  /** Longest streak of consecutive catches ever landed — a miss ends the
   * run, so this doubles as the game's all-time high score. */
  bestScore: number;
  bestErrorMs: number | null;
}

const DEFAULT_SAVE: ProjectileCatchSaveData = {
  bestScore: 0,
  bestErrorMs: null,
};

function loadRaw(): ProjectileCatchSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<ProjectileCatchSaveData>;
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function persist(data: ProjectileCatchSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — progress just won't persist.
  }
}

/** A single comparable number for the Game Hub's cross-game score total. */
export function projectileCatchHubScore(data: ProjectileCatchSaveData): number {
  return data.bestScore;
}

export const ProjectileCatchSave = {
  load(): ProjectileCatchSaveData {
    return loadRaw();
  },

  recordRun(finalStreak: number, bestErrorMs: number | null): { isNewBest: boolean } {
    const data = loadRaw();
    recordHubScore("projectilecatch", finalStreak, data.bestScore);
    const isNewBest = finalStreak > data.bestScore;
    if (isNewBest) data.bestScore = finalStreak;
    if (bestErrorMs !== null && (data.bestErrorMs === null || bestErrorMs < data.bestErrorMs)) {
      data.bestErrorMs = bestErrorMs;
    }
    persist(data);
    return { isNewBest };
  },

  reset(): void {
    resetHubScore("projectilecatch");
    persist({ ...DEFAULT_SAVE });
  },
};

import { recordHubScore, resetHubScore } from "../systems/HubScores";
import type { Tier } from "./engine";

const STORAGE_KEY = "memomart-dualdrive-save-v1";
export const DUAL_DRIVE_ID = "game6";

export interface DualDriveSaveData {
  bestScore: number;
  bestSurvivalMs: number;
  startTier: Tier;
  soundOn: boolean;
  vibrationOn: boolean;
  tutorialSeen: boolean;
}

const DEFAULT_SAVE: DualDriveSaveData = {
  bestScore: 0,
  bestSurvivalMs: 0,
  startTier: "easy",
  soundOn: true,
  vibrationOn: true,
  tutorialSeen: false,
};

function loadRaw(): DualDriveSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<DualDriveSaveData>;
    return { ...DEFAULT_SAVE, ...parsed };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function persist(data: DualDriveSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — progress just won't persist.
  }
}

/** A single comparable number for the Game Hub's cross-game score total. */
export function dualDriveHubScore(data: DualDriveSaveData): number {
  return data.bestScore;
}

export const DualDriveSave = {
  load(): DualDriveSaveData {
    return loadRaw();
  },

  recordRun(score: number, survivalMs: number): { isNewBest: boolean } {
    const data = loadRaw();
    recordHubScore(DUAL_DRIVE_ID, score, data.bestScore);
    const isNewBest = score > data.bestScore;
    if (isNewBest) data.bestScore = score;
    if (survivalMs > data.bestSurvivalMs) data.bestSurvivalMs = survivalMs;
    persist(data);
    return { isNewBest };
  },

  setStartTier(startTier: Tier): void {
    persist({ ...loadRaw(), startTier });
  },

  setSoundOn(soundOn: boolean): void {
    persist({ ...loadRaw(), soundOn });
  },

  setVibrationOn(vibrationOn: boolean): void {
    persist({ ...loadRaw(), vibrationOn });
  },

  setTutorialSeen(): void {
    persist({ ...loadRaw(), tutorialSeen: true });
  },

  reset(): void {
    resetHubScore(DUAL_DRIVE_ID);
    persist({ ...DEFAULT_SAVE });
  },
};

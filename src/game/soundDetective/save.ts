import { readHubScores, recordHubScore, resetHubScore } from "../systems/HubScores";
import type { Mode } from "./challenges";
import type { Stats } from "./session";

const STORAGE_KEY = "yaadify-sound-detective-v1";
export const SOUND_DETECTIVE_ID = "game5";
export type DetectiveSave = {
  volume: number;
  tutorials: Partial<Record<Mode, boolean>>;
  bests: Record<string, number>;
  sessions: number;
};
const defaults: DetectiveSave = {
  volume: 0.65,
  tutorials: {}, bests: {}, sessions: 0,
};

export function loadDetective(): DetectiveSave {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return { ...defaults };
  }
}

export function saveDetective(data: DetectiveSave) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Live play still works even if browser storage is unavailable.
  }
}

export function detectiveBest(data: DetectiveSave) {
  return Math.max(0, ...Object.values(data.bests));
}

export function detectiveActiveScore(data: DetectiveSave) {
  return readHubScores({ [SOUND_DETECTIVE_ID]: detectiveBest(data) })[SOUND_DETECTIVE_ID] ?? 0;
}

export function recordDetective(data: DetectiveSave, stats: Stats) {
  const key = "identify:level-scoring:timed-120s";
  const previous = data.bests[key] ?? 0;
  recordHubScore(SOUND_DETECTIVE_ID, stats.score, detectiveBest(data));
  const updated = {
    ...data, sessions: data.sessions + 1,
    bests: { ...data.bests, [key]: Math.max(previous, stats.score) },
  };
  saveDetective(updated);
  return { updated, best: updated.bests[key]!, newBest: stats.score > previous };
}

export function resetDetective() {
  resetHubScore(SOUND_DETECTIVE_ID);
  saveDetective({ ...defaults });
}

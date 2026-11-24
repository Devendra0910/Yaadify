import type { LevelConfig } from "../types";

// Tuned for tap-to-collect (not navigation): the real difficulty driver now
// is memorization load, not time pressure, so memorizeTime scales gently
// with listSize instead of shrinking — losing from "ran out of time" should
// be rare, losing from "couldn't remember it" is the actual challenge.
// Level N asks you to remember N items — the simplest possible mapping.
// Everything else (memorize time, distractor pool, similarity) scales
// gently alongside it so the game gets harder without ever feeling unfair.
export const LEVELS: LevelConfig[] = [
  { id: 1, name: "First Trip", listSize: 1, memorizeTime: 8, totalProducts: 8, aisles: 2, gridCols: 7, gridRows: 9, timeLimit: 60, similarityBias: 0 },
  { id: 2, name: "Quick Stock-up", listSize: 2, memorizeTime: 10, totalProducts: 10, aisles: 2, gridCols: 7, gridRows: 9, timeLimit: 70, similarityBias: 0.05 },
  { id: 3, name: "Weekend Groceries", listSize: 3, memorizeTime: 12, totalProducts: 12, aisles: 3, gridCols: 9, gridRows: 11, timeLimit: 80, similarityBias: 0.1 },
  { id: 4, name: "Busy Aisles", listSize: 4, memorizeTime: 14, totalProducts: 15, aisles: 3, gridCols: 9, gridRows: 13, timeLimit: 90, similarityBias: 0.15 },
  { id: 5, name: "Family Shop", listSize: 5, memorizeTime: 15, totalProducts: 16, aisles: 4, gridCols: 11, gridRows: 13, timeLimit: 95, similarityBias: 0.2 },
  { id: 6, name: "Big Basket", listSize: 6, memorizeTime: 16, totalProducts: 18, aisles: 5, gridCols: 13, gridRows: 15, timeLimit: 100, similarityBias: 0.25 },
  { id: 7, name: "Monthly Stock", listSize: 7, memorizeTime: 16, totalProducts: 19, aisles: 6, gridCols: 15, gridRows: 17, timeLimit: 105, similarityBias: 0.3 },
  { id: 8, name: "Rush Hour", listSize: 8, memorizeTime: 17, totalProducts: 20, aisles: 6, gridCols: 15, gridRows: 19, timeLimit: 110, similarityBias: 0.35 },
  { id: 9, name: "Super Saver", listSize: 9, memorizeTime: 17, totalProducts: 21, aisles: 7, gridCols: 17, gridRows: 19, timeLimit: 115, similarityBias: 0.4 },
  { id: 10, name: "Memory Master", listSize: 10, memorizeTime: 18, totalProducts: 22, aisles: 7, gridCols: 17, gridRows: 21, timeLimit: 120, similarityBias: 0.45 },
];

/**
 * Data-driven scaling for levels beyond the hand-tuned first 10, so the
 * level engine supports 100+ levels without new hardcoded entries. Past
 * level 10, listSize keeps pace 1-for-1 with the level id up to a cap,
 * after which it grows more slowly while everything else keeps easing up.
 */
function generateLevelConfig(id: number): LevelConfig {
  const t = id - 10;
  const listSize = id <= 15 ? id : Math.min(18, 15 + Math.floor((id - 15) / 4));
  const memorizeTime = Math.min(22, 18 + Math.floor(t / 6));
  const totalProducts = Math.min(34, 22 + Math.floor(t / 2));
  const aisles = Math.min(9, 7 + Math.floor(t / 5));
  const gridCols = Math.min(19, 17 + Math.floor(t / 6));
  const gridRows = Math.min(23, 21 + Math.floor(t / 6));
  const timeLimit = Math.min(180, 120 + t * 2);
  const similarityBias = Math.min(0.65, 0.45 + t * 0.005);
  return {
    id,
    name: `Memory Mart ${id}`,
    listSize,
    memorizeTime,
    totalProducts,
    aisles,
    gridCols,
    gridRows,
    timeLimit,
    similarityBias,
  };
}

export function getLevelConfig(id: number): LevelConfig {
  const known = LEVELS.find((l) => l.id === id);
  if (known) return known;
  if (id > 10) return generateLevelConfig(id);
  return LEVELS[0];
}

export const MAX_KNOWN_LEVEL = LEVELS.length;

const STORAGE_KEY = "yaadify-hub-scores-v1";
const HALF_LIFE_MS = 60 * 60 * 1000;
type Entry = { score: number; earnedAt: number };
type Entries = Record<string, Entry>;

let fallback: Entries = {};

function read(): Entries {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Entries ?? {} : {};
  } catch {
    return fallback;
  }
}

function save(entries: Entries) {
  fallback = entries;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Keep active scores for this page when browser storage is unavailable.
  }
}

export function decayScore(score: number, earnedAt: number, now: number): number {
  return score * 2 ** (-Math.max(0, now - earnedAt) / HALF_LIFE_MS);
}

function activeScore(entry: Entry, now: number): number {
  return decayScore(entry.score, entry.earnedAt, now);
}

export function readHubScores(legacyScores: Record<string, number>, now = Date.now()): Record<string, number> {
  const entries = read();
  const missing = Object.entries(legacyScores).filter(([id, score]) => !entries[id] && score > 0);
  for (const [id, score] of missing) entries[id] = { score, earnedAt: now };
  if (missing.length) save(entries);

  return Object.fromEntries(Object.keys(legacyScores).map((id) => [
    id, entries[id] ? Math.round(activeScore(entries[id], now)) : 0,
  ]));
}

export function recordHubScore(id: string, score: number, previousBest: number, now = Date.now()) {
  const entries = read();
  const entry = entries[id] ?? { score: previousBest, earnedAt: now };
  entries[id] = score > activeScore(entry, now) ? { score, earnedAt: now } : entry;
  save(entries);
}

export function resetHubScore(id: string, now = Date.now()) {
  save({ ...read(), [id]: { score: 0, earnedAt: now } });
}

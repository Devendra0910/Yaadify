import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { decayScore, isEverUnlocked, markUnlocked, readHubScores, recordHubScore, resetHubScore, resetUnlocked } from "../src/game/systems/HubScores.ts";
import { GAME_NODES, isGameUnlocked } from "../src/game/data/games.ts";

const hour = 60 * 60 * 1000;
const start = Date.UTC(2026, 0, 1);
const memory = new Map();
Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) },
});
beforeEach(() => memory.clear());

test("saved scores halve every hour and tolerate clock rollback", () => {
  assert.equal(decayScore(800, start, start), 800);
  assert.equal(decayScore(800, start, start + hour), 400);
  assert.equal(decayScore(800, start, start + 2 * hour), 200);
  assert.equal(decayScore(800, start, start - hour), 800);
});

test("the sum of active scores across Yaadify decays and can relock a game", () => {
  const existing = { memomart: 130, game2: 80, game3: 80, game4: 60, game5: 50 };
  const total = (time) => Object.values(readHubScores(existing, time)).reduce((sum, value) => sum + value, 0);
  const soundDetective = GAME_NODES.find((node) => node.id === "game5");
  assert.ok(soundDetective.playable);
  assert.equal(total(start), 400);
  assert.ok(total(start) >= soundDetective.unlockScore);
  assert.equal(total(start + hour), 200);
  assert.ok(total(start + hour) < soundDetective.unlockScore);
});

test("a fresh run can restore an active score below an all-time high", () => {
  const existing = { game2: 400 };
  assert.equal(readHubScores(existing, start).game2, 400);
  recordHubScore("game2", 190, 400, start + hour);
  assert.equal(readHubScores(existing, start + hour).game2, 200);
  recordHubScore("game2", 250, 400, start + hour);
  assert.equal(readHubScores(existing, start + hour).game2, 250);
  assert.equal(readHubScores(existing, start + 2 * hour).game2, 125);
  resetHubScore("game2");
  assert.equal(readHubScores({ game2: 0 }, start + 2 * hour).game2, 0);
});

test("once marked unlocked a game stays unlocked until an explicit reset", () => {
  assert.equal(isEverUnlocked("game4"), false);
  markUnlocked("game4");
  assert.equal(isEverUnlocked("game4"), true);
  markUnlocked("game4"); // idempotent — marking twice doesn't break anything
  assert.equal(isEverUnlocked("game4"), true);
  assert.equal(isEverUnlocked("game5"), false, "unlocking one game doesn't unlock another");
  resetUnlocked();
  assert.equal(isEverUnlocked("game4"), false);
});

test("Yaadify keeps MemoMart at the centre and unlocks each playable game at its milestone", () => {
  const centre = GAME_NODES.find((node) => node.connectsTo === null);
  assert.equal(centre.id, "memomart");
  assert.ok(isGameUnlocked(centre, 0));
  const milestones = { "Dual Drive": 100, MindFlip: 200, "Sound Detective": 400, Pulse: 500 };
  const playable = GAME_NODES.filter((node) => node.playable && node !== centre);
  assert.equal(playable.length, Object.keys(milestones).length);
  for (const node of playable) {
    const threshold = milestones[node.name];
    assert.equal(node.unlockScore, threshold);
    assert.equal(isGameUnlocked(node, threshold - 1), false);
    assert.equal(isGameUnlocked(node, threshold), true);
  }
});

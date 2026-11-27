import test from "node:test";
import assert from "node:assert/strict";
import {
  ballPositionAt,
  generateRound,
  MIN_LEVEL,
  nextLevel,
  resolveDifficulty,
  scoreForErrorPercent,
} from "../src/game/systems/invisibleCatchEngine.ts";

test("resolveDifficulty follows the level table for levels 1-6", () => {
  const expected = [
    [0.2, 0.45],
    [0.3, 0.45],
    [0.4, 0.65],
    [0.5, 0.65],
    [0.6, 0.9],
    [0.7, 0.9],
  ];
  for (let level = 1; level <= 6; level++) {
    const d = resolveDifficulty(level);
    const [hidden, baseSpeed] = expected[level - 1];
    assert.equal(d.hiddenFraction, hidden, `level ${level} hidden fraction`);
    // Speed is jittered +/-10% around the base.
    assert.ok(Math.abs(d.speed - baseSpeed) <= baseSpeed * 0.1 + 1e-9, `level ${level} speed ${d.speed} vs base ${baseSpeed}`);
  }
});

test("resolveDifficulty randomizes within bounds for level 7+", () => {
  for (let i = 0; i < 200; i++) {
    const d = resolveDifficulty(7 + (i % 5));
    assert.ok(d.hiddenFraction >= 0.7 && d.hiddenFraction <= 0.8, `hiddenFraction ${d.hiddenFraction}`);
    assert.ok(d.speed >= 0.65 && d.speed <= 1.15, `speed ${d.speed}`);
  }
});

test("the hidden region is centered and the target always falls inside it", () => {
  for (let level = 1; level <= 10; level++) {
    for (let i = 0; i < 50; i++) {
      const { difficulty, targetPosition } = generateRound(level);
      assert.ok(Math.abs(difficulty.hiddenStart + difficulty.hiddenFraction - difficulty.hiddenEnd) < 1e-9);
      assert.ok(Math.abs(difficulty.hiddenStart - (1 - difficulty.hiddenFraction) / 2) < 1e-9, "hidden region should be centered");
      assert.ok(targetPosition >= difficulty.hiddenStart && targetPosition <= difficulty.hiddenEnd);
    }
  }
});

test("ballPositionAt is a 0..1 triangle wave that reverses instantly at each endpoint", () => {
  const speed = 0.5; // one-way traversal = 2000ms
  assert.equal(ballPositionAt(0, speed), 0);
  assert.equal(ballPositionAt(2000, speed), 1);
  assert.equal(ballPositionAt(4000, speed), 0);
  assert.ok(Math.abs(ballPositionAt(1000, speed) - 0.5) < 1e-9);
  assert.ok(Math.abs(ballPositionAt(3000, speed) - 0.5) < 1e-9); // symmetric on the way back

  for (let t = 0; t <= 8000; t += 50) {
    const p = ballPositionAt(t, speed);
    assert.ok(p >= -1e-9 && p <= 1 + 1e-9, `position ${p} escaped [0,1]`);
  }
});

test("scoreForErrorPercent matches the exact bucket table", () => {
  assert.deepEqual(scoreForErrorPercent(0), { points: 100, label: "Perfect!" });
  assert.deepEqual(scoreForErrorPercent(1), { points: 100, label: "Perfect!" });
  assert.deepEqual(scoreForErrorPercent(1.01), { points: 80, label: "Excellent!" });
  assert.deepEqual(scoreForErrorPercent(2.5), { points: 80, label: "Excellent!" });
  assert.deepEqual(scoreForErrorPercent(5), { points: 60, label: "Great!" });
  assert.deepEqual(scoreForErrorPercent(7.5), { points: 40, label: "Good!" });
  assert.deepEqual(scoreForErrorPercent(10), { points: 20, label: "Close!" });
  assert.deepEqual(scoreForErrorPercent(10.01), { points: 0, label: "Missed!" });
  assert.deepEqual(scoreForErrorPercent(50), { points: 0, label: "Missed!" });
});

test("nextLevel: >=60 climbs, exactly 0 drops (floored at MIN_LEVEL), 20/40 hold steady", () => {
  assert.equal(nextLevel(3, 100), 4);
  assert.equal(nextLevel(3, 80), 4);
  assert.equal(nextLevel(3, 60), 4);
  assert.equal(nextLevel(3, 40), 3);
  assert.equal(nextLevel(3, 20), 3);
  assert.equal(nextLevel(3, 0), 2);
  assert.equal(nextLevel(MIN_LEVEL, 0), MIN_LEVEL);
});

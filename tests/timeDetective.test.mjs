import test from "node:test";
import assert from "node:assert/strict";
import { applyAnswer, generateRound, MIN_LEVEL, sigmaForLevel } from "../src/game/systems/timeDetectiveEngine.ts";

test("sigma shrinks monotonically with level and never drops below the floor", () => {
  let prev = sigmaForLevel(1);
  for (let level = 2; level <= 200; level++) {
    const sigma = sigmaForLevel(level);
    assert.ok(sigma <= prev + 1e-9, `sigma rose at level ${level}`);
    assert.ok(sigma >= 150 - 1e-9, `sigma ${sigma} dropped below the floor at level ${level}`);
    prev = sigma;
  }
});

test("generateRound never produces a tie, stays within the safe flash range, and names the actual longer side correct", () => {
  for (let level = 1; level <= 50; level += 7) {
    for (let i = 0; i < 300; i++) {
      const round = generateRound(level);
      assert.notEqual(round.durationAMs, round.durationBMs);
      assert.ok(round.durationAMs >= 2000 && round.durationAMs <= 8000, `A=${round.durationAMs}`);
      assert.ok(round.durationBMs >= 2000 && round.durationBMs <= 8000, `B=${round.durationBMs}`);
      const longer = round.durationAMs > round.durationBMs ? "A" : "B";
      assert.equal(round.correct, longer);
    }
  }
});

test("both sides win roughly equally often across many rounds (no structural bias)", () => {
  let aWins = 0;
  let bWins = 0;
  for (let i = 0; i < 4000; i++) {
    const round = generateRound(1);
    if (round.correct === "A") aWins++;
    else bWins++;
  }
  const ratio = aWins / (aWins + bWins);
  assert.ok(ratio > 0.4 && ratio < 0.6, `A won ${ratio * 100}% of rounds — looks biased`);
});

test("applyAnswer: correct awards the current level and advances it; wrong costs 1 and steps back, floored at MIN_LEVEL", () => {
  assert.deepEqual(applyAnswer(true, 3), { pointsDelta: 3, nextLevel: 4 });
  assert.deepEqual(applyAnswer(false, 3), { pointsDelta: -1, nextLevel: 2 });
  assert.deepEqual(applyAnswer(false, MIN_LEVEL), { pointsDelta: -1, nextLevel: MIN_LEVEL });
});

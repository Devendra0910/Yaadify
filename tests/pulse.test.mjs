import test from "node:test";
import assert from "node:assert/strict";
import {
  generatePulseDurationMs,
  needlePositionMs,
  NEEDLE_SWEEP_MS,
  PULSE_MAX_MS,
  PULSE_MIN_MS,
  resolveRound,
  SCALE_MAX_MS,
  scoreForError,
} from "../src/game/systems/pulseEngine.ts";

test("generatePulseDurationMs stays within the playable range", () => {
  for (let i = 0; i < 2000; i++) {
    const duration = generatePulseDurationMs();
    assert.ok(duration >= PULSE_MIN_MS && duration <= PULSE_MAX_MS, `duration ${duration} out of range`);
  }
});

test("scoreForError follows min(1000, 10000/error), floored at 5ms so it never divides by (near) zero", () => {
  assert.equal(scoreForError(0), 1000); // floored to 5 -> 10000/5 = 2000 -> capped at 1000
  assert.equal(scoreForError(5), 1000);
  assert.equal(scoreForError(10), 1000); // 10000/10 = 1000, exactly at the cap
  assert.equal(scoreForError(20), 500);
  assert.equal(scoreForError(100), 100);
  assert.equal(scoreForError(1000), 10);
  assert.equal(scoreForError(10_000), 1);
  assert.equal(scoreForError(-50), 200); // error magnitude only, sign doesn't matter
});

test("resolveRound computes the absolute error and the matching score", () => {
  const result = resolveRound(1200, 1150);
  assert.equal(result.errorMs, 50);
  assert.equal(result.score, scoreForError(50));

  const reversed = resolveRound(1150, 1200); // same gap, either direction
  assert.equal(reversed.errorMs, 50);
});

test("needlePositionMs is a pure 0..SCALE_MAX_MS..0 triangle wave with period 2*NEEDLE_SWEEP_MS", () => {
  assert.equal(needlePositionMs(0), 0);
  assert.equal(needlePositionMs(NEEDLE_SWEEP_MS), SCALE_MAX_MS);
  assert.equal(needlePositionMs(2 * NEEDLE_SWEEP_MS), 0);
  assert.equal(needlePositionMs(3 * NEEDLE_SWEEP_MS), SCALE_MAX_MS); // next leg up, by periodicity

  const quarter = needlePositionMs(NEEDLE_SWEEP_MS / 2);
  assert.ok(Math.abs(quarter - SCALE_MAX_MS / 2) < 1e-9, `midpoint should be half scale, got ${quarter}`);

  for (let t = 0; t <= 4 * NEEDLE_SWEEP_MS; t += 137) {
    const pos = needlePositionMs(t);
    assert.ok(pos >= -1e-9 && pos <= SCALE_MAX_MS + 1e-9, `position ${pos} escaped [0, SCALE_MAX_MS] at t=${t}`);
  }
});

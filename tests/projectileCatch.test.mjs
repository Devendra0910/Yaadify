import test from "node:test";
import assert from "node:assert/strict";
import {
  autoMissAtMs,
  progressAt,
  resolveCatch,
  resolveDifficulty,
} from "../src/game/systems/projectileCatchEngine.ts";

test("resolveDifficulty ramps monotonically harder with streak and caps out", () => {
  let prev = resolveDifficulty(0);
  for (let streak = 1; streak <= 40; streak++) {
    const d = resolveDifficulty(streak);
    assert.ok(d.flightMs <= prev.flightMs + 1e-9, `flightMs rose at streak ${streak}`);
    assert.ok(d.visibleFraction <= prev.visibleFraction + 1e-9, `visibleFraction rose at streak ${streak}`);
    assert.ok(d.toleranceMs <= prev.toleranceMs + 1e-9, `toleranceMs rose at streak ${streak}`);
    prev = d;
  }
  const capped = resolveDifficulty(1000);
  const atRamp = resolveDifficulty(15);
  assert.equal(capped.flightMs, atRamp.flightMs);
  assert.equal(capped.visibleFraction, atRamp.visibleFraction);
  assert.equal(capped.toleranceMs, atRamp.toleranceMs);
});

test("progressAt is a 0..1 quadratic ease-in: starts slow, lands exactly at 1, never overshoots", () => {
  const flightMs = 2000;
  assert.equal(progressAt(0, flightMs), 0);
  assert.equal(progressAt(flightMs, flightMs), 1);
  assert.equal(progressAt(flightMs * 2, flightMs), 1); // clamped past arrival
  assert.equal(progressAt(-500, flightMs), 0); // clamped before launch

  const half = progressAt(flightMs / 2, flightMs);
  assert.ok(half < 0.5, `halfway through the flight, progress should be under half (quadratic ease-in), got ${half}`);
  assert.ok(Math.abs(half - 0.25) < 1e-9);

  let prev = 0;
  for (let t = 0; t <= flightMs; t += 37) {
    const p = progressAt(t, flightMs);
    assert.ok(p >= prev - 1e-9, "progress should never move backward");
    prev = p;
  }
});

test("resolveCatch: success iff the tap falls within tolerance of the true arrival time", () => {
  assert.deepEqual(resolveCatch(1000, 1000, 150), { errorMs: 0, success: true });
  assert.deepEqual(resolveCatch(1140, 1000, 150), { errorMs: 140, success: true });
  assert.deepEqual(resolveCatch(1150, 1000, 150), { errorMs: 150, success: true }); // exactly at the edge
  assert.deepEqual(resolveCatch(1151, 1000, 150), { errorMs: 151, success: false });
  assert.deepEqual(resolveCatch(800, 1000, 150), { errorMs: 200, success: false }); // early tap too
});

test("autoMissAtMs gives a generous grace window past the true arrival time", () => {
  assert.equal(autoMissAtMs(1000, 150), 1300);
  const auto = autoMissAtMs(2000, 70);
  const result = resolveCatch(auto, 2000, 70);
  assert.equal(result.success, false, "an untapped round left to auto-resolve must always count as a miss");
});

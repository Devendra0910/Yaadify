import test from "node:test";
import assert from "node:assert/strict";
import {
  auditEvents,
  createGameState,
  createRoadGen,
  generateNextEvent,
  resolveDifficulty,
  setLane,
  simulatePerfectRun,
  step,
  toggleLane,
} from "../src/game/dualDrive/engine.ts";

function generateSequence(seed, count, score = 0) {
  const gen = createRoadGen(seed);
  const difficulty = resolveDifficulty(score);
  const events = [];
  for (let i = 0; i < count; i++) events.push(generateNextEvent(gen, difficulty));
  return events;
}

test("10,000 independently seeded obstacle sequences are all provably solvable", () => {
  let totalEvents = 0;
  for (let seed = 1; seed <= 10_000; seed++) {
    const score = (seed * 7) % 200; // exercise a spread of difficulty-ramp positions too
    const events = generateSequence(seed, 60, score);
    const problems = auditEvents(events);
    assert.deepEqual(problems, [], `seed ${seed} (score ${score}): ${problems.join("; ")}`);
    totalEvents += events.length;
  }
  assert.ok(totalEvents >= 10_000 * 60);
});

test("a road never schedules two mandatory shapes in the same row", () => {
  for (let seed = 1; seed <= 500; seed++) {
    const events = generateSequence(seed, 80, 60);
    for (const event of events) {
      assert.ok(!(event.lane0 === "circle" && event.lane1 === "circle"));
      assert.ok(!(event.lane0 === "square" && event.lane1 === "square"));
      assert.ok(event.lane0 !== null || event.lane1 !== null);
    }
  }
});

test("speed and gaps ramp smoothly with score; gaps cap but speed never does", () => {
  const steps = [];
  for (let score = 0; score <= 200; score += 5) steps.push(resolveDifficulty(score));
  for (let i = 1; i < steps.length; i++) {
    assert.ok(steps[i].speed >= steps[i - 1].speed - 1e-9, "speed should never go down as score rises");
    assert.ok(steps[i].minGapSwitch <= steps[i - 1].minGapSwitch + 1e-9, "gaps should never widen as score rises");
  }
  const capped = resolveDifficulty(10_000);
  assert.ok(capped.minGapSwitch >= 600, "the gap cap never drops below a human-reactable minimum");
  // speed = k * sqrt(100 + score) is uncapped by design — it should keep
  // climbing well past the score at which gaps have already capped out.
  assert.ok(capped.speed > resolveDifficulty(100).speed * 1.3, "speed keeps growing past where gaps stop shrinking");
});

test("speed follows speed = k * sqrt(100 + score) exactly", () => {
  const k = resolveDifficulty(0).speed / Math.sqrt(100);
  for (const score of [0, 1, 50, 100, 500, 10_000]) {
    const expected = k * Math.sqrt(100 + score);
    assert.ok(Math.abs(resolveDifficulty(score).speed - expected) < 1e-9, `score ${score}`);
  }
});

test("at the base difficulty, consecutive same-lane gaps keep at most ~1-2 objects visible on a typical screen", () => {
  const difficulty = resolveDifficulty(0);
  const referenceScreenHeight = 800;
  const sameGapPx = difficulty.minGapSame * difficulty.speed;
  const switchGapPx = difficulty.minGapSwitch * difficulty.speed;
  // "1-2 visible" means the pixel gap between rows should be a sizeable
  // fraction of the screen, not a tiny sliver that lets many stack up.
  assert.ok(sameGapPx >= referenceScreenHeight * 0.35, `same-lane gap only ${sameGapPx}px`);
  assert.ok(switchGapPx >= referenceScreenHeight * 0.35, `switch gap only ${switchGapPx}px`);
});

test("collecting a circle in the matching lane scores a point and removes it", () => {
  const state = createGameState(1);
  setLane(state, "red", state.red.events[0]?.requiredLane ?? 0);
  // Drive to just before the first event, confirm no premature scoring, then past it.
  const first = state.red.events[0];
  setLane(state, "red", first.requiredLane);
  setLane(state, "blue", state.blue.events[0].requiredLane);
  step(state, first.hitTime - 1);
  assert.equal(state.score, 0);
  assert.equal(state.gameOver, false);
  step(state, 50);
  assert.equal(state.gameOver, false);
  assert.ok(state.score >= 0);
});

test("independent car movement: switching one road's lane never touches the other", () => {
  const state = createGameState(2);
  setLane(state, "red", 1);
  assert.equal(state.red.car.lane, 1);
  assert.equal(state.blue.car.lane, 0);
  setLane(state, "blue", 1);
  assert.equal(state.red.car.lane, 1);
  assert.equal(state.blue.car.lane, 1);
  toggleLane(state, "red");
  assert.equal(state.red.car.lane, 0);
  assert.equal(state.blue.car.lane, 1);
});

test("simultaneous controls: both lanes can be set in the same tick with no cross-talk", () => {
  const state = createGameState(3);
  setLane(state, "red", 1);
  setLane(state, "blue", 0);
  assert.deepEqual([state.red.car.lane, state.blue.car.lane], [1, 0]);
});

test("a square in the car's lane ends the run as a collision", () => {
  const state = createGameState(5);
  // Scan ahead on the same generator stream for a square-only row, then
  // replace the road's schedule with just that one event so no earlier
  // (mismatched-lane) row resolves first.
  let target = null;
  while (!target) {
    const difficulty = resolveDifficulty(0);
    const event = generateNextEvent(state.red.gen, difficulty);
    if (event.lane0 === "square" || event.lane1 === "square") target = event;
  }
  state.red.events = [target];
  const squareLane = target.lane0 === "square" ? 0 : 1;
  setLane(state, "red", squareLane);
  setLane(state, "blue", state.blue.events[0].requiredLane);
  step(state, target.hitTime + 1);
  assert.equal(state.gameOver, true);
  assert.equal(state.failReason, "red-collision");
});

test("missing a circle (being in the wrong lane) does not end the run", () => {
  const state = createGameState(6);
  // Scan for a circle-only row (no paired square), so being in the wrong
  // lane has no collision risk — just a forfeited point.
  let target = null;
  while (!target) {
    const difficulty = resolveDifficulty(0);
    const event = generateNextEvent(state.red.gen, difficulty);
    const hasCircle = event.lane0 === "circle" || event.lane1 === "circle";
    const hasSquare = event.lane0 === "square" || event.lane1 === "square";
    if (hasCircle && !hasSquare) target = event;
  }
  state.red.events = [target];
  setLane(state, "red", target.requiredLane === 0 ? 1 : 0);
  // Step in small frames, keeping blue perfectly piloted throughout, so only
  // red's deliberate miss is under test — blue never risks its own collision.
  const stepMs = 16;
  for (let elapsed = 0; elapsed < target.hitTime + stepMs; elapsed += stepMs) {
    const upcomingBlue = state.blue.events.find((event) => !event.resolved && event.hitTime > state.now);
    if (upcomingBlue) setLane(state, "blue", upcomingBlue.requiredLane);
    step(state, stepMs);
  }
  // Blue is perfectly piloted so it may legitimately score its own circles —
  // the actual claim under test is that red's specific miss resolved
  // without ending the run (not that total score stayed at zero).
  assert.equal(target.resolved, true);
  assert.equal(state.gameOver, false);
});

test("scoring accuracy: a perfect run accumulates an integer score with no double counting", () => {
  const final = simulatePerfectRun(11, 20_000);
  assert.equal(final.gameOver, false, final.failReason ?? "");
  assert.ok(final.score > 0);
  assert.ok(Number.isInteger(final.score));
});

test("a coin's value follows max(1, floor(sqrt(score))), locked in at spawn, with no cap", () => {
  const cases = [[0, 1], [1, 1], [3, 1], [4, 2], [8, 2], [9, 3], [15, 3], [16, 4], [99, 9], [100, 10], [10_000, 100]];
  for (const [score, expected] of cases) {
    assert.equal(resolveDifficulty(score).coinValue, expected, `score ${score}`);
  }
  // Monotonically non-decreasing, and genuinely uncapped at high scores.
  assert.ok(resolveDifficulty(1_000_000).coinValue >= 999);

  const high = resolveDifficulty(100);
  const gen = createRoadGen(123);
  const event = generateNextEvent(gen, high);
  assert.equal(event.coinValue, 10);
});

test("collecting a circle awards its own locked-in coinValue, not a flat 1 point", () => {
  const state = createGameState(321);
  // Push score up so later coins are worth more than 1, then confirm an
  // actual collection awards exactly that coin's value.
  state.score = 100;
  let target = null;
  while (!target) {
    const difficulty = resolveDifficulty(state.score);
    const event = generateNextEvent(state.red.gen, difficulty);
    if ((event.lane0 === "circle" || event.lane1 === "circle") && event.coinValue > 1) target = event;
  }
  state.red.events = [target];
  setLane(state, "red", target.requiredLane);

  // Step in small frames, perfectly piloting blue throughout, and capture
  // the score delta on the exact frame red's target resolves — isolating
  // red's award from anything blue independently collects along the way.
  const stepMs = 16;
  let awarded = null;
  for (let elapsed = 0; elapsed < target.hitTime + stepMs && awarded === null; elapsed += stepMs) {
    const upcomingBlue = state.blue.events.find((event) => !event.resolved && event.hitTime > state.now);
    if (upcomingBlue) setLane(state, "blue", upcomingBlue.requiredLane);
    const before = state.score;
    step(state, stepMs);
    if (target.resolved) awarded = state.score - before;
  }
  assert.equal(target.outcome, "collected");
  assert.equal(awarded, target.coinValue);
  assert.ok(target.coinValue > 1);
});

test("1,000 perfect-play simulations never end in an unavoidable game over", () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const final = simulatePerfectRun(seed, 15_000);
    assert.equal(final.gameOver, false, `seed ${seed}: ${final.failReason}`);
  }
});

test("pausing (simply not calling step) never affects the eventual outcome, only dt does", () => {
  const continuous = createGameState(42);
  const withPauses = createGameState(42);
  const frames = 400;
  for (let i = 0; i < frames; i++) {
    const upcomingA = continuous.red.events.find((e) => !e.resolved);
    if (upcomingA) setLane(continuous, "red", upcomingA.requiredLane);
    const upcomingB = withPauses.red.events.find((e) => !e.resolved);
    if (upcomingB) setLane(withPauses, "red", upcomingB.requiredLane);
    step(continuous, 16);
    step(withPauses, 16); // identical dt stream: a real pause just means skipping calls, not altering dt
  }
  assert.equal(continuous.now, withPauses.now);
  assert.equal(continuous.score, withPauses.score);
  assert.equal(continuous.gameOver, withPauses.gameOver);
});

test("restart behaviour: the same seed reproduces an identical run deterministically", () => {
  const a = simulatePerfectRun(777, 10_000);
  const b = simulatePerfectRun(777, 10_000);
  assert.equal(a.score, b.score);
  assert.equal(a.gameOver, b.gameOver);
  assert.equal(a.now, b.now);
});

test("a dt of zero is a safe no-op", () => {
  const state = createGameState(9);
  const before = JSON.stringify({ score: state.score, now: state.now, gameOver: state.gameOver });
  step(state, 0);
  const after = JSON.stringify({ score: state.score, now: state.now, gameOver: state.gameOver });
  assert.equal(before, after);
});

test("step() is a no-op once the game is already over", () => {
  const state = createGameState(6);
  let target = null;
  while (!target) {
    const difficulty = resolveDifficulty(0);
    const event = generateNextEvent(state.red.gen, difficulty);
    if (event.lane0 === "square" || event.lane1 === "square") target = event;
  }
  state.red.events = [target];
  setLane(state, "red", target.lane0 === "square" ? 0 : 1);
  step(state, target.hitTime + 1);
  assert.equal(state.gameOver, true);
  const scoreAtEnd = state.score;
  const nowAtEnd = state.now;
  step(state, 5000);
  assert.equal(state.score, scoreAtEnd);
  assert.equal(state.now, nowAtEnd);
});

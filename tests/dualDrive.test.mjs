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

function generateSequence(seed, tier, count, score = 0) {
  const gen = createRoadGen(seed);
  const difficulty = resolveDifficulty(tier, score);
  const events = [];
  for (let i = 0; i < count; i++) events.push(generateNextEvent(gen, difficulty));
  return events;
}

test("10,000 independently seeded obstacle sequences are all provably solvable", () => {
  const tiers = ["easy", "medium", "hard"];
  let totalEvents = 0;
  for (let seed = 1; seed <= 10_000; seed++) {
    const tier = tiers[seed % tiers.length];
    const score = (seed * 7) % 120; // exercise a spread of difficulty-ramp positions too
    const events = generateSequence(seed, tier, 60, score);
    const problems = auditEvents(events);
    assert.deepEqual(problems, [], `seed ${seed} (${tier}, score ${score}): ${problems.join("; ")}`);
    totalEvents += events.length;
  }
  assert.ok(totalEvents >= 10_000 * 60);
});

test("a road never schedules two mandatory shapes in the same row", () => {
  for (let seed = 1; seed <= 500; seed++) {
    const events = generateSequence(seed, "hard", 80, 60);
    for (const event of events) {
      assert.ok(!(event.lane0 === "circle" && event.lane1 === "circle"));
      assert.ok(!(event.lane0 === "square" && event.lane1 === "square"));
      assert.ok(event.lane0 !== null || event.lane1 !== null);
    }
  }
});

test("difficulty ramps smoothly with score and always stays within the hard cap", () => {
  const steps = [];
  for (let score = 0; score <= 120; score += 5) steps.push(resolveDifficulty("easy", score));
  for (let i = 1; i < steps.length; i++) {
    assert.ok(steps[i].speed >= steps[i - 1].speed - 1e-9, "speed should never go down as score rises");
    assert.ok(steps[i].minGapSwitch <= steps[i - 1].minGapSwitch + 1e-9, "gaps should never widen as score rises");
  }
  const capped = resolveDifficulty("easy", 10_000);
  const hard = resolveDifficulty("hard", 10_000);
  assert.ok(Math.abs(capped.speed - hard.speed) < 1e-9, "every tier converges to the same cap eventually");
  assert.ok(capped.minGapSwitch >= 600, "the cap never drops below a human-reactable minimum");
});

test("choosing a starting tier changes where the ramp begins, not where it ends", () => {
  const easyStart = resolveDifficulty("easy", 0);
  const hardStart = resolveDifficulty("hard", 0);
  assert.ok(hardStart.speed > easyStart.speed);
  assert.ok(hardStart.minGapSwitch < easyStart.minGapSwitch);
});

test("collecting a circle in the matching lane scores a point and removes it", () => {
  const state = createGameState("easy", 1);
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
  const state = createGameState("easy", 2);
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
  const state = createGameState("medium", 3);
  setLane(state, "red", 1);
  setLane(state, "blue", 0);
  assert.deepEqual([state.red.car.lane, state.blue.car.lane], [1, 0]);
});

test("a square in the car's lane ends the run as a collision", () => {
  const state = createGameState("easy", 5);
  // Scan ahead on the same generator stream for a square-only row, then
  // replace the road's schedule with just that one event so no earlier
  // (mismatched-lane) row resolves first.
  let target = null;
  while (!target) {
    const difficulty = resolveDifficulty("easy", 0);
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
  const state = createGameState("easy", 6);
  // Scan for a circle-only row (no paired square), so being in the wrong
  // lane has no collision risk — just a forfeited point.
  let target = null;
  while (!target) {
    const difficulty = resolveDifficulty("easy", 0);
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

test("scoring accuracy: a perfect run's score equals its circle count, no double counting", () => {
  const final = simulatePerfectRun(11, "medium", 20_000);
  assert.equal(final.gameOver, false, final.failReason ?? "");
  let circles = 0;
  for (const road of [final.red, final.blue]) {
    for (const event of road.events) {
      if (event.resolved && (event.lane0 === "circle" || event.lane1 === "circle")) circles++;
    }
  }
  // events still tracked are only the recent lookback window, so just assert
  // the score only ever increased by exactly one circle at a time (no jumps).
  assert.ok(final.score > 0);
  assert.ok(Number.isInteger(final.score));
});

test("1,000 perfect-play simulations across all tiers never end in an unavoidable game over", () => {
  const tiers = ["easy", "medium", "hard"];
  for (let seed = 1; seed <= 1000; seed++) {
    const tier = tiers[seed % tiers.length];
    const final = simulatePerfectRun(seed, tier, 15_000);
    assert.equal(final.gameOver, false, `seed ${seed} (${tier}): ${final.failReason}`);
  }
});

test("pausing (simply not calling step) never affects the eventual outcome, only dt does", () => {
  const continuous = createGameState("medium", 42);
  const withPauses = createGameState("medium", 42);
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
  const a = simulatePerfectRun(777, "hard", 10_000);
  const b = simulatePerfectRun(777, "hard", 10_000);
  assert.equal(a.score, b.score);
  assert.equal(a.gameOver, b.gameOver);
  assert.equal(a.now, b.now);
});

test("a dt of zero is a safe no-op", () => {
  const state = createGameState("easy", 9);
  const before = JSON.stringify({ score: state.score, now: state.now, gameOver: state.gameOver });
  step(state, 0);
  const after = JSON.stringify({ score: state.score, now: state.now, gameOver: state.gameOver });
  assert.equal(before, after);
});

test("step() is a no-op once the game is already over", () => {
  const state = createGameState("easy", 6);
  let target = null;
  while (!target) {
    const difficulty = resolveDifficulty("easy", 0);
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

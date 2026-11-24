// Pure game logic for Dual Drive — two independent lane-switching roads
// (red and blue), each generating its own stream of circles (collect) and
// squares (avoid). Kept free of React/DOM/Canvas so the obstacle generator's
// fairness can be exhaustively simulated and unit-tested on its own.

export type Lane = 0 | 1;
export type RoadId = "red" | "blue";
export type ObjectType = "circle" | "square";
export type Tier = "easy" | "medium" | "hard";
export type FailReason = "red-collision" | "red-missed" | "blue-collision" | "blue-missed";

/** A single scheduled obstacle row for one road. Exactly one of the two
 * "mandatory" shapes (a circle, or a square the car must dodge) ever
 * determines `requiredLane` — the generator never produces a row where both
 * lanes are simultaneously mandatory, since that would be an unavoidable
 * game over no matter which lane the car is in. */
export interface TrackEvent {
  id: number;
  hitTime: number;
  lane0: ObjectType | null;
  lane1: ObjectType | null;
  requiredLane: Lane;
  /** Scroll speed (px/ms) in effect when this event was scheduled — captured
   * so a later difficulty ramp never makes an already-spawned object jump. */
  speed: number;
  resolved: boolean;
}

export interface Difficulty {
  speed: number;
  minGapSame: number;
  minGapSwitch: number;
  switchChance: number;
  dualChance: number;
  squareOnlyChance: number;
}

interface TierBase {
  speed: number;
  minGapSame: number;
  minGapSwitch: number;
  switchChance: number;
  dualChance: number;
  squareOnlyChance: number;
}

/** Starting points per chosen tier — "mostly one decision at a time" for
 * easy, both roads needing attention for medium, frequent switches for hard. */
const TIER_BASE: Record<Tier, TierBase> = {
  easy: { speed: 0.22, minGapSame: 1100, minGapSwitch: 1500, switchChance: 0.25, dualChance: 0.05, squareOnlyChance: 0.15 },
  medium: { speed: 0.30, minGapSame: 850, minGapSwitch: 1150, switchChance: 0.45, dualChance: 0.2, squareOnlyChance: 0.25 },
  hard: { speed: 0.38, minGapSame: 650, minGapSwitch: 900, switchChance: 0.6, dualChance: 0.35, squareOnlyChance: 0.3 },
};

/** The ceiling every tier ramps toward — difficulty keeps climbing smoothly
 * with score but never goes below a human-reactable minimum gap. */
const HARD_CAP: TierBase = { speed: 0.52, minGapSame: 480, minGapSwitch: 620, switchChance: 0.68, dualChance: 0.45, squareOnlyChance: 0.35 };

/** Score at which difficulty fully reaches the hard cap, regardless of starting tier. */
const RAMP_SCORE = 60;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function resolveDifficulty(tier: Tier, score: number): Difficulty {
  const base = TIER_BASE[tier];
  const t = Math.min(1, Math.max(0, score) / RAMP_SCORE);
  return {
    speed: lerp(base.speed, HARD_CAP.speed, t),
    minGapSame: lerp(base.minGapSame, HARD_CAP.minGapSame, t),
    minGapSwitch: lerp(base.minGapSwitch, HARD_CAP.minGapSwitch, t),
    switchChance: lerp(base.switchChance, HARD_CAP.switchChance, t),
    dualChance: lerp(base.dualChance, HARD_CAP.dualChance, t),
    squareOnlyChance: lerp(base.squareOnlyChance, HARD_CAP.squareOnlyChance, t),
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RoadGenState {
  rng: () => number;
  lastRequiredLane: Lane | null;
  lastHitTime: number;
  nextId: number;
}

export function createRoadGen(seed: number): RoadGenState {
  return { rng: mulberry32(seed), lastRequiredLane: null, lastHitTime: 0, nextId: 1 };
}

/** Generates the next scheduled row for one road. Never produces two
 * mandatory shapes in the same row, and always spaces consecutive rows by
 * at least the difficulty's lane-switch (or same-lane) minimum gap — the
 * two invariants that together guarantee every generated sequence is
 * solvable (see auditEvents / simulatePerfectRun). */
export function generateNextEvent(state: RoadGenState, difficulty: Difficulty): TrackEvent {
  let requiredLane: Lane;
  let switching: boolean;
  if (state.lastRequiredLane === null) {
    requiredLane = state.rng() < 0.5 ? 0 : 1;
    switching = true; // first row gets the larger gap, for a safe lead-in
  } else {
    switching = state.rng() < difficulty.switchChance;
    requiredLane = switching ? (state.lastRequiredLane === 0 ? 1 : 0) : state.lastRequiredLane;
  }

  const baseGap = switching ? difficulty.minGapSwitch : difficulty.minGapSame;
  const hitTime = state.lastHitTime + baseGap + baseGap * 0.35 * state.rng();

  const squareOnly = state.rng() < difficulty.squareOnlyChance;
  const dualSquare = !squareOnly && state.rng() < difficulty.dualChance;
  const otherLane: Lane = requiredLane === 0 ? 1 : 0;

  let lane0: ObjectType | null = null;
  let lane1: ObjectType | null = null;
  if (squareOnly) {
    if (otherLane === 0) lane0 = "square";
    else lane1 = "square";
  } else {
    if (requiredLane === 0) lane0 = "circle";
    else lane1 = "circle";
    if (dualSquare) {
      if (otherLane === 0) lane0 = "square";
      else lane1 = "square";
    }
  }

  const event: TrackEvent = { id: state.nextId++, hitTime, lane0, lane1, requiredLane, speed: difficulty.speed, resolved: false };
  state.lastRequiredLane = requiredLane;
  state.lastHitTime = hitTime;
  return event;
}

/** How far ahead (ms) the schedule is always kept generated, so rendering
 * never runs out of upcoming objects. */
const HORIZON_MS = 4000;
/** How long a resolved event is kept around before being purged, so a
 * collected/avoided shape can still render its fade-out briefly. */
const LOOKBACK_MS = 600;

export interface CarState {
  lane: Lane;
}

export interface RoadState {
  gen: RoadGenState;
  events: TrackEvent[];
  car: CarState;
}

export interface GameState {
  tier: Tier;
  red: RoadState;
  blue: RoadState;
  now: number;
  score: number;
  gameOver: boolean;
  failReason: FailReason | null;
}

export function createGameState(tier: Tier, seed = Date.now()): GameState {
  const state: GameState = {
    tier,
    red: { gen: createRoadGen(seed >>> 0), events: [], car: { lane: 0 } },
    blue: { gen: createRoadGen((seed + 0x9e3779b9) >>> 0), events: [], car: { lane: 0 } },
    now: 0,
    score: 0,
    gameOver: false,
    failReason: null,
  };
  // Populate the initial horizon immediately so the very first render (or a
  // test inspecting events before the first step()) already has a schedule,
  // not an empty array.
  const difficulty = resolveDifficulty(tier, 0);
  ensureEvents(state.red, 0, difficulty);
  ensureEvents(state.blue, 0, difficulty);
  return state;
}

function ensureEvents(road: RoadState, now: number, difficulty: Difficulty): void {
  const last = road.events[road.events.length - 1];
  if (!last || last.hitTime < now + HORIZON_MS) {
    let latest = last;
    while (!latest || latest.hitTime < now + HORIZON_MS) {
      latest = generateNextEvent(road.gen, difficulty);
      road.events.push(latest);
    }
  }
}

function resolveRoad(road: RoadState, now: number, onScore: () => void): "collision" | "missed" | null {
  for (const event of road.events) {
    if (event.resolved || event.hitTime > now) continue;
    event.resolved = true;
    const carLane = road.car.lane;
    const atCar = carLane === 0 ? event.lane0 : event.lane1;
    const otherLaneShape = carLane === 0 ? event.lane1 : event.lane0;
    if (atCar === "circle") onScore();
    else if (atCar === "square") return "collision";
    else if (otherLaneShape === "circle") return "missed";
  }
  road.events = road.events.filter((event) => !event.resolved || now - event.hitTime < LOOKBACK_MS);
  return null;
}

/** Advances the simulation by dtMs. Mutates and returns the same state
 * reference, matching the ref-driven pattern used by the other mini-games. */
export function step(state: GameState, dtMs: number): GameState {
  if (state.gameOver) return state;
  state.now += dtMs;
  const difficulty = resolveDifficulty(state.tier, state.score);
  ensureEvents(state.red, state.now, difficulty);
  ensureEvents(state.blue, state.now, difficulty);

  const redResult = resolveRoad(state.red, state.now, () => state.score++);
  if (redResult) {
    state.gameOver = true;
    state.failReason = redResult === "collision" ? "red-collision" : "red-missed";
    return state;
  }
  const blueResult = resolveRoad(state.blue, state.now, () => state.score++);
  if (blueResult) {
    state.gameOver = true;
    state.failReason = blueResult === "collision" ? "blue-collision" : "blue-missed";
  }
  return state;
}

export function setLane(state: GameState, road: RoadId, lane: Lane): void {
  state[road].car.lane = lane;
}

export function toggleLane(state: GameState, road: RoadId): void {
  const car = state[road].car;
  car.lane = car.lane === 0 ? 1 : 0;
}

/** Vertical pixel position for an event's leading edge at time `now`, given
 * the car's row sits at y = trackLength. Used by the renderer; kept here so
 * engine and renderer agree on exactly one geometry formula. */
export function eventY(event: TrackEvent, now: number, trackLength: number): number {
  return trackLength - (event.hitTime - now) * event.speed;
}

// ---------- Fairness auditing (used by the generator test suite) ----------

/** Checks a generated event sequence for the two hard invariants: no row
 * ever has two mandatory shapes at once, and every consecutive pair of rows
 * leaves enough time for the implied lane switch (or lack of one). Returns
 * a list of problems — empty means the sequence is provably solvable. */
export function auditEvents(events: readonly TrackEvent[]): string[] {
  const problems: string[] = [];
  for (const event of events) {
    if (event.lane0 === "circle" && event.lane1 === "circle") problems.push(`event ${event.id}: two mandatory circles at once`);
    if (event.lane0 === "square" && event.lane1 === "square") problems.push(`event ${event.id}: two squares at once (unavoidable)`);
    if (event.lane0 === null && event.lane1 === null) problems.push(`event ${event.id}: empty row should never be scheduled`);
  }
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1]!;
    const cur = events[i]!;
    const gap = cur.hitTime - prev.hitTime;
    const switching = cur.requiredLane !== prev.requiredLane;
    if (gap <= 0) problems.push(`event ${cur.id}: non-positive gap from previous row`);
    // A tiny epsilon absorbs floating-point rounding from the jitter term.
    const minRequired = switching ? HARD_CAP.minGapSwitch : HARD_CAP.minGapSame;
    if (gap < minRequired - 1e-6) {
      problems.push(`event ${cur.id}: gap ${gap.toFixed(1)}ms below the ${switching ? "switch" : "same-lane"} minimum ${minRequired}ms`);
    }
  }
  return problems;
}

/** Runs a "perfect" player end-to-end through the real step()/resolveRoad()
 * path (not just the generator) for durationMs of simulated play, always
 * snapping to whatever lane the upcoming event requires as soon as it is
 * generated. Used as an integration-level solvability sanity check. */
export function simulatePerfectRun(seed: number, tier: Tier, durationMs: number): GameState {
  const state = createGameState(tier, seed);
  const stepMs = 16;
  for (let elapsed = 0; elapsed < durationMs && !state.gameOver; elapsed += stepMs) {
    for (const road of ["red", "blue"] as const) {
      const upcoming = state[road].events.find((event) => !event.resolved && event.hitTime > state.now);
      if (upcoming) setLane(state, road, upcoming.requiredLane);
    }
    step(state, stepMs);
  }
  return state;
}

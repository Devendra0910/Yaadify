// Pure game logic for Dual Drive — two independent lane-switching roads
// (red and blue), each generating its own stream of circles (collect) and
// squares (avoid). Kept free of React/DOM/Canvas so the obstacle generator's
// fairness can be exhaustively simulated and unit-tested on its own.

export type Lane = 0 | 1;
export type RoadId = "red" | "blue";
export type ObjectType = "circle" | "square";
export type Tier = "easy" | "medium" | "hard";
export type FailReason = "red-collision" | "blue-collision";

/** A single scheduled obstacle row for one road. `requiredLane` is the lane
 * that keeps the car safe for this row — the circle's lane when one is
 * present, otherwise the lane away from any square. The generator never
 * produces a row with a square in both lanes, since that would be an
 * unavoidable collision no matter which lane the car is in. (Missing a
 * circle isn't fatal — only a square collision is — but `requiredLane`
 * still matters whenever a square shares the row.) */
export type EventOutcome = "collected" | "avoided" | "missed" | "collision";

export interface TrackEvent {
  id: number;
  hitTime: number;
  lane0: ObjectType | null;
  lane1: ObjectType | null;
  requiredLane: Lane;
  /** Scroll speed (px/ms) in effect when this event was scheduled — captured
   * so a later difficulty ramp never makes an already-spawned object jump. */
  speed: number;
  /** Points this row's circle is worth, locked in at spawn time for the same
   * reason as `speed` — a mid-flight difficulty change shouldn't retroactively
   * change what a coin already on screen is worth. */
  coinValue: number;
  resolved: boolean;
  /** Set once resolved, so the renderer can show a collection "pop" instead
   * of letting the shape visibly slide through the car. */
  outcome: EventOutcome | null;
  /** The simulation time (ms) at which this row resolved — null until then. */
  resolvedAt: number | null;
}

export interface Difficulty {
  speed: number;
  minGapSame: number;
  minGapSwitch: number;
  switchChance: number;
  dualChance: number;
  squareOnlyChance: number;
  /** Points a circle is worth while this difficulty is in effect — starts
   * at 1 and climbs toward COIN_VALUE_CAP as speed ramps up with score. */
  coinValue: number;
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
  easy: { speed: 0.09, minGapSame: 1300, minGapSwitch: 1800, switchChance: 0.18, dualChance: 0.03, squareOnlyChance: 0.1 },
  medium: { speed: 0.13, minGapSame: 1000, minGapSwitch: 1350, switchChance: 0.35, dualChance: 0.15, squareOnlyChance: 0.18 },
  hard: { speed: 0.17, minGapSame: 800, minGapSwitch: 1050, switchChance: 0.5, dualChance: 0.28, squareOnlyChance: 0.22 },
};

/** The ceiling every tier ramps toward — difficulty keeps climbing smoothly
 * with score but never goes below a human-reactable minimum gap. */
const HARD_CAP: TierBase = { speed: 0.22, minGapSame: 550, minGapSwitch: 700, switchChance: 0.55, dualChance: 0.35, squareOnlyChance: 0.28 };

/** Score at which difficulty fully reaches the hard cap, regardless of starting tier. */
const RAMP_SCORE = 100;

/** The highest a circle's point value ever climbs to, reached alongside the
 * hard cap. Circles start out worth 1 point each. */
const COIN_VALUE_CAP = 4;

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
    coinValue: 1 + Math.floor(t * (COIN_VALUE_CAP - 1) * (1 + 1e-9)),
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

  const event: TrackEvent = {
    id: state.nextId++, hitTime, lane0, lane1, requiredLane,
    speed: difficulty.speed, coinValue: difficulty.coinValue,
    resolved: false, outcome: null, resolvedAt: null,
  };
  state.lastRequiredLane = requiredLane;
  state.lastHitTime = hitTime;
  return event;
}

/** How far ahead (ms) the schedule is always kept generated. Tripled from
 * the original 4000ms so a freshly spawned object's on-screen position
 * (carY - horizon*speed) starts beyond the top edge of the screen instead
 * of popping in partway down it — especially now that lower speeds cover
 * less pixel distance for the same time horizon. */
const HORIZON_MS = 12000;
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

function resolveRoad(road: RoadState, now: number, onScore: (points: number) => void): "collision" | null {
  for (const event of road.events) {
    if (event.resolved || event.hitTime > now) continue;
    event.resolved = true;
    event.resolvedAt = now;
    const carLane = road.car.lane;
    const atCar = carLane === 0 ? event.lane0 : event.lane1;
    const otherLaneShape = carLane === 0 ? event.lane1 : event.lane0;
    if (atCar === "circle") {
      event.outcome = "collected";
      onScore(event.coinValue);
    } else if (atCar === "square") {
      event.outcome = "collision";
      return "collision";
    } else if (otherLaneShape === "circle") {
      event.outcome = "missed";
      // No score, but only a square collision ends the run.
    } else {
      event.outcome = "avoided";
    }
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

  const redResult = resolveRoad(state.red, state.now, (points) => { state.score += points; });
  if (redResult) {
    state.gameOver = true;
    state.failReason = "red-collision";
    return state;
  }
  const blueResult = resolveRoad(state.blue, state.now, (points) => { state.score += points; });
  if (blueResult) {
    state.gameOver = true;
    state.failReason = "blue-collision";
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

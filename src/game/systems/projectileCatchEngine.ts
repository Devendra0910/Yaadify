// Pure game logic for Projectile Catch — a ball falls toward a catch zone,
// vanishing into fog partway through the flight, and the player taps the
// instant they believe it arrives. A miss ends the run; difficulty escalates
// continuously with the player's streak instead of resetting each round, so
// the challenge (and the "don't break the chain" pull) builds without limit.

const BASE_FLIGHT_MS = 2200;
const MIN_FLIGHT_MS = 900;
const BASE_VISIBLE_FRACTION = 0.65;
const MIN_VISIBLE_FRACTION = 0.25;
const BASE_TOLERANCE_MS = 180;
const MIN_TOLERANCE_MS = 70;

/** Streak at which difficulty fully reaches its hardest setting. */
const RAMP_STREAK = 15;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface Difficulty {
  flightMs: number;
  /** Fraction of the flight visible before fog hides the ball. */
  visibleFraction: number;
  toleranceMs: number;
}

export function resolveDifficulty(streak: number): Difficulty {
  const t = Math.min(1, Math.max(0, streak) / RAMP_STREAK);
  return {
    flightMs: lerp(BASE_FLIGHT_MS, MIN_FLIGHT_MS, t),
    visibleFraction: lerp(BASE_VISIBLE_FRACTION, MIN_VISIBLE_FRACTION, t),
    toleranceMs: lerp(BASE_TOLERANCE_MS, MIN_TOLERANCE_MS, t),
  };
}

/** Quadratic ease-in (a constant-acceleration fall): starts slow, speeds up.
 * Deliberately not constant speed — a steady fall is solvable by simple
 * "it's halfway there, so halfway more time" arithmetic from the visible
 * portion, which would test calculation instead of felt anticipation. */
export function progressAt(elapsedMs: number, flightMs: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs / flightMs));
  return t * t;
}

export interface CatchResult {
  errorMs: number;
  success: boolean;
}

export function resolveCatch(tapElapsedMs: number, flightMs: number, toleranceMs: number): CatchResult {
  const errorMs = Math.round(Math.abs(tapElapsedMs - flightMs));
  return { errorMs, success: errorMs <= toleranceMs };
}

/** If the player never taps, the round resolves as a miss once this much
 * time has passed since launch — otherwise a sufficiently cautious player
 * could simply wait forever instead of ever committing to a guess. */
export function autoMissAtMs(flightMs: number, toleranceMs: number): number {
  return flightMs + toleranceMs * 2;
}

// Pure game logic for Pulse — a single circle pulses for a random duration,
// then a needle sweeps a fixed scale and the player taps to lock in their
// estimate of that duration. No timer, no fail state: it's continuous
// guessing, scored per round, until the player quits.

export const PULSE_MIN_MS = 400;
export const PULSE_MAX_MS = 3000;
export const SCALE_MAX_MS = 3200;

/** Draws this round's true pulse duration, uniform across the playable range. */
export function generatePulseDurationMs(): number {
  return Math.round(PULSE_MIN_MS + Math.random() * (PULSE_MAX_MS - PULSE_MIN_MS));
}

/** min(1000, 10000/error), error floored at 5ms so a dead-perfect guess
 * caps at a flat 1000 instead of dividing by (near) zero. */
export function scoreForError(errorMs: number): number {
  const safeError = Math.max(5, Math.abs(errorMs));
  return Math.min(1000, Math.round(10000 / safeError));
}

export interface PulseRoundResult {
  trueDurationMs: number;
  estimatedMs: number;
  errorMs: number;
  score: number;
}

export function resolveRound(trueDurationMs: number, estimatedMs: number): PulseRoundResult {
  const errorMs = Math.round(Math.abs(trueDurationMs - estimatedMs));
  return { trueDurationMs, estimatedMs, errorMs, score: scoreForError(errorMs) };
}

/** One-way sweep time, in ms — the needle ping-pongs 0 -> SCALE_MAX_MS -> 0
 * with this as the duration of each leg. */
export const NEEDLE_SWEEP_MS = 2600;

/** Deterministic needle position (in the same ms-space as the scale) for a
 * given elapsed time since the sweep started — a pure triangle wave, so the
 * UI can derive the needle's position from a timestamp instead of managing
 * its own simulation state. */
export function needlePositionMs(elapsedMs: number): number {
  const period = NEEDLE_SWEEP_MS * 2;
  const t = ((elapsedMs % period) + period) % period;
  const triangle = t <= NEEDLE_SWEEP_MS ? t : period - t;
  return (triangle / NEEDLE_SWEEP_MS) * SCALE_MAX_MS;
}

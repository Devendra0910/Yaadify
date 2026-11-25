import { useCallback, useEffect, useRef, useState } from "react";
import { generatePulseDurationMs, resolveRound, type PulseRoundResult } from "./pulseEngine";
import { PulseSave } from "./PulseSave";
import { SoundManager } from "./SoundManager";

/** "pulsing": the circle is actively pulsing for this round's true duration.
 * "estimating": the circle has stopped; the needle sweeps and the player
 * taps to lock in an estimate. "revealed": shows this round's score and
 * waits for the player to tap Next. "ended": only reached via a deliberate
 * quit — there's no timer or fail state, so quitting is what finalizes and
 * saves the run. */
export type PulsePhase = "idle" | "pulsing" | "estimating" | "revealed" | "paused" | "ended";

export interface PulseRunStats {
  attempted: number;
  bestRoundScore: number;
  bestErrorMs: number | null;
  averageErrorMs: number;
  rounds: PulseRoundResult[];
}

export function usePulseRun() {
  const [phase, setPhase] = useState<PulsePhase>("idle");
  const [trueDurationMs, setTrueDurationMs] = useState(0);
  const [estimatingStartedAt, setEstimatingStartedAt] = useState(0);
  const [lastRound, setLastRound] = useState<PulseRoundResult | null>(null);
  const [bestRoundScore, setBestRoundScore] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const attemptedRef = useRef(0);
  const bestRoundScoreRef = useRef(0);
  const bestErrorRef = useRef<number | null>(null);
  const errorSumRef = useRef(0);
  const roundsRef = useRef<PulseRoundResult[]>([]);
  const trueDurationRef = useRef(0);
  const pulseTimeoutRef = useRef<number | null>(null);
  const phaseRef = useRef<PulsePhase>("idle");
  phaseRef.current = phase;

  const clearPulseTimeout = () => {
    if (pulseTimeoutRef.current !== null) {
      window.clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = null;
    }
  };

  const nextRound = useCallback(() => {
    const duration = generatePulseDurationMs();
    trueDurationRef.current = duration;
    setTrueDurationMs(duration);
    setLastRound(null);
    setPhase("pulsing");

    clearPulseTimeout();
    pulseTimeoutRef.current = window.setTimeout(() => {
      setEstimatingStartedAt(performance.now());
      setPhase("estimating");
    }, duration);
  }, []);

  const endRun = useCallback(() => {
    clearPulseTimeout();
    setPhase("ended");
    const result = PulseSave.recordRun(bestRoundScoreRef.current, bestErrorRef.current);
    setIsNewBest(result.isNewBest);
  }, []);

  const startRun = useCallback(() => {
    attemptedRef.current = 0;
    bestRoundScoreRef.current = 0;
    bestErrorRef.current = null;
    errorSumRef.current = 0;
    roundsRef.current = [];

    setBestRoundScore(0);
    setAttempted(0);
    setIsNewBest(false);
    nextRound();
  }, [nextRound]);

  const lockEstimate = useCallback((estimatedMs: number) => {
    if (phaseRef.current !== "estimating") return;
    const result = resolveRound(trueDurationRef.current, estimatedMs);

    attemptedRef.current += 1;
    bestRoundScoreRef.current = Math.max(bestRoundScoreRef.current, result.score);
    bestErrorRef.current = bestErrorRef.current === null ? result.errorMs : Math.min(bestErrorRef.current, result.errorMs);
    errorSumRef.current += result.errorMs;
    roundsRef.current = [...roundsRef.current, result];

    setAttempted(attemptedRef.current);
    setBestRoundScore(bestRoundScoreRef.current);
    setLastRound(result);
    setPhase("revealed");
    SoundManager.pickupCorrect();
  }, []);

  /** Called by the "Next" button — the player controls the pace between
   * rounds instead of it auto-advancing on a timer. */
  const advance = useCallback(() => {
    if (phaseRef.current !== "revealed") return;
    nextRound();
  }, [nextRound]);

  /** A hard interrupt from any active phase — resuming starts a fresh round
   * rather than trying to restore a mid-pulse/mid-sweep moment, so the only
   * cost of pausing is the in-flight round, never the session's best. */
  const pause = useCallback(() => {
    if (phaseRef.current === "idle" || phaseRef.current === "paused" || phaseRef.current === "ended") return;
    clearPulseTimeout();
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    nextRound();
  }, [nextRound]);

  /** The only way a run ends — there's no timer and no fail state, so
   * quitting is what finalizes and saves the session's best round. */
  const quit = useCallback(() => {
    endRun();
  }, [endRun]);

  useEffect(() => clearPulseTimeout, []);

  const stats: PulseRunStats = {
    attempted,
    bestRoundScore: bestRoundScoreRef.current,
    bestErrorMs: bestErrorRef.current,
    averageErrorMs: attempted > 0 ? Math.round(errorSumRef.current / attempted) : 0,
    rounds: roundsRef.current,
  };

  return {
    phase,
    trueDurationMs,
    estimatingStartedAt,
    lastRound,
    bestRoundScore,
    attempted,
    isNewBest,
    stats,
    startRun,
    lockEstimate,
    advance,
    pause,
    resume,
    quit,
  };
}

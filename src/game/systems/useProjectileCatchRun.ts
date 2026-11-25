import { useCallback, useEffect, useRef, useState } from "react";
import { autoMissAtMs, resolveCatch, resolveDifficulty, type Difficulty } from "./projectileCatchEngine";
import { ProjectileCatchSave } from "./ProjectileCatchSave";
import { SoundManager } from "./SoundManager";

/** "falling": the ball is in flight (visible, then fogged) and a tap
 * resolves it. "revealed": shows the result of the last catch attempt and
 * waits for the player to tap Next (or, on a miss, See Results). "ended":
 * reached on a miss — there's no timer, a miss is simply what ends the run. */
export type ProjectileCatchPhase = "idle" | "falling" | "revealed" | "paused" | "ended";

export interface ProjectileCatchRoundResult {
  errorMs: number;
  success: boolean;
}

export interface ProjectileCatchRunStats {
  streak: number;
  bestErrorMs: number | null;
}

export function useProjectileCatchRun() {
  const [phase, setPhase] = useState<ProjectileCatchPhase>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [launchedAt, setLaunchedAt] = useState(0);
  const [lastResult, setLastResult] = useState<ProjectileCatchRoundResult | null>(null);
  const [streak, setStreak] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const streakRef = useRef(0);
  const difficultyRef = useRef<Difficulty | null>(null);
  const launchedAtRef = useRef(0);
  const bestErrorRef = useRef<number | null>(null);
  const resolvedRef = useRef(false);
  const autoMissTimeoutRef = useRef<number | null>(null);
  const phaseRef = useRef<ProjectileCatchPhase>("idle");
  phaseRef.current = phase;

  const clearAutoMiss = () => {
    if (autoMissTimeoutRef.current !== null) {
      window.clearTimeout(autoMissTimeoutRef.current);
      autoMissTimeoutRef.current = null;
    }
  };

  const endRun = useCallback(() => {
    clearAutoMiss();
    setPhase("ended");
    const result = ProjectileCatchSave.recordRun(streakRef.current, bestErrorRef.current);
    setIsNewBest(result.isNewBest);
  }, []);

  const resolveTap = useCallback(
    (tapElapsedMs: number) => {
      const d = difficultyRef.current;
      if (!d || resolvedRef.current) return;
      resolvedRef.current = true;
      clearAutoMiss();

      const result = resolveCatch(tapElapsedMs, d.flightMs, d.toleranceMs);
      bestErrorRef.current = bestErrorRef.current === null ? result.errorMs : Math.min(bestErrorRef.current, result.errorMs);
      setLastResult(result);

      if (result.success) {
        streakRef.current += 1;
        setStreak(streakRef.current);
        setPhase("revealed");
        SoundManager.pickupCorrect();
      } else {
        setPhase("revealed");
        SoundManager.pickupWrong();
      }
    },
    [],
  );

  const nextRound = useCallback(() => {
    const d = resolveDifficulty(streakRef.current);
    difficultyRef.current = d;
    setDifficulty(d);
    resolvedRef.current = false;
    setLastResult(null);
    const now = performance.now();
    launchedAtRef.current = now;
    setLaunchedAt(now);
    setPhase("falling");

    clearAutoMiss();
    autoMissTimeoutRef.current = window.setTimeout(() => {
      resolveTap(autoMissAtMs(d.flightMs, d.toleranceMs));
    }, autoMissAtMs(d.flightMs, d.toleranceMs));
  }, [resolveTap]);

  const startRun = useCallback(() => {
    streakRef.current = 0;
    bestErrorRef.current = null;
    setStreak(0);
    setIsNewBest(false);
    nextRound();
  }, [nextRound]);

  const attemptCatch = useCallback(() => {
    if (phaseRef.current !== "falling") return;
    resolveTap(performance.now() - launchedAtRef.current);
  }, [resolveTap]);

  /** Called by the "Next" / "See Results" button after a reveal. */
  const advance = useCallback(() => {
    if (phaseRef.current !== "revealed") return;
    if (lastResult && !lastResult.success) {
      endRun();
      return;
    }
    nextRound();
  }, [endRun, nextRound, lastResult]);

  /** A hard interrupt — resuming starts a fresh round rather than trying to
   * restore a mid-flight moment, so the only cost of pausing is the
   * in-flight round, never the streak itself. */
  const pause = useCallback(() => {
    if (phaseRef.current === "idle" || phaseRef.current === "paused" || phaseRef.current === "ended") return;
    clearAutoMiss();
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    nextRound();
  }, [nextRound]);

  /** The only way a run ends — there's no timer, so a deliberate quit just
   * finalizes and saves the streak reached so far. */
  const quit = useCallback(() => {
    endRun();
  }, [endRun]);

  useEffect(() => clearAutoMiss, []);

  const stats: ProjectileCatchRunStats = {
    streak,
    bestErrorMs: bestErrorRef.current,
  };

  return {
    phase,
    difficulty,
    launchedAt,
    lastResult,
    streak,
    isNewBest,
    stats,
    startRun,
    attemptCatch,
    advance,
    pause,
    resume,
    quit,
  };
}

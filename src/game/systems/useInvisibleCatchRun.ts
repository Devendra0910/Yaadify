import { useCallback, useEffect, useRef, useState } from "react";
import {
  ballPositionAt,
  generateRound,
  nextLevel,
  REVEAL_DELAY_MS,
  scoreForErrorPercent,
  SESSION_SECONDS,
  type RoundSetup,
} from "./invisibleCatchEngine";
import { InvisibleCatchSave } from "./InvisibleCatchSave";
import { SoundManager } from "./SoundManager";

export type InvisibleCatchPhase = "idle" | "oscillating" | "revealed" | "paused" | "ended";

export interface InvisibleCatchRoundResult {
  ballPosition: number;
  targetPosition: number;
  errorPercent: number;
  points: number;
  label: string;
}

export interface InvisibleCatchRunStats {
  attempted: number;
  highestLevel: number;
}

export function useInvisibleCatchRun() {
  const [phase, setPhase] = useState<InvisibleCatchPhase>("idle");
  const [roundSetup, setRoundSetup] = useState<RoundSetup | null>(null);
  const [launchedAt, setLaunchedAt] = useState(0);
  const [lastResult, setLastResult] = useState<InvisibleCatchRoundResult | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_SECONDS);
  const [attempted, setAttempted] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const highestLevelRef = useRef(1);
  const attemptedRef = useRef(0);
  const roundSetupRef = useRef<RoundSetup | null>(null);
  const launchedAtRef = useRef(0);
  const resolvedRef = useRef(false);
  const sessionTimeRef = useRef(SESSION_SECONDS);
  const revealTimeoutRef = useRef<number | null>(null);
  const phaseRef = useRef<InvisibleCatchPhase>("idle");
  phaseRef.current = phase;

  const clearRevealTimeout = () => {
    if (revealTimeoutRef.current !== null) {
      window.clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  };

  const endRun = useCallback(() => {
    clearRevealTimeout();
    setPhase("ended");
    const result = InvisibleCatchSave.recordRun(scoreRef.current, highestLevelRef.current);
    setIsNewBest(result.isNewBest);
  }, []);

  const nextRound = useCallback(() => {
    const setup = generateRound(levelRef.current);
    roundSetupRef.current = setup;
    setRoundSetup(setup);
    resolvedRef.current = false;
    setLastResult(null);
    const now = performance.now();
    launchedAtRef.current = now;
    setLaunchedAt(now);
    setPhase("oscillating");
  }, []);

  const startRun = useCallback(() => {
    scoreRef.current = 0;
    levelRef.current = 1;
    highestLevelRef.current = 1;
    attemptedRef.current = 0;
    sessionTimeRef.current = SESSION_SECONDS;

    setScore(0);
    setLevel(1);
    setAttempted(0);
    setSessionTimeLeft(SESSION_SECONDS);
    setIsNewBest(false);
    nextRound();
  }, [nextRound]);

  const stopBall = useCallback(() => {
    if (phaseRef.current !== "oscillating" || !roundSetupRef.current || resolvedRef.current) return;
    resolvedRef.current = true;
    const setup = roundSetupRef.current;
    const elapsed = performance.now() - launchedAtRef.current;
    const ballPosition = ballPositionAt(elapsed, setup.difficulty.speed);
    const errorPercent = Math.abs(ballPosition - setup.targetPosition) * 100;
    const { points, label } = scoreForErrorPercent(errorPercent);

    attemptedRef.current += 1;
    scoreRef.current += points;
    levelRef.current = nextLevel(levelRef.current, points);
    highestLevelRef.current = Math.max(highestLevelRef.current, levelRef.current);

    setAttempted(attemptedRef.current);
    setScore(scoreRef.current);
    setLevel(levelRef.current);
    setLastResult({ ballPosition, targetPosition: setup.targetPosition, errorPercent, points, label });
    setPhase("revealed");
    if (points > 0) SoundManager.pickupCorrect();
    else SoundManager.pickupWrong();

    clearRevealTimeout();
    revealTimeoutRef.current = window.setTimeout(() => {
      if (sessionTimeRef.current <= 0) {
        endRun();
        return;
      }
      nextRound();
    }, REVEAL_DELAY_MS);
  }, [endRun, nextRound]);

  const pause = useCallback(() => {
    if (phaseRef.current === "idle" || phaseRef.current === "paused" || phaseRef.current === "ended") return;
    clearRevealTimeout();
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    nextRound();
  }, [nextRound]);

  // A hard wall-clock session timer — keeps running through both the
  // oscillating and revealed phases, per spec.
  useEffect(() => {
    if (phase !== "oscillating" && phase !== "revealed") return;
    const id = window.setInterval(() => {
      sessionTimeRef.current = Math.max(0, sessionTimeRef.current - 0.1);
      setSessionTimeLeft(sessionTimeRef.current);
      if (sessionTimeRef.current <= 0) {
        window.clearInterval(id);
        endRun();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, endRun]);

  useEffect(() => clearRevealTimeout, []);

  const stats: InvisibleCatchRunStats = {
    attempted,
    highestLevel: highestLevelRef.current,
  };

  return {
    phase,
    roundSetup,
    launchedAt,
    lastResult,
    score,
    level,
    sessionTimeLeft,
    attempted,
    isNewBest,
    stats,
    startRun,
    stopBall,
    pause,
    resume,
  };
}

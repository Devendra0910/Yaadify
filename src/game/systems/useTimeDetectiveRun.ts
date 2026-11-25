import { useCallback, useEffect, useRef, useState } from "react";
import { applyAnswer, generateRound, SESSION_SECONDS, type TimeDetectiveRound, type TimeDetectiveSide } from "./timeDetectiveEngine";
import { TimeDetectiveSave } from "./TimeDetectiveSave";
import { SoundManager } from "./SoundManager";

export type TimeDetectivePhase = "idle" | "playing" | "roundResult" | "paused" | "gameOver";
/** Sub-state of a "playing" round: which light is lit, or whether we're
 * waiting on the player's answer after both have flashed. */
export type TimeDetectiveStage = "flashA" | "gap" | "flashB" | "waiting";

export interface TimeDetectiveMiss {
  durationAMs: number;
  durationBMs: number;
  picked: TimeDetectiveSide;
  correct: TimeDetectiveSide;
}

export interface TimeDetectiveRunStats {
  attempted: number;
  correct: number;
  wrong: number;
  bestStreak: number;
  misses: TimeDetectiveMiss[];
}

const GAP_MS = 500;

export function useTimeDetectiveRun() {
  const [phase, setPhase] = useState<TimeDetectivePhase>("idle");
  const [stage, setStage] = useState<TimeDetectiveStage>("waiting");
  const [round, setRound] = useState<TimeDetectiveRound | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_SECONDS);
  const [attempted, setAttempted] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);
  const [lastPointsDelta, setLastPointsDelta] = useState(0);
  const [lastPicked, setLastPicked] = useState<TimeDetectiveSide | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const attemptedRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const missesRef = useRef<TimeDetectiveMiss[]>([]);
  const roundRef = useRef<TimeDetectiveRound | null>(null);
  const answeredRef = useRef(false);
  const sessionTimeRef = useRef(SESSION_SECONDS);
  const stageTimeoutRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<TimeDetectivePhase>("playing");
  const phaseRef = useRef<TimeDetectivePhase>("idle");
  const stageRef = useRef<TimeDetectiveStage>("waiting");
  phaseRef.current = phase;
  stageRef.current = stage;

  const clearStageTimeout = () => {
    if (stageTimeoutRef.current !== null) {
      window.clearTimeout(stageTimeoutRef.current);
      stageTimeoutRef.current = null;
    }
  };

  const nextRound = useCallback(() => {
    const r = generateRound(levelRef.current);
    roundRef.current = r;
    setRound(r);
    answeredRef.current = false;
    setLastResult(null);
    setLastPicked(null);
    setPhase("playing");
    setStage("flashA");

    clearStageTimeout();
    stageTimeoutRef.current = window.setTimeout(() => {
      setStage("gap");
      stageTimeoutRef.current = window.setTimeout(() => {
        setStage("flashB");
        stageTimeoutRef.current = window.setTimeout(() => {
          setStage("waiting");
        }, r.durationBMs);
      }, GAP_MS);
    }, r.durationAMs);
  }, []);

  const endRun = useCallback(() => {
    clearStageTimeout();
    setPhase("gameOver");
    const result = TimeDetectiveSave.recordRun(scoreRef.current, levelRef.current, bestStreakRef.current);
    setIsNewBest(result.isNewBest);
  }, []);

  const startRun = useCallback(() => {
    scoreRef.current = 0;
    levelRef.current = 1;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    attemptedRef.current = 0;
    correctRef.current = 0;
    wrongRef.current = 0;
    missesRef.current = [];
    sessionTimeRef.current = SESSION_SECONDS;

    setScore(0);
    setLevel(1);
    setStreak(0);
    setAttempted(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSessionTimeLeft(SESSION_SECONDS);
    setLastPointsDelta(0);
    nextRound();
  }, [nextRound]);

  const answer = useCallback(
    (picked: TimeDetectiveSide) => {
      if (phaseRef.current !== "playing" || stageRef.current !== "waiting" || !roundRef.current || answeredRef.current) return;
      answeredRef.current = true;
      const r = roundRef.current;
      const isCorrect = picked === r.correct;

      attemptedRef.current += 1;
      setAttempted(attemptedRef.current);

      const { pointsDelta, nextLevel } = applyAnswer(isCorrect, levelRef.current);
      scoreRef.current += pointsDelta;
      levelRef.current = nextLevel;
      setScore(scoreRef.current);
      setLevel(levelRef.current);
      setLastPointsDelta(pointsDelta);
      setLastPicked(picked);

      if (isCorrect) {
        correctRef.current += 1;
        setCorrectCount(correctRef.current);
        streakRef.current += 1;
        setStreak(streakRef.current);
        bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
        setLastResult("correct");
        SoundManager.pickupCorrect();
      } else {
        wrongRef.current += 1;
        setWrongCount(wrongRef.current);
        streakRef.current = 0;
        setStreak(0);
        missesRef.current = [...missesRef.current, { durationAMs: r.durationAMs, durationBMs: r.durationBMs, picked, correct: r.correct }];
        setLastResult("wrong");
        SoundManager.pickupWrong();
      }

      setPhase("roundResult");
    },
    [],
  );

  /** Called by the "Next" button — the player controls the pace of a round
   * result instead of it auto-advancing on a timer. */
  const advance = useCallback(() => {
    if (phaseRef.current !== "roundResult") return;
    if (sessionTimeRef.current <= 0) {
      endRun();
      return;
    }
    nextRound();
  }, [endRun, nextRound]);

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing" || stageRef.current !== "waiting") return;
    prevPhaseRef.current = phaseRef.current;
    setPhase("paused");
  }, []);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    setPhase(prevPhaseRef.current);
  }, []);

  // The single session countdown — ticks through the brief roundResult
  // pause too, so a 60s run is a real 60 seconds of wall time.
  useEffect(() => {
    if (phase !== "playing" && phase !== "roundResult") return;
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

  useEffect(() => clearStageTimeout, []);

  const stats: TimeDetectiveRunStats = {
    attempted,
    correct: correctCount,
    wrong: wrongCount,
    bestStreak: bestStreakRef.current,
    misses: missesRef.current,
  };

  return {
    phase,
    stage,
    round,
    score,
    level,
    streak,
    lastResult,
    lastPointsDelta,
    lastPicked,
    isNewBest,
    sessionTimeLeft,
    stats,
    startRun,
    answer,
    advance,
    pause,
    resume,
  };
}

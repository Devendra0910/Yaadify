import { useCallback, useEffect, useRef, useState } from "react";
import { applyAnswer, generateRound, type TimeDetectiveRound, type TimeDetectiveSide } from "./timeDetectiveEngine";
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
  const lastResultRef = useRef<"correct" | "wrong" | null>(null);
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
    lastResultRef.current = null;

    setScore(0);
    setLevel(1);
    setStreak(0);
    setAttempted(0);
    setCorrectCount(0);
    setWrongCount(0);
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
        lastResultRef.current = "correct";
        setLastResult("correct");
        SoundManager.pickupCorrect();
      } else {
        wrongRef.current += 1;
        setWrongCount(wrongRef.current);
        streakRef.current = 0;
        setStreak(0);
        missesRef.current = [...missesRef.current, { durationAMs: r.durationAMs, durationBMs: r.durationBMs, picked, correct: r.correct }];
        lastResultRef.current = "wrong";
        setLastResult("wrong");
        SoundManager.pickupWrong();
      }

      setPhase("roundResult");
    },
    [],
  );

  /** Called by the "Next" / "See Results" button — a wrong answer ends the
   * run outright (survival mode, no timer); a correct one just moves on,
   * at whatever pace the player wants. */
  const advance = useCallback(() => {
    if (phaseRef.current !== "roundResult") return;
    if (lastResultRef.current === "wrong") {
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
    stats,
    startRun,
    answer,
    advance,
    pause,
    resume,
  };
}

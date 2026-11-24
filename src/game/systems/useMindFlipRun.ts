import { useCallback, useEffect, useRef, useState } from "react";
import {
  DIFFICULTY_CONFIGS,
  RUSH_SESSION_SECONDS,
  createGenState,
  difficultyForRush,
  generateQuestion,
  type MindFlipGenState,
  type MindFlipQuestion,
} from "./mindflipEngine";
import { MindFlipSave } from "./MindFlipSave";
import { SoundManager } from "./SoundManager";

export type MindFlipPhase = "idle" | "playing" | "roundResult" | "paused" | "gameOver";
export type MindFlipOutcome = "correct" | "wrong";

export interface MindFlipRunStats {
  attempted: number;
  correct: number;
  bestStreak: number;
  reactionTimes: number[];
}

/** Drives a single MindFlip Time Rush run: a two-minute session where each
 * correct answer scores the current streak and a wrong answer breaks it. */
export function useMindFlipRun() {
  const [phase, setPhase] = useState<MindFlipPhase>("idle");
  const [question, setQuestion] = useState<MindFlipQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastResult, setLastResult] = useState<MindFlipOutcome | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(RUSH_SESSION_SECONDS);
  const [attempted, setAttempted] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [isNewBest, setIsNewBest] = useState(false);

  const genStateRef = useRef<MindFlipGenState>(createGenState());
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const attemptedRef = useRef(0);
  const correctRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const questionStartRef = useRef(0);
  const answeredRef = useRef(false);
  const deadlineRef = useRef<number | null>(null);
  const pausedTimeRef = useRef(RUSH_SESSION_SECONDS);
  const advanceTimeoutRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<MindFlipPhase>("playing");
  const phaseRef = useRef<MindFlipPhase>("idle");
  phaseRef.current = phase;

  const clearAdvanceTimeout = () => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  };

  const nextQuestion = useCallback(() => {
    const config = DIFFICULTY_CONFIGS[difficultyForRush(streakRef.current)];
    const q = generateQuestion(config, genStateRef.current);
    setQuestion(q);
    questionStartRef.current = performance.now();
    answeredRef.current = false;
    setLastResult(null);
    setPhase("playing");
  }, []);

  const endRun = useCallback(() => {
    if (deadlineRef.current === null) return;
    deadlineRef.current = null;
    clearAdvanceTimeout();
    setSessionTimeLeft(0);
    setPhase("gameOver");
    const result = MindFlipSave.recordRun(scoreRef.current, bestStreakRef.current);
    setIsNewBest(result.isNewBest);
  }, []);

  const startRun = useCallback(() => {
    genStateRef.current = createGenState();
    scoreRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    attemptedRef.current = 0;
    correctRef.current = 0;
    reactionTimesRef.current = [];
    clearAdvanceTimeout();
    deadlineRef.current = performance.now() + RUSH_SESSION_SECONDS * 1000;

    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setAttempted(0);
    setCorrectCount(0);
    setReactionTimes([]);
    setSessionTimeLeft(RUSH_SESSION_SECONDS);
    nextQuestion();
  }, [nextQuestion]);

  const answer = useCallback(
    (guessMatch: boolean) => {
      if (phaseRef.current !== "playing" || !question || answeredRef.current) return;
      const now = performance.now();
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      if (now >= deadline) {
        endRun();
        return;
      }
      answeredRef.current = true;
      const reactionMs = Math.round(now - questionStartRef.current);
      const isCorrect = guessMatch === question.isMatch;

      attemptedRef.current += 1;
      setAttempted(attemptedRef.current);
      reactionTimesRef.current = [...reactionTimesRef.current, reactionMs];
      setReactionTimes(reactionTimesRef.current);

      if (isCorrect) {
        correctRef.current += 1;
        setCorrectCount(correctRef.current);
        streakRef.current += 1;
        setStreak(streakRef.current);
        bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
        setBestStreak(bestStreakRef.current);

        scoreRef.current += streakRef.current;
        setScore(scoreRef.current);
        setLastResult("correct");
        SoundManager.pickupCorrect();
      } else {
        streakRef.current = 0;
        setStreak(0);
        setLastResult("wrong");
        SoundManager.pickupWrong();
      }

      setPhase("roundResult");

      clearAdvanceTimeout();
      advanceTimeoutRef.current = window.setTimeout(() => {
        if (deadlineRef.current === null) return;
        if (performance.now() >= deadlineRef.current) {
          endRun();
          return;
        }
        nextQuestion();
      }, 120);
    },
    [question, endRun, nextQuestion],
  );

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const deadline = deadlineRef.current;
    if (deadline === null) return;
    const remaining = (deadline - performance.now()) / 1000;
    if (remaining <= 0) {
      endRun();
      return;
    }
    pausedTimeRef.current = remaining;
    deadlineRef.current = null;
    setSessionTimeLeft(remaining);
    prevPhaseRef.current = phaseRef.current;
    setPhase("paused");
  }, [endRun]);

  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    if (deadlineRef.current !== null) return;
    deadlineRef.current = performance.now() + pausedTimeRef.current * 1000;
    setPhase(prevPhaseRef.current);
  }, []);

  // Use the same deadline during play and answer feedback.
  const running = phase === "playing" || phase === "roundResult";
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const remaining = Math.max(0, (deadline - performance.now()) / 1000);
      if (remaining === 0) endRun();
      else setSessionTimeLeft(remaining);
    }, 100);
    return () => window.clearInterval(id);
  }, [running, endRun]);

  useEffect(() => clearAdvanceTimeout, []);

  const stats: MindFlipRunStats = {
    attempted,
    correct: correctCount,
    bestStreak,
    reactionTimes,
  };

  return {
    phase,
    question,
    score,
    streak,
    lastResult,
    isNewBest,
    sessionTimeLeft,
    stats,
    startRun,
    answer,
    pause,
    resume,
  };
}

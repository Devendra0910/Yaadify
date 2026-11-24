import { useCallback, useEffect, useRef, useState } from "react";
import { applyAnswer, createGenState, pickQuestion, SESSION_SECONDS } from "./factflipEngine";
import { FactFlipSave } from "./FactFlipSave";
import { SoundManager } from "./SoundManager";
import type { FactFlipQuestion } from "../data/factflipQuestions";

export type FactFlipPhase = "idle" | "playing" | "roundResult" | "paused" | "gameOver";
export type FactFlipOutcome = "correct" | "wrong";

export interface FactFlipWrongAnswer {
  question: FactFlipQuestion;
  userAnswer: boolean;
}

export interface FactFlipRunStats {
  attempted: number;
  correct: number;
  wrong: number;
  bestStreak: number;
  reactionTimes: number[];
  wrongAnswers: FactFlipWrongAnswer[];
}

const CORRECT_ADVANCE_DELAY = 450;
const WRONG_ADVANCE_DELAY = 950;

export function useFactFlipRun(wrongAnswerPenaltySeconds: number) {
  const [phase, setPhase] = useState<FactFlipPhase>("idle");
  const [question, setQuestion] = useState<FactFlipQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_SECONDS);
  const [attempted, setAttempted] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [lastResult, setLastResult] = useState<FactFlipOutcome | null>(null);
  const [lastPointsDelta, setLastPointsDelta] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const genStateRef = useRef(createGenState());
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const attemptedRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const wrongAnswersRef = useRef<FactFlipWrongAnswer[]>([]);
  const questionStartRef = useRef(0);
  const answeredRef = useRef(false);
  const sessionTimeRef = useRef(SESSION_SECONDS);
  const advanceTimeoutRef = useRef<number | null>(null);
  const prevPhaseRef = useRef<FactFlipPhase>("playing");
  const phaseRef = useRef<FactFlipPhase>("idle");
  phaseRef.current = phase;

  const clearAdvanceTimeout = () => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  };

  const nextQuestion = useCallback(() => {
    const q = pickQuestion(levelRef.current, genStateRef.current);
    setQuestion(q);
    questionStartRef.current = performance.now();
    answeredRef.current = false;
    setLastResult(null);
    setPhase("playing");
  }, []);

  const endRun = useCallback(() => {
    clearAdvanceTimeout();
    setPhase("gameOver");
    const result = FactFlipSave.recordRun(scoreRef.current, levelRef.current, bestStreakRef.current);
    setIsNewBest(result.isNewBest);
  }, []);

  const startRun = useCallback(() => {
    genStateRef.current = createGenState();
    scoreRef.current = 0;
    levelRef.current = 1;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    attemptedRef.current = 0;
    correctRef.current = 0;
    wrongRef.current = 0;
    reactionTimesRef.current = [];
    wrongAnswersRef.current = [];
    sessionTimeRef.current = SESSION_SECONDS;

    setScore(0);
    setLevel(1);
    setStreak(0);
    setAttempted(0);
    setCorrectCount(0);
    setWrongCount(0);
    setSessionTimeLeft(SESSION_SECONDS);
    setLastPointsDelta(0);
    nextQuestion();
  }, [nextQuestion]);

  const answer = useCallback(
    (guessTrue: boolean) => {
      if (phaseRef.current !== "playing" || !question || answeredRef.current) return;
      answeredRef.current = true;
      const reactionMs = Math.round(performance.now() - questionStartRef.current);
      const isCorrect = guessTrue === question.answer;

      attemptedRef.current += 1;
      setAttempted(attemptedRef.current);
      reactionTimesRef.current = [...reactionTimesRef.current, reactionMs];

      const { pointsDelta, nextLevel } = applyAnswer(isCorrect, levelRef.current);
      scoreRef.current += pointsDelta;
      levelRef.current = nextLevel;
      setScore(scoreRef.current);
      setLevel(levelRef.current);
      setLastPointsDelta(pointsDelta);

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
        wrongAnswersRef.current = [...wrongAnswersRef.current, { question, userAnswer: guessTrue }];
        if (wrongAnswerPenaltySeconds > 0) {
          sessionTimeRef.current = Math.max(0, sessionTimeRef.current - wrongAnswerPenaltySeconds);
          setSessionTimeLeft(sessionTimeRef.current);
        }
        setLastResult("wrong");
        SoundManager.pickupWrong();
      }

      setPhase("roundResult");

      clearAdvanceTimeout();
      advanceTimeoutRef.current = window.setTimeout(
        () => {
          if (sessionTimeRef.current <= 0) {
            endRun();
            return;
          }
          nextQuestion();
        },
        isCorrect ? CORRECT_ADVANCE_DELAY : WRONG_ADVANCE_DELAY,
      );
    },
    [question, wrongAnswerPenaltySeconds, endRun, nextQuestion],
  );

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
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

  useEffect(() => clearAdvanceTimeout, []);

  const stats: FactFlipRunStats = {
    attempted,
    correct: correctCount,
    wrong: wrongCount,
    bestStreak: bestStreakRef.current,
    reactionTimes: reactionTimesRef.current,
    wrongAnswers: wrongAnswersRef.current,
  };

  return {
    phase,
    question,
    score,
    level,
    streak,
    lastResult,
    lastPointsDelta,
    isNewBest,
    sessionTimeLeft,
    stats,
    startRun,
    answer,
    pause,
    resume,
  };
}

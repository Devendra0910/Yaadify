import { useEffect, useRef } from "react";
import { useFactFlipRun, type FactFlipRunStats } from "../../../game/systems/useFactFlipRun";
import { PauseMenu } from "../PauseMenu";

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export interface FactFlipRunResult {
  score: number;
  level: number;
  stats: FactFlipRunStats;
  isNewBest: boolean;
}

export function FactFlipGameScreen({
  wrongAnswerPenaltySeconds,
  onFinished,
  onExitToHome,
}: {
  wrongAnswerPenaltySeconds: number;
  onFinished: (result: FactFlipRunResult) => void;
  onExitToHome: () => void;
}) {
  const engine = useFactFlipRun(wrongAnswerPenaltySeconds);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      engine.startRun();
    }
    // Intentionally runs once on mount — this screen is remounted fresh per run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engine.phase === "gameOver") {
      onFinished({ score: engine.score, level: engine.level, stats: engine.stats, isNewBest: engine.isNewBest });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase]);

  // Keyboard controls: left arrow = True, right arrow = False.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") engine.answer(true);
      else if (e.key === "ArrowRight") engine.answer(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.answer]);

  if (!engine.question) return null;

  const showReveal = engine.phase === "roundResult" && engine.lastResult === "wrong";
  const feedbackClass =
    engine.phase === "roundResult"
      ? engine.lastResult === "correct"
        ? "ff-feedback-correct"
        : "ff-feedback-wrong"
      : "";

  return (
    <div className="overlay ff-game-overlay">
      <div className="ff-hud">
        <div className="hud-top">
          <div className={`hud-pill ${engine.sessionTimeLeft <= 10 ? "hud-pill--warn" : ""}`}>⏱ {formatClock(engine.sessionTimeLeft)}</div>
          <div className="hud-top-buttons">
            <button className="hud-icon-btn" onClick={engine.pause} aria-label="Pause">
              ⏸
            </button>
          </div>
        </div>
        <div className="hud-run-row">
          <div className="hud-pill">⭐ {engine.score}</div>
          <div className="hud-pill">Lvl {engine.level}</div>
          <div className="hud-pill">🔥 {engine.streak}</div>
        </div>
      </div>

      <div className="ff-play-area">
        <div key={engine.stats.attempted} className={`ff-statement-card ${feedbackClass}`}>
          <p className="ff-statement-text">{engine.question.statement}</p>

          {engine.phase === "roundResult" && (
            <div className={`ff-points-float ${engine.lastResult === "correct" ? "ff-points-float--up" : "ff-points-float--down"}`}>
              {engine.lastPointsDelta > 0 ? `+${engine.lastPointsDelta}` : engine.lastPointsDelta}
            </div>
          )}
        </div>

        {showReveal && (
          <div className="ff-reveal">
            <div className="ff-reveal-answer">Correct answer: {engine.question.answer ? "TRUE" : "FALSE"}</div>
            <p className="ff-reveal-explanation">{engine.question.explanation}</p>
          </div>
        )}
      </div>

      <div className="ff-answer-grid">
        <button
          className="ff-answer-btn ff-answer-btn--true"
          disabled={engine.phase !== "playing"}
          onClick={() => engine.answer(true)}
        >
          ✓ TRUE
        </button>
        <button
          className="ff-answer-btn ff-answer-btn--false"
          disabled={engine.phase !== "playing"}
          onClick={() => engine.answer(false)}
        >
          ✕ FALSE
        </button>
      </div>

      {engine.phase === "paused" && (
        <PauseMenu
          onResume={engine.resume}
          onRestart={() => {
            engine.resume();
            engine.startRun();
          }}
          onQuit={onExitToHome}
        />
      )}
    </div>
  );
}

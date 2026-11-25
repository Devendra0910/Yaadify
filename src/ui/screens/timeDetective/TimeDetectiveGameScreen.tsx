import { useEffect, useRef } from "react";
import { useTimeDetectiveRun, type TimeDetectiveRunStats } from "../../../game/systems/useTimeDetectiveRun";
import { PauseMenu } from "../PauseMenu";

export interface TimeDetectiveRunResult {
  score: number;
  level: number;
  stats: TimeDetectiveRunStats;
  isNewBest: boolean;
}

export function TimeDetectiveGameScreen({
  onFinished,
  onExitToHome,
}: {
  onFinished: (result: TimeDetectiveRunResult) => void;
  onExitToHome: () => void;
}) {
  const engine = useTimeDetectiveRun();
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

  // Keyboard controls: left/right arrow = A/B was longer; Enter/Space = Next.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") engine.answer("A");
      else if (e.key === "ArrowRight") engine.answer("B");
      else if (e.key === "Enter" || e.key === " ") engine.advance();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.answer, engine.advance]);

  if (!engine.round) return null;

  const answersDisabled = engine.phase !== "playing" || engine.stage !== "waiting";
  const showReveal = engine.phase === "roundResult";
  const feedbackClass =
    engine.phase === "roundResult" ? (engine.lastResult === "correct" ? "td-feedback-correct" : "td-feedback-wrong") : "";

  const stageLabel =
    engine.stage === "flashA"
      ? "Watch A…"
      : engine.stage === "gap"
        ? "…"
        : engine.stage === "flashB"
          ? "Watch B…"
          : "Which lasted longer?";

  return (
    <div className="overlay td-game-overlay">
      <div className="td-hud">
        <div className="hud-top" style={{ justifyContent: "flex-end" }}>
          <div className="hud-top-buttons">
            <button className="hud-icon-btn" onClick={engine.pause} disabled={answersDisabled} aria-label="Pause">
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

      <div className="td-play-area">
        <p className="td-stage-label">{stageLabel}</p>

        <div key={engine.stats.attempted} className={`td-lights-row ${feedbackClass}`}>
          <div className={`td-light ${engine.stage === "flashA" ? "td-light--on" : ""}`}>
            <span className="td-light-label">A</span>
          </div>
          <div className={`td-light ${engine.stage === "flashB" ? "td-light--on" : ""}`}>
            <span className="td-light-label">B</span>
          </div>

          {engine.phase === "roundResult" && (
            <div className={`td-points-float ${engine.lastResult === "correct" ? "td-points-float--up" : "td-points-float--down"}`}>
              {engine.lastPointsDelta > 0 ? `+${engine.lastPointsDelta}` : engine.lastPointsDelta}
            </div>
          )}
        </div>

        {showReveal && (
          <div className="td-reveal">
            <div className="td-reveal-answer">
              A: {Math.round(engine.round.durationAMs)}ms · B: {Math.round(engine.round.durationBMs)}ms
            </div>
            <p className="td-reveal-explanation">
              {engine.round.correct} lasted longer{engine.lastPicked ? ` — you picked ${engine.lastPicked}` : ""}.
            </p>
          </div>
        )}
      </div>

      {engine.phase === "roundResult" ? (
        <div className="td-next-wrap">
          <button className="btn btn--primary btn--block" onClick={engine.advance}>
            {engine.lastResult === "wrong" ? "See Results ▶" : "Next ▶"}
          </button>
        </div>
      ) : (
        <div className="td-answer-grid">
          <button className="td-answer-btn td-answer-btn--a" disabled={answersDisabled} onClick={() => engine.answer("A")}>
            A WAS LONGER
          </button>
          <button className="td-answer-btn td-answer-btn--b" disabled={answersDisabled} onClick={() => engine.answer("B")}>
            B WAS LONGER
          </button>
        </div>
      )}

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

import { useEffect, useRef } from "react";
import { useProjectileCatchRun, type ProjectileCatchRunStats } from "../../../game/systems/useProjectileCatchRun";
import { progressAt } from "../../../game/systems/projectileCatchEngine";
import { PauseMenu } from "../PauseMenu";

export interface ProjectileCatchRunResult {
  stats: ProjectileCatchRunStats;
  isNewBest: boolean;
}

export function ProjectileCatchGameScreen({ onFinished }: { onFinished: (result: ProjectileCatchRunResult) => void }) {
  const engine = useProjectileCatchRun();
  const startedRef = useRef(false);
  const ballRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      engine.startRun();
    }
    // Intentionally runs once on mount — this screen is remounted fresh per run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engine.phase === "ended") {
      onFinished({ stats: engine.stats, isNewBest: engine.isNewBest });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase]);

  // Animate the ball directly via rAF (bypassing React state) — its
  // position is a pure function of elapsed time, and it hides itself once
  // past the fog line.
  useEffect(() => {
    if (engine.phase !== "falling" || !engine.difficulty) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }
    const { flightMs, visibleFraction } = engine.difficulty;
    function tick() {
      const elapsed = performance.now() - engine.launchedAt;
      const progress = progressAt(elapsed, flightMs);
      if (ballRef.current) {
        ballRef.current.style.top = `${progress * 100}%`;
        ballRef.current.style.opacity = elapsed < flightMs * visibleFraction ? "1" : "0";
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [engine.phase, engine.launchedAt, engine.difficulty]);

  // Once revealed, show the ball resting at its true final position.
  useEffect(() => {
    if (engine.phase === "revealed" && ballRef.current) {
      ballRef.current.style.top = "100%";
      ballRef.current.style.opacity = "1";
    }
  }, [engine.phase]);

  // Keyboard: Space/Enter catches mid-flight, or advances past a reveal.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (engine.phase === "falling") engine.attemptCatch();
      else if (engine.phase === "revealed") engine.advance();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase, engine.attemptCatch, engine.advance]);

  const fogStartPercent = engine.difficulty ? engine.difficulty.visibleFraction * 100 : 100;
  const stageLabel =
    engine.phase === "falling"
      ? "Tap the instant it arrives…"
      : engine.lastResult?.success
        ? "Caught!"
        : "Missed!";

  return (
    <div className="overlay pc-game-overlay">
      <div className="pc-hud">
        <div className="hud-top" style={{ justifyContent: "flex-end" }}>
          <div className="hud-top-buttons">
            <button className="hud-icon-btn" onClick={engine.pause} aria-label="Pause">
              ⏸
            </button>
          </div>
        </div>
        <div className="hud-run-row">
          <div className="hud-pill">🔥 {engine.streak}</div>
        </div>
      </div>

      <div className="pc-play-area">
        <p className="pc-stage-label">{stageLabel}</p>

        <div className={`pc-lane ${engine.phase === "revealed" ? (engine.lastResult?.success ? "pc-feedback-correct" : "pc-feedback-wrong") : ""}`}>
          <div className="pc-fog" style={{ top: `${fogStartPercent}%` }} />
          <div className="pc-catch-zone" />
          <div className="pc-ball" ref={ballRef} />
        </div>

        {engine.phase === "revealed" && engine.lastResult && (
          <div className="pc-reveal">
            <p className="pc-reveal-detail">
              {engine.lastResult.success ? `Landed within ${engine.lastResult.errorMs}ms` : `Off by ${engine.lastResult.errorMs}ms`}
            </p>
          </div>
        )}
      </div>

      {engine.phase === "falling" && (
        <div className="pc-catch-wrap">
          <button className="btn btn--primary btn--block" onClick={engine.attemptCatch}>
            CATCH
          </button>
        </div>
      )}

      {engine.phase === "revealed" && (
        <div className="pc-catch-wrap">
          <button className="btn btn--primary btn--block" onClick={engine.advance}>
            {engine.lastResult?.success ? "Next ▶" : "See Results ▶"}
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
          onQuit={engine.quit}
        />
      )}
    </div>
  );
}

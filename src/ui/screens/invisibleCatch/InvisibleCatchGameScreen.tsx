import { useEffect, useRef } from "react";
import { useInvisibleCatchRun, type InvisibleCatchRunStats } from "../../../game/systems/useInvisibleCatchRun";
import { ballPositionAt } from "../../../game/systems/invisibleCatchEngine";
import { PauseMenu } from "../PauseMenu";

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export interface InvisibleCatchRunResult {
  score: number;
  stats: InvisibleCatchRunStats;
  isNewBest: boolean;
}

export function InvisibleCatchGameScreen({
  onFinished,
  onExitToHome,
}: {
  onFinished: (result: InvisibleCatchRunResult) => void;
  onExitToHome: () => void;
}) {
  const engine = useInvisibleCatchRun();
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
      onFinished({ score: engine.score, stats: engine.stats, isNewBest: engine.isNewBest });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase]);

  // Animate the ball directly via rAF — its position is a pure function of
  // elapsed time, and it hides itself while inside the hidden region.
  useEffect(() => {
    if (engine.phase !== "oscillating" || !engine.roundSetup) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }
    const { difficulty } = engine.roundSetup;
    function tick() {
      const elapsed = performance.now() - engine.launchedAt;
      const position = ballPositionAt(elapsed, difficulty.speed);
      if (ballRef.current) {
        ballRef.current.style.left = `${position * 100}%`;
        const hidden = position >= difficulty.hiddenStart && position <= difficulty.hiddenEnd;
        ballRef.current.style.opacity = hidden ? "0" : "1";
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [engine.phase, engine.launchedAt, engine.roundSetup]);

  // Once revealed, show the ball frozen exactly where it stopped.
  useEffect(() => {
    if (engine.phase === "revealed" && engine.lastResult && ballRef.current) {
      ballRef.current.style.left = `${engine.lastResult.ballPosition * 100}%`;
      ballRef.current.style.opacity = "1";
    }
  }, [engine.phase, engine.lastResult]);

  // Keyboard: Space/Enter stops the ball, same as tapping.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      engine.stopBall();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.stopBall]);

  if (!engine.roundSetup) return null;

  const { difficulty, targetPosition } = engine.roundSetup;
  const revealed = engine.phase === "revealed";

  return (
    <div className="overlay ic-game-overlay">
      <div className="ic-hud">
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
        </div>
      </div>

      <div className="ic-play-area" onClick={engine.stopBall}>
        <div className="ic-track-wrap">
          <div className="ic-target" style={{ left: `${targetPosition * 100}%` }}>
            <span className="ic-target-dot" />
          </div>
          <div className="ic-track">
            <div
              className={`ic-hidden-region ${revealed ? "ic-hidden-region--revealed" : ""}`}
              style={{ left: `${difficulty.hiddenStart * 100}%`, width: `${difficulty.hiddenFraction * 100}%` }}
            />
            <div className={`ic-ball ${revealed ? (engine.lastResult && engine.lastResult.points > 0 ? "ic-ball--hit" : "ic-ball--miss") : ""}`} ref={ballRef} />
          </div>
        </div>

        <div className="ic-reveal">
          {engine.lastResult ? (
            <>
              <span className={engine.lastResult.points > 0 ? "ic-reveal-good" : "ic-reveal-bad"}>
                {engine.lastResult.points > 0 ? "✓" : "✕"} {engine.lastResult.label}
              </span>
              <span className="ic-reveal-detail">
                {" "}
                Off by {engine.lastResult.errorPercent.toFixed(1)}% · +{engine.lastResult.points}
              </span>
            </>
          ) : (
            <span className="ic-reveal-placeholder">Tap to stop the ball on the target</span>
          )}
        </div>
      </div>

      <div className="ic-stop-wrap">
        <button className="btn btn--primary btn--block ic-stop-btn" onClick={engine.stopBall} disabled={engine.phase !== "oscillating"}>
          STOP
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

import { useEffect, useRef } from "react";
import { usePulseRun, type PulseRunStats } from "../../../game/systems/usePulseRun";
import { needlePositionMs, SCALE_MAX_MS } from "../../../game/systems/pulseEngine";
import { PauseMenu } from "../PauseMenu";

export interface PulseRunResult {
  stats: PulseRunStats;
  isNewBest: boolean;
}

export function PulseGameScreen({ onFinished }: { onFinished: (result: PulseRunResult) => void }) {
  const engine = usePulseRun();
  const startedRef = useRef(false);
  const needleRef = useRef<HTMLDivElement>(null);
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

  // Animate the needle directly via rAF (bypassing React state) for a
  // smooth sweep — its position is a pure function of elapsed time, so
  // there's nothing to desync by not routing it through render.
  useEffect(() => {
    if (engine.phase !== "estimating") {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }
    function tick() {
      const elapsed = performance.now() - engine.estimatingStartedAt;
      const ms = needlePositionMs(elapsed);
      if (needleRef.current) needleRef.current.style.left = `${(ms / SCALE_MAX_MS) * 100}%`;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [engine.phase, engine.estimatingStartedAt]);

  function lockIn() {
    if (engine.phase !== "estimating") return;
    const elapsed = performance.now() - engine.estimatingStartedAt;
    engine.lockEstimate(needlePositionMs(elapsed));
  }

  // Keyboard: Space/Enter locks in the estimate, or advances past a reveal.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (engine.phase === "estimating") lockIn();
      else if (engine.phase === "revealed") engine.advance();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase, engine.estimatingStartedAt, engine.advance]);

  const stageLabel =
    engine.phase === "pulsing" ? "Watch it pulse…" : engine.phase === "estimating" ? "Tap when the needle feels right" : "Reveal";

  return (
    <div className="overlay pl-game-overlay">
      <div className="pl-hud">
        <div className="hud-top" style={{ justifyContent: "flex-end" }}>
          <div className="hud-top-buttons">
            <button className="hud-icon-btn" onClick={engine.pause} aria-label="Pause">
              ⏸
            </button>
          </div>
        </div>
        <div className="hud-run-row">
          <div className="hud-pill">🏆 Best {engine.bestRoundScore}</div>
          <div className="hud-pill">🎯 {engine.attempted}</div>
        </div>
      </div>

      <div className="pl-play-area">
        <p className="pl-stage-label">{stageLabel}</p>

        <div className={`pl-circle ${engine.phase === "pulsing" ? "pl-circle--pulsing" : ""}`} />

        {(engine.phase === "estimating" || engine.phase === "revealed") && (
          <div className="pl-dial">
            <div className="pl-dial-track">
              {engine.phase === "estimating" && <div className="pl-needle" ref={needleRef} />}
              {engine.phase === "revealed" && engine.lastRound && (
                <>
                  <div className="pl-mark pl-mark--true" style={{ left: `${(engine.lastRound.trueDurationMs / SCALE_MAX_MS) * 100}%` }} />
                  <div
                    className="pl-mark pl-mark--guess"
                    style={{ left: `${(engine.lastRound.estimatedMs / SCALE_MAX_MS) * 100}%` }}
                  />
                </>
              )}
            </div>
            <div className="pl-dial-scale">
              <span>0ms</span>
              <span>{SCALE_MAX_MS}ms</span>
            </div>
          </div>
        )}

        {engine.phase === "revealed" && engine.lastRound && (
          <div className="pl-reveal">
            <div className="pl-reveal-score">{engine.lastRound.score} pts</div>
            <p className="pl-reveal-detail">
              Actual: {engine.lastRound.trueDurationMs}ms · You: {Math.round(engine.lastRound.estimatedMs)}ms · Off by{" "}
              {engine.lastRound.errorMs}ms
            </p>
          </div>
        )}
      </div>

      {engine.phase === "estimating" && (
        <div className="pl-lockin-wrap">
          <button className="btn btn--primary btn--block" onClick={lockIn}>
            LOCK IN
          </button>
        </div>
      )}

      {engine.phase === "revealed" && (
        <div className="pl-lockin-wrap">
          <button className="btn btn--primary btn--block" onClick={engine.advance}>
            Next ▶
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

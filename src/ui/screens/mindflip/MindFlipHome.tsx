import { RUSH_SESSION_SECONDS } from "../../../game/systems/mindflipEngine";
import type { MindFlipSaveData } from "../../../game/systems/MindFlipSave";

export function MindFlipHome({
  best,
  onPlay,
  onHowToPlay,
  onExit,
  onToggleReduceMotion,
  onResetProgress,
}: {
  best: MindFlipSaveData;
  onPlay: () => void;
  onHowToPlay: () => void;
  onExit: () => void;
  onToggleReduceMotion: () => void;
  onResetProgress: () => void;
}) {
  return (
    <div className="overlay overlay--opaque">
      <button className="btn btn--round btn--ghost" style={{ color: "white" }} onClick={onExit} aria-label="Back to hub">
        ←
      </button>
      <div className="menu-logo">
        <span className="emoji">🔀</span>
        <h1 className="title-xl">MindFlip</h1>
        <p className="subtitle" style={{ color: "rgba(255,255,255,0.85)" }}>
          {RUSH_SESSION_SECONDS / 60} minutes. Think fast, switch faster.
        </p>
      </div>

      <div className="card" style={{ margin: "16px auto 0", maxWidth: 320, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div className="result-row-label">Best Score</div>
            <div className="title-md">{best.bestScore}</div>
          </div>
          <div>
            <div className="result-row-label">Best Streak</div>
            <div className="title-md">{best.bestStreak}</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div className="menu-actions">
        <button className="btn btn--primary btn--block" onClick={onPlay}>
          ▶ Play
        </button>
        <button className="btn btn--ghost btn--block" style={{ color: "white" }} onClick={onHowToPlay}>
          ❓ How to Play
        </button>
        <button className="btn btn--ghost btn--block" style={{ color: "white" }} onClick={onToggleReduceMotion}>
          {best.reduceMotion ? "✓ Reduce Motion: On" : "Reduce Motion: Off"}
        </button>
        <button className="btn btn--ghost btn--block" style={{ color: "white" }} onClick={onResetProgress}>
          Reset Progress
        </button>
      </div>
    </div>
  );
}

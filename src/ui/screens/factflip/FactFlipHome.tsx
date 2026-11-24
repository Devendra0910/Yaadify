import type { FactFlipSaveData } from "../../../game/systems/FactFlipSave";

export function FactFlipHome({
  best,
  onPlay,
  onExit,
  onToggleTimePenalty,
  onResetProgress,
}: {
  best: FactFlipSaveData;
  onPlay: () => void;
  onExit: () => void;
  onToggleTimePenalty: () => void;
  onResetProgress: () => void;
}) {
  return (
    <div className="overlay overlay--opaque">
      <button className="btn btn--round btn--ghost" style={{ color: "white" }} onClick={onExit} aria-label="Back to hub">
        ←
      </button>
      <div className="menu-logo">
        <span className="emoji">✅</span>
        <h1 className="title-xl">FactFlip</h1>
        <p className="subtitle" style={{ color: "rgba(255,255,255,0.85)" }}>
          60 seconds. True or false — how far can you climb?
        </p>
      </div>

      <div className="card" style={{ margin: "16px auto 0", maxWidth: 320, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div className="result-row-label">Best Score</div>
            <div className="title-md">{best.bestScore}</div>
          </div>
          <div>
            <div className="result-row-label">Best Level</div>
            <div className="title-md">{best.bestLevel}</div>
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
        <button className="btn btn--ghost btn--block" style={{ color: "white" }} onClick={onToggleTimePenalty}>
          {best.wrongAnswerPenaltySeconds > 0 ? `✓ Wrong-answer time penalty: ${best.wrongAnswerPenaltySeconds}s` : "Wrong-answer time penalty: Off"}
        </button>
        <button className="btn btn--ghost btn--block" style={{ color: "white" }} onClick={onResetProgress}>
          Reset Progress
        </button>
      </div>
    </div>
  );
}

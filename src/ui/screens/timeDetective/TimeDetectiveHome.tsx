import type { TimeDetectiveSaveData } from "../../../game/systems/TimeDetectiveSave";

export function TimeDetectiveHome({
  best,
  onPlay,
  onExit,
  onResetProgress,
}: {
  best: TimeDetectiveSaveData;
  onPlay: () => void;
  onExit: () => void;
  onResetProgress: () => void;
}) {
  return (
    <div className="overlay overlay--opaque">
      <button className="btn btn--round btn--ghost" style={{ color: "white" }} onClick={onExit} aria-label="Back to hub">
        ←
      </button>
      <div className="menu-logo">
        <span className="emoji">⏳</span>
        <h1 className="title-xl">Time Detective</h1>
        <p className="subtitle" style={{ color: "rgba(255,255,255,0.85)" }}>
          Two flashes, one lasts longer. No clock to watch, no time limit — just one wrong guess ends the run.
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
        <button className="btn btn--ghost btn--block" style={{ color: "white" }} onClick={onResetProgress}>
          Reset Progress
        </button>
      </div>
    </div>
  );
}

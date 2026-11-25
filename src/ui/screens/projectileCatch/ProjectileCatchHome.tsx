import type { ProjectileCatchSaveData } from "../../../game/systems/ProjectileCatchSave";

export function ProjectileCatchHome({
  best,
  onPlay,
  onExit,
  onResetProgress,
}: {
  best: ProjectileCatchSaveData;
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
        <span className="emoji">⚾</span>
        <h1 className="title-xl">Projectile Catch</h1>
        <p className="subtitle" style={{ color: "rgba(255,255,255,0.85)" }}>
          Watch it fall, then tap the instant you feel it arrives — it vanishes into fog before it lands. One miss ends
          the run.
        </p>
      </div>

      <div className="card" style={{ margin: "16px auto 0", maxWidth: 320, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div className="result-row-label">Best Streak</div>
            <div className="title-md">{best.bestScore}</div>
          </div>
          <div>
            <div className="result-row-label">Closest Ever</div>
            <div className="title-md">{best.bestErrorMs === null ? "—" : `${best.bestErrorMs}ms`}</div>
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

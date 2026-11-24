import type { SaveData } from "../../game/types";

export function MainMenu({
  save,
  onPlay,
  onBack,
  onResetProgress,
}: {
  save: SaveData;
  onPlay: () => void;
  onBack: () => void;
  onResetProgress: () => void;
}) {
  return (
    <div className="overlay overlay--opaque">
      <button className="btn btn--round btn--ghost" style={{ color: "white" }} onClick={onBack}>
        ←
      </button>

      <div className="menu-logo">
        <span className="emoji">🛒</span>
        <h1 className="title-xl">MemoMart</h1>
        <p className="subtitle" style={{ color: "rgba(255,255,255,0.8)" }}>
          Memorize &amp; Shop!
        </p>
      </div>

      <div style={{ flex: 1 }} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div className="result-row-label">Best Run</div>
            <div className="title-md">Level {save.bestRunLevel}</div>
          </div>
          <div>
            <div className="result-row-label">Best Score</div>
            <div className="title-md">{save.bestRunScore}</div>
          </div>
        </div>
      </div>

      <div className="menu-actions">
        <button className="btn btn--primary btn--block" onClick={onPlay}>
          ▶ Play
        </button>
        <button
          className="btn btn--ghost btn--block"
          style={{ color: "white" }}
          onClick={onResetProgress}
        >
          Reset Progress
        </button>
      </div>
    </div>
  );
}

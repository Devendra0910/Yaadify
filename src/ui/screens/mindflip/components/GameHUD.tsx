export function GameHUD({
  modeName,
  score,
  streak,
  timerLabel,
  timerWarn,
  onPause,
}: {
  modeName: string;
  score: number;
  streak: number;
  timerLabel: string;
  timerWarn: boolean;
  onPause: () => void;
}) {
  return (
    <div className="mf-hud">
      <div className="hud-top">
        <div className="hud-pill">{modeName}</div>
        <div className="hud-top-buttons">
          <div className={`hud-pill ${timerWarn ? "hud-pill--warn" : ""}`}>⏱ {timerLabel}</div>
          <button className="hud-icon-btn" onClick={onPause} aria-label="Pause">
            ⏸
          </button>
        </div>
      </div>
      <div className="hud-run-row">
        <div className="hud-pill">⭐ {score}</div>
        <div className="hud-pill">🔥 {streak}</div>
      </div>
    </div>
  );
}

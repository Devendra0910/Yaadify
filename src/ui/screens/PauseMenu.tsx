export function PauseMenu({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="overlay overlay--dim">
      <div className="card pause-card">
        <h2 className="title-md">Paused</h2>
        <button className="btn btn--primary btn--block" onClick={onResume}>
          ▶ Resume
        </button>
        <button className="btn btn--secondary btn--block" onClick={onRestart}>
          ↺ Restart Run
        </button>
        <button className="btn btn--outline btn--block" onClick={onQuit}>
          Quit to Menu
        </button>
      </div>
    </div>
  );
}

import type { GameOverPayload } from "../../game/types";

export function GameOverScreen({
  data,
  onPlayAgain,
  onMenu,
}: {
  data: GameOverPayload;
  onPlayAgain: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="overlay overlay--dim">
      <div className="card" style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
        <span style={{ fontSize: 40 }}>💥</span>
        <h2 className="title-md">Game Over</h2>
        <p className="subtitle">3 wrong picks — that's the run!</p>

        <div className="score-big">{data.finalScore} pts</div>
        <p className="subtitle">Reached Level {data.levelReached}</p>

        {data.isNewBestScore && (
          <p className="subtitle" style={{ color: "var(--color-accent-dark)", fontWeight: 700 }}>
            New Best Score!
          </p>
        )}
        {data.isNewBestLevel && (
          <p className="subtitle" style={{ color: "var(--color-accent-dark)", fontWeight: 700 }}>
            New Best Level!
          </p>
        )}

        <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={onPlayAgain}>
          ▶ Play Again
        </button>
        <button className="btn btn--outline btn--block" style={{ marginTop: 10 }} onClick={onMenu}>
          Menu
        </button>
      </div>
    </div>
  );
}

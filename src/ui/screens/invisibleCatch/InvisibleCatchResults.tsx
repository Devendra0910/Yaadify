import type { InvisibleCatchRunStats } from "../../../game/systems/useInvisibleCatchRun";

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mf-stat-chip">
      <div className="result-row-label" style={{ marginBottom: 2 }}>
        {label}
      </div>
      <div className="title-md" style={{ fontSize: 18 }}>
        {value}
      </div>
    </div>
  );
}

export function InvisibleCatchResults({
  score,
  stats,
  bestScore,
  isNewBest,
  onReplay,
  onHome,
}: {
  score: number;
  stats: InvisibleCatchRunStats;
  bestScore: number;
  isNewBest: boolean;
  onReplay: () => void;
  onHome: () => void;
}) {
  return (
    <div className="overlay overlay--dim">
      <div className="card ic-results-card">
        <h2 className="title-md" style={{ textAlign: "center" }}>
          Invisible Catch Results
        </h2>
        <div className="score-big">{score}</div>
        {isNewBest && (
          <p className="subtitle" style={{ textAlign: "center", color: "var(--color-primary-dark)", fontWeight: 800 }}>
            🏆 New personal best!
          </p>
        )}

        <div className="result-row-group mf-stats-grid">
          <StatChip label="Rounds" value={stats.attempted} />
          <StatChip label="Highest Level" value={stats.highestLevel} />
          <StatChip label="Personal Best" value={bestScore} />
        </div>

        <div className="results-actions">
          <button className="btn btn--outline" onClick={onHome}>
            Home
          </button>
          <button className="btn btn--primary" onClick={onReplay}>
            ↺ Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

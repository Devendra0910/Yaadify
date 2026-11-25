import type { ProjectileCatchRunStats } from "../../../game/systems/useProjectileCatchRun";

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

export function ProjectileCatchResults({
  stats,
  bestScore,
  isNewBest,
  onReplay,
  onHome,
}: {
  stats: ProjectileCatchRunStats;
  bestScore: number;
  isNewBest: boolean;
  onReplay: () => void;
  onHome: () => void;
}) {
  return (
    <div className="overlay overlay--dim">
      <div className="card pc-results-card">
        <h2 className="title-md" style={{ textAlign: "center" }}>
          Projectile Catch Results
        </h2>
        <div className="score-big">{stats.streak}</div>
        {isNewBest && (
          <p className="subtitle" style={{ textAlign: "center", color: "var(--color-primary-dark)", fontWeight: 800 }}>
            🏆 New personal best!
          </p>
        )}

        <div className="result-row-group mf-stats-grid">
          <StatChip label="Catches This Run" value={stats.streak} />
          <StatChip label="Closest Ever" value={stats.bestErrorMs === null ? "—" : `${stats.bestErrorMs}ms`} />
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

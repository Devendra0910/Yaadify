import { useState } from "react";
import type { PulseRunStats } from "../../../game/systems/usePulseRun";

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

export function PulseResults({
  stats,
  bestScore,
  isNewBest,
  onReplay,
  onHome,
}: {
  stats: PulseRunStats;
  bestScore: number;
  isNewBest: boolean;
  onReplay: () => void;
  onHome: () => void;
}) {
  const [showReview, setShowReview] = useState(true);
  const worst = [...stats.rounds].sort((a, b) => b.errorMs - a.errorMs).slice(0, 5);

  return (
    <div className="overlay overlay--dim">
      <div className="card pl-results-card">
        <h2 className="title-md" style={{ textAlign: "center" }}>
          Pulse Results
        </h2>
        <div className="score-big">{stats.bestRoundScore}</div>
        {isNewBest && (
          <p className="subtitle" style={{ textAlign: "center", color: "var(--color-primary-dark)", fontWeight: 800 }}>
            🏆 New personal best!
          </p>
        )}

        <div className="result-row-group mf-stats-grid">
          <StatChip label="Rounds" value={stats.attempted} />
          <StatChip label="Avg Error" value={`${stats.averageErrorMs}ms`} />
          <StatChip label="Closest Guess" value={stats.bestErrorMs === null ? "—" : `${stats.bestErrorMs}ms`} />
          <StatChip label="Personal Best" value={bestScore} />
        </div>

        {worst.length > 0 && (
          <button
            className="btn btn--outline btn--block"
            style={{ marginTop: 12 }}
            onClick={() => setShowReview((v) => !v)}
          >
            {showReview ? "Hide" : "Review"} Worst Guesses ({worst.length})
          </button>
        )}

        {showReview && worst.length > 0 && (
          <div className="pl-review-list scroll-area">
            {worst.map((r, i) => (
              <div className="pl-review-item" key={i}>
                <p className="pl-review-meta">
                  Actual: <strong>{r.trueDurationMs}ms</strong> · You: <strong>{Math.round(r.estimatedMs)}ms</strong>
                </p>
                <p className="pl-review-explanation">
                  Off by {r.errorMs}ms — scored {r.score}
                </p>
              </div>
            ))}
          </div>
        )}

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

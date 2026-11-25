import { useState } from "react";
import type { TimeDetectiveRunStats } from "../../../game/systems/useTimeDetectiveRun";

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

export function TimeDetectiveResults({
  score,
  level,
  stats,
  bestScore,
  isNewBest,
  onReplay,
  onHome,
}: {
  score: number;
  level: number;
  stats: TimeDetectiveRunStats;
  bestScore: number;
  isNewBest: boolean;
  onReplay: () => void;
  onHome: () => void;
}) {
  const [showReview, setShowReview] = useState(true);
  const accuracy = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;

  return (
    <div className="overlay overlay--dim">
      <div className="card td-results-card">
        <h2 className="title-md" style={{ textAlign: "center" }}>
          Time Detective Results
        </h2>
        <div className="score-big">{score}</div>
        {isNewBest && (
          <p className="subtitle" style={{ textAlign: "center", color: "var(--color-primary-dark)", fontWeight: 800 }}>
            🏆 New personal best!
          </p>
        )}

        <div className="result-row-group mf-stats-grid">
          <StatChip label="Highest Level" value={level} />
          <StatChip label="Attempted" value={stats.attempted} />
          <StatChip label="Correct" value={stats.correct} />
          <StatChip label="Incorrect" value={stats.wrong} />
          <StatChip label="Accuracy" value={`${accuracy}%`} />
          <StatChip label="Best Streak" value={stats.bestStreak} />
          <StatChip label="Personal Best" value={bestScore} />
        </div>

        {stats.misses.length > 0 && (
          <button
            className="btn btn--outline btn--block"
            style={{ marginTop: 12 }}
            onClick={() => setShowReview((v) => !v)}
          >
            {showReview ? "Hide" : "Review"} Misses ({stats.misses.length})
          </button>
        )}

        {showReview && stats.misses.length > 0 && (
          <div className="td-review-list scroll-area">
            {stats.misses.map((m, i) => (
              <div className="td-review-item" key={i}>
                <p className="td-review-meta">
                  A: <strong>{Math.round(m.durationAMs)}ms</strong> · B: <strong>{Math.round(m.durationBMs)}ms</strong>
                </p>
                <p className="td-review-explanation">
                  You picked <strong>{m.picked}</strong> — <strong>{m.correct}</strong> actually lasted longer.
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

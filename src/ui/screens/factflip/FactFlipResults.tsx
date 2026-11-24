import { useState } from "react";
import type { FactFlipRunStats } from "../../../game/systems/useFactFlipRun";

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

export function FactFlipResults({
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
  stats: FactFlipRunStats;
  bestScore: number;
  isNewBest: boolean;
  onReplay: () => void;
  onHome: () => void;
}) {
  const [showReview, setShowReview] = useState(false);
  const accuracy = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;

  return (
    <div className="overlay overlay--dim">
      <div className="card ff-results-card">
        <h2 className="title-md" style={{ textAlign: "center" }}>
          FactFlip Results
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

        {stats.wrongAnswers.length > 0 && (
          <button
            className="btn btn--outline btn--block"
            style={{ marginTop: 12 }}
            onClick={() => setShowReview((v) => !v)}
          >
            {showReview ? "Hide" : "Review"} Incorrect Answers ({stats.wrongAnswers.length})
          </button>
        )}

        {showReview && (
          <div className="ff-review-list scroll-area">
            {stats.wrongAnswers.map((w, i) => (
              <div className="ff-review-item" key={i}>
                <p className="ff-review-statement">{w.question.statement}</p>
                <p className="ff-review-meta">
                  You answered <strong>{w.userAnswer ? "TRUE" : "FALSE"}</strong> — correct answer was{" "}
                  <strong>{w.question.answer ? "TRUE" : "FALSE"}</strong>.
                </p>
                <p className="ff-review-explanation">{w.question.explanation}</p>
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

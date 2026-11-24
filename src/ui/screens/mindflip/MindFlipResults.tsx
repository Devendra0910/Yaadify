import type { MindFlipRunStats } from "../../../game/systems/useMindFlipRun";

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

function encouragementFor(accuracy: number): string {
  if (accuracy >= 90) return "Sharp reflexes! That's elite-level focus. 🔥";
  if (accuracy >= 70) return "Nice focus — keep flipping and it'll get even smoother.";
  if (accuracy >= 40) return "Good effort — attention sharpens the more you play.";
  return "Everyone starts here. Play again and watch your reaction speed climb.";
}

export function MindFlipResults({
  score,
  stats,
  isNewBest,
  onReplay,
  onHome,
}: {
  score: number;
  stats: MindFlipRunStats;
  isNewBest: boolean;
  onReplay: () => void;
  onHome: () => void;
}) {
  const accuracy = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;
  const avgReaction =
    stats.reactionTimes.length > 0
      ? Math.round(stats.reactionTimes.reduce((a, b) => a + b, 0) / stats.reactionTimes.length)
      : 0;

  return (
    <div className="overlay overlay--dim">
      <div className="card" style={{ width: "100%", maxWidth: 360 }}>
        <h2 className="title-md" style={{ textAlign: "center" }}>
          Time Rush Results
        </h2>
        <div className="score-big">{score}</div>
        {isNewBest && (
          <p className="subtitle" style={{ textAlign: "center", color: "var(--color-primary-dark)", fontWeight: 800 }}>
            🏆 New personal best!
          </p>
        )}
        <p className="subtitle" style={{ textAlign: "center" }}>
          {encouragementFor(accuracy)}
        </p>

        <div className="result-row-group mf-stats-grid">
          <StatChip label="Attempted" value={stats.attempted} />
          <StatChip label="Correct" value={stats.correct} />
          <StatChip label="Accuracy" value={`${accuracy}%`} />
          <StatChip label="Avg Reaction" value={stats.reactionTimes.length > 0 ? `${avgReaction}ms` : "—"} />
          <StatChip label="Best Streak" value={stats.bestStreak} />
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

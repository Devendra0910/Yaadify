import type { PickupFeedbackPayload, RunStatsPayload, ShoppingTickPayload } from "../../game/types";

export function ShoppingHUD({
  tick,
  toast,
  runStats,
  muted,
  onPause,
  onToggleMute,
}: {
  tick: ShoppingTickPayload | null;
  toast: PickupFeedbackPayload | null;
  runStats: RunStatsPayload | null;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
}) {
  const low = (tick?.remaining ?? 99) <= 15;
  const strikesUsed = runStats?.strikesUsed ?? 0;
  const maxStrikes = runStats?.maxStrikes ?? 3;
  const livesRemaining = maxStrikes - strikesUsed;
  const correctValue = runStats?.level ?? 1;

  return (
    <div className="overlay" style={{ background: "transparent", pointerEvents: "none" }}>
      <div className="hud-top">
        <div className={`hud-pill ${low ? "hud-pill--warn" : ""}`}>⏱ {tick?.remaining ?? 0}s</div>
        <div className="hud-top-buttons">
          <button className="hud-icon-btn" onClick={onToggleMute} aria-label="Toggle sound">
            {muted ? "🔇" : "🔊"}
          </button>
          <button className="hud-icon-btn" onClick={onPause} aria-label="Pause">
            ⏸
          </button>
        </div>
      </div>

      <div className="hud-run-row">
        <div className="hud-pill">Lvl {runStats?.level ?? 1}</div>
        <div className="hud-pill">⭐ {runStats?.score ?? 0}</div>
        <div className="hud-pill">
          {Array.from({ length: maxStrikes }).map((_, i) => (
            <span key={i} style={{ opacity: i < livesRemaining ? 1 : 0.3 }}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <div className="hud-pill">
          🧺 {tick?.basketCount ?? 0} / {tick?.listSize ?? 0}
        </div>
      </div>

      {toast && (
        <div key={`${toast.productId}-${toast.outcome}`} className={`hud-toast hud-toast--${toast.outcome}`}>
          {toast.outcome === "correct" && `✓ ${toast.productName} +${correctValue}`}
          {toast.outcome === "wrong" && `✗ ${toast.productName} -1`}
          {toast.outcome === "bonus" && `⏱ ${toast.productName}`}
        </div>
      )}
    </div>
  );
}

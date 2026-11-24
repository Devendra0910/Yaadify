import type { MemorizeBeginPayload } from "../../game/types";
import { ProductIcon } from "../ProductIcon";

export function MemorizeScreen({
  data,
  remaining,
  onReady,
}: {
  data: MemorizeBeginPayload;
  remaining: number;
  onReady: () => void;
}) {
  return (
    <div className="overlay overlay--dim">
      <div className="card memorize-card">
        <div className="result-row-label">Remember this list</div>
        <h2 className="title-md">Level {data.levelId}</h2>
        <div className="memorize-timer">{remaining}s</div>

        <div className="product-list-grid">
          {data.items.map((p) => (
            <div className="product-chip" key={p.id}>
              <ProductIcon product={p} size={48} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>

        <button className="btn btn--primary btn--block" onClick={onReady}>
          I'm Ready!
        </button>
      </div>
    </div>
  );
}

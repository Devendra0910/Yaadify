import type { ProductDef } from "../../game/types";
import { ProductIcon } from "../ProductIcon";

export function ShoppingGrid({
  items,
  collectedIds,
  onCollect,
}: {
  items: ProductDef[];
  collectedIds: Set<string>;
  onCollect: (productId: string) => void;
}) {
  return (
    <div className="shopping-grid-wrap">
      <div className="shopping-grid">
        {items.map((product) => {
          const collected = collectedIds.has(product.id);
          return (
            <button
              key={product.id}
              className={`shopping-card ${collected ? "shopping-card--collected" : ""}`}
              disabled={collected}
              onClick={() => onCollect(product.id)}
            >
              <ProductIcon product={product} size={52} />
              <span>{product.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

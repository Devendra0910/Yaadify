import type { ProductDef } from "../game/types";
import { getProductIconDataUrl } from "../game/visuals/drawProductIcon";
import { hasRealArt, getProductImagePath } from "../game/data/realArt";

export function ProductIcon({ product, size = 48 }: { product: ProductDef; size?: number }) {
  const src = hasRealArt(product.id) ? getProductImagePath(product.id) : getProductIconDataUrl(product);
  return (
    <img
      src={src}
      alt={product.name}
      draggable={false}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

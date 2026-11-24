/**
 * Product ids for which a real (AI-generated, hand-picked) transparent PNG
 * exists in public/products/<id>.png. Everything else falls back to the
 * procedural canvas icon in drawProductIcon.ts, so art can be swapped in
 * incrementally without breaking products that don't have real art yet.
 */
export const REAL_ART_PRODUCT_IDS = new Set<string>([
  "milk",
  "curd",
  "ghee",
  "tomato",
  "spinach",
  "carrot",
  "lemon",
  "atta",
  "rice",
  "toor_dal",
  "moong_dal",
  "chana_dal",
  "sugar",
  "salt",
  "noodles",
  "biscuits",
  "tea",
  "coffee",
  "bread",
  "jam",
  "oil",
  "chips",
  "ketchup",
  "onion",
  "potato",
  "banana",
  "apple",
  "butter",
  "paneer",
  "soap",
  "detergent",
  "dishwash",
  "sponge",
  "tissue",
  "toothpaste",
  "shampoo",
  "toothbrush",
]);

export function hasRealArt(productId: string): boolean {
  return REAL_ART_PRODUCT_IDS.has(productId);
}

export function getProductImagePath(productId: string): string {
  return `/products/${productId}.png`;
}

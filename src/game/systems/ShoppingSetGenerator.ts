import type { LevelConfig, ProductDef } from "../types";
import { PRODUCTS } from "../data/products";

export interface ShoppingSet {
  shoppingList: ProductDef[];
  placedProducts: ProductDef[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks the set of products shown on the shopping grid for a level, biased
 * toward fewer categories at higher similarityBias so distractors look more
 * like the target items (harder to tell apart at a glance).
 */
function pickCandidateProducts(cfg: LevelConfig): ProductDef[] {
  const categories = Array.from(new Set(PRODUCTS.map((p) => p.category)));
  const categoriesUsed = Math.max(2, Math.round(categories.length * (1 - cfg.similarityBias * 0.6)));
  const chosenCategories = shuffle(categories).slice(0, categoriesUsed);

  const pool = shuffle(PRODUCTS.filter((p) => chosenCategories.includes(p.category)));
  const extraPool = shuffle(PRODUCTS.filter((p) => !chosenCategories.includes(p.category)));
  return [...pool, ...extraPool].slice(0, Math.min(cfg.totalProducts, PRODUCTS.length));
}

export function generateShoppingSet(cfg: LevelConfig): ShoppingSet {
  const placedProducts = shuffle(pickCandidateProducts(cfg));
  const listSize = Math.min(cfg.listSize, placedProducts.length);
  const shoppingList = shuffle(placedProducts).slice(0, listSize);
  return { shoppingList, placedProducts };
}

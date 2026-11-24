export type ProductCategory =
  | "dairy"
  | "produce"
  | "grains"
  | "packaged"
  | "household"
  | "personal";

export type ProductShape =
  | "bottle"
  | "sack"
  | "box"
  | "pouch"
  | "bar"
  | "tube"
  | "round"
  | "banana"
  | "leafy"
  | "carrot"
  | "toothbrush";

export interface ProductDef {
  id: string;
  name: string;
  category: ProductCategory;
  shape: ProductShape;
  colors: string[];
}

export interface LevelConfig {
  id: number;
  name: string;
  listSize: number;
  memorizeTime: number;
  totalProducts: number;
  aisles: number;
  gridCols: number;
  gridRows: number;
  timeLimit: number;
  similarityBias: number;
}

export interface MemorizeBeginPayload {
  levelId: number;
  items: ProductDef[];
  memorizeTime: number;
}

export interface ShoppingBeginPayload {
  timeLimit: number;
  items: ProductDef[];
}

export interface ShoppingTickPayload {
  remaining: number;
  basketCount: number;
  listSize: number;
}

export interface PickupFeedbackPayload {
  productId: string;
  productName: string;
  outcome: "correct" | "wrong" | "bonus";
}

export interface RunStatsPayload {
  level: number;
  score: number;
  strikesUsed: number;
  maxStrikes: number;
}

export interface GameOverPayload {
  finalScore: number;
  levelReached: number;
  isNewBestScore: boolean;
  isNewBestLevel: boolean;
}

export interface SaveData {
  bestRunLevel: number;
  bestRunScore: number;
  totalXp: number;
}

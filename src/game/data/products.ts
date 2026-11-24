import type { ProductDef } from "../types";

export const PRODUCTS: ProductDef[] = [
  // Dairy
  { id: "milk", name: "Milk", category: "dairy", shape: "pouch", colors: ["#f5f5f0", "#3b7bd6"] },
  { id: "curd", name: "Curd", category: "dairy", shape: "box", colors: ["#ffffff", "#e8c84a"] },
  { id: "paneer", name: "Paneer", category: "dairy", shape: "box", colors: ["#fff8e6", "#d99a2b"] },
  { id: "butter", name: "Butter", category: "dairy", shape: "box", colors: ["#fde98b", "#c7881f"] },
  { id: "ghee", name: "Ghee", category: "dairy", shape: "bottle", colors: ["#f2c230", "#8a5a1b"] },

  // Produce
  { id: "tomato", name: "Tomato", category: "produce", shape: "round", colors: ["#e4432b", "#3f8a3f"] },
  { id: "onion", name: "Onion", category: "produce", shape: "round", colors: ["#b5651d", "#7a4a16"] },
  { id: "potato", name: "Potato", category: "produce", shape: "round", colors: ["#c9a06a", "#8a6a3f"] },
  { id: "banana", name: "Banana", category: "produce", shape: "banana", colors: ["#f3d13a", "#8a6a1b"] },
  { id: "apple", name: "Apple", category: "produce", shape: "round", colors: ["#d13a3a", "#3f8a3f"] },
  { id: "spinach", name: "Spinach", category: "produce", shape: "leafy", colors: ["#3f8a3f", "#2a5c2a"] },
  { id: "carrot", name: "Carrot", category: "produce", shape: "carrot", colors: ["#e07a2b", "#3f8a3f"] },
  { id: "lemon", name: "Lemon", category: "produce", shape: "round", colors: ["#e8d93a", "#8a9a3a"] },

  // Grains & pulses
  { id: "atta", name: "Flour", category: "grains", shape: "sack", colors: ["#e8c784", "#8a5a2b"] },
  { id: "rice", name: "Rice", category: "grains", shape: "sack", colors: ["#f5f0e0", "#9a7a4a"] },
  { id: "toor_dal", name: "Toor Dal", category: "grains", shape: "sack", colors: ["#e8b84a", "#8a6a1b"] },
  { id: "moong_dal", name: "Moong Dal", category: "grains", shape: "sack", colors: ["#c9d94a", "#6a7a1b"] },
  { id: "chana_dal", name: "Chana Dal", category: "grains", shape: "sack", colors: ["#e8d08a", "#8a6a2b"] },
  { id: "sugar", name: "Sugar", category: "grains", shape: "sack", colors: ["#ffffff", "#9a9a9a"] },
  { id: "salt", name: "Salt", category: "grains", shape: "pouch", colors: ["#f0f0f5", "#4a6a9a"] },

  // Packaged groceries
  { id: "noodles", name: "Noodles", category: "packaged", shape: "pouch", colors: ["#f2c230", "#d13a2b"] },
  { id: "biscuits", name: "Biscuit", category: "packaged", shape: "box", colors: ["#e8a93a", "#6a3a1b"] },
  { id: "tea", name: "Tea", category: "packaged", shape: "box", colors: ["#8a3a2b", "#e8c784"] },
  { id: "coffee", name: "Coffee", category: "packaged", shape: "bottle", colors: ["#5a3a2b", "#c7881f"] },
  { id: "bread", name: "Bread", category: "packaged", shape: "box", colors: ["#e8c784", "#b5651d"] },
  { id: "jam", name: "Jam", category: "packaged", shape: "bottle", colors: ["#9a2b4a", "#e8c784"] },
  { id: "oil", name: "Cooking Oil", category: "packaged", shape: "bottle", colors: ["#e8d08a", "#2b6a3a"] },
  { id: "chips", name: "Chips", category: "packaged", shape: "pouch", colors: ["#e8a93a", "#3a6a2b"] },
  { id: "ketchup", name: "Ketchup", category: "packaged", shape: "bottle", colors: ["#d13a2b", "#2b2b2b"] },

  // Household
  { id: "soap", name: "Soap", category: "household", shape: "bar", colors: ["#7ac9e0", "#2b6a9a"] },
  { id: "detergent", name: "Washing Powder", category: "household", shape: "box", colors: ["#3a6ab5", "#e8c784"] },
  { id: "dishwash", name: "Dish Soap", category: "household", shape: "bottle", colors: ["#3a9a6a", "#e8c784"] },
  { id: "sponge", name: "Sponge", category: "household", shape: "box", colors: ["#e8d08a", "#3a9a6a"] },
  { id: "tissue", name: "Tissue", category: "household", shape: "box", colors: ["#f5f5f0", "#3a6ab5"] },

  // Personal care
  { id: "toothpaste", name: "Toothpaste", category: "personal", shape: "tube", colors: ["#2b6a9a", "#f5f5f0"] },
  { id: "shampoo", name: "Shampoo", category: "personal", shape: "bottle", colors: ["#9a2b8a", "#e8c784"] },
  { id: "toothbrush", name: "Toothbrush", category: "personal", shape: "toothbrush", colors: ["#3a9ad9", "#e8e8e8"] },
];

export function getProductById(id: string): ProductDef {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown product id: ${id}`);
  return p;
}

export function productsByCategory(category: ProductDef["category"]): ProductDef[] {
  return PRODUCTS.filter((p) => p.category === category);
}

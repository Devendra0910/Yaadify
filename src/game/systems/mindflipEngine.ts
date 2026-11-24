// Pure game logic for MindFlip — a Stroop-style "do these two boxes match"
// game. No React/DOM here, so it's easy to unit-test and reuse if more
// Stroop-style mini-games get added later.

export type ColorName = "RED" | "BLUE" | "GREEN" | "YELLOW" | "BROWN" | "PINK" | "BLACK" | "WHITE";
export type Attribute = "WORD" | "INK";
/** Which attribute of box 1 is compared against which attribute of box 2 —
 * e.g. "INK_WORD" means "does box 1's ink colour match box 2's word?" */
export type MindFlipRule = "WORD_WORD" | "INK_INK" | "INK_WORD" | "WORD_INK";
export type DifficultyTier = "beginner" | "intermediate" | "advanced" | "expert";

export interface MindFlipQuestion {
  rule: MindFlipRule;
  /** Which attribute is the one being judged on each box — shown as a
   * header right above that box so the comparison is never ambiguous. */
  box1Attr: Attribute;
  box2Attr: Attribute;
  box1Word: ColorName;
  box1Ink: ColorName;
  box2Word: ColorName;
  box2Ink: ColorName;
  isMatch: boolean;
}

/** Full palette, roughly easiest-to-hardest to tell apart. */
export const ALL_COLORS: ColorName[] = ["RED", "BLUE", "GREEN", "YELLOW", "BROWN", "PINK", "BLACK", "WHITE"];

/** The base pair every difficulty tier starts from — two possible words,
 * two possible ink colours, so switching rules is about attention and
 * speed rather than scanning a big palette. Higher tiers widen this. */
export const GAME_COLORS: ColorName[] = ["RED", "BLUE"];

/**
 * Colourblind-friendly shades (leaning on the Okabe–Ito palette, the
 * standard reference for distinguishability under protanopia/deuteranopia).
 * RED leans toward vermillion and GREEN toward teal specifically so the two
 * most commonly confused hues stay visually distinct from each other.
 */
export const COLOR_HEX: Record<ColorName, string> = {
  RED: "#D55E00",
  BLUE: "#0072B2",
  GREEN: "#009E73",
  YELLOW: "#E8B600",
  BROWN: "#7A4A1E",
  PINK: "#CC79A7",
  BLACK: "#1A1A1A",
  WHITE: "#FFFFFF",
};

const ALL_RULES: MindFlipRule[] = ["WORD_WORD", "INK_INK", "INK_WORD", "WORD_INK"];

function parseRule(rule: MindFlipRule): [Attribute, Attribute] {
  const [left, right] = rule.split("_") as [Attribute, Attribute];
  return [left, right];
}

interface DifficultyConfig {
  tier: DifficultyTier;
  colors: ColorName[];
  rules: MindFlipRule[];
  /** Chance the next rule differs from the previous one. */
  switchiness: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyTier, DifficultyConfig> = {
  // Same-attribute comparisons only, and just the two highest-contrast
  // colours — the gentlest introduction.
  beginner: {
    tier: "beginner",
    colors: ALL_COLORS.slice(0, 2),
    rules: ["WORD_WORD", "INK_INK"],
    switchiness: 0.35,
  },
  // Introduces one cross-attribute comparison and two more colours.
  intermediate: {
    tier: "intermediate",
    colors: ALL_COLORS.slice(0, 4),
    rules: ["WORD_WORD", "INK_INK", "INK_WORD"],
    switchiness: 0.55,
  },
  // All four comparisons, six colours.
  advanced: { tier: "advanced", colors: ALL_COLORS.slice(0, 6), rules: ALL_RULES, switchiness: 0.75 },
  // The full eight-colour palette.
  expert: { tier: "expert", colors: ALL_COLORS, rules: ALL_RULES, switchiness: 0.95 },
};

/** Running counters so question generation balances itself across a session
 * instead of drifting toward whichever rule/colour/outcome Math.random()
 * favors. */
export interface MindFlipGenState {
  ruleCounts: Record<MindFlipRule, number>;
  colorCounts: Record<ColorName, number>;
  matchCounts: { match: number; mismatch: number };
  lastRule: MindFlipRule | null;
}

export function createGenState(): MindFlipGenState {
  return {
    ruleCounts: { WORD_WORD: 0, INK_INK: 0, INK_WORD: 0, WORD_INK: 0 },
    colorCounts: { RED: 0, BLUE: 0, GREEN: 0, YELLOW: 0, BROWN: 0, PINK: 0, BLACK: 0, WHITE: 0 },
    matchCounts: { match: 0, mismatch: 0 },
    lastRule: null,
  };
}

function weightedPick<T extends string>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

function pickRule(config: DifficultyConfig, state: MindFlipGenState): MindFlipRule {
  if (config.rules.length === 1) return config.rules[0]!;
  const weights = config.rules.map((r) => {
    const w = 1 / (state.ruleCounts[r] + 1);
    return r === state.lastRule ? w * (1 - config.switchiness) : w;
  });
  return weightedPick(config.rules, weights);
}

function pickColor(colors: ColorName[], state: MindFlipGenState): ColorName {
  const weights = colors.map((c) => 1 / (state.colorCounts[c] + 1));
  return weightedPick(colors, weights);
}

/** Balances match vs. mismatch roughly 50/50 across a session instead of
 * letting a plain coin flip drift toward one outcome for a while. */
function pickWantMatch(state: MindFlipGenState): boolean {
  const weights = [1 / (state.matchCounts.match + 1), 1 / (state.matchCounts.mismatch + 1)];
  return weightedPick(["match", "mismatch"], weights) === "match";
}

export function generateQuestion(config: DifficultyConfig, state: MindFlipGenState): MindFlipQuestion {
  const rule = pickRule(config, state);
  const [leftAttr, rightAttr] = parseRule(rule);
  const colors = config.colors;

  const box1Word = pickColor(colors, state);
  const box1Ink = pickColor(colors, state);
  const wantMatch = pickWantMatch(state);

  const leftValue = leftAttr === "WORD" ? box1Word : box1Ink;
  const rightValue = wantMatch ? leftValue : colors.find((c) => c !== leftValue)!;

  let box2Word: ColorName;
  let box2Ink: ColorName;
  if (rightAttr === "WORD") {
    box2Word = rightValue;
    box2Ink = pickColor(colors, state);
  } else {
    box2Ink = rightValue;
    box2Word = pickColor(colors, state);
  }

  state.ruleCounts[rule]++;
  state.lastRule = rule;
  state.matchCounts[wantMatch ? "match" : "mismatch"]++;
  for (const c of [box1Word, box1Ink, box2Word, box2Ink]) state.colorCounts[c]++;

  return { rule, box1Attr: leftAttr, box2Attr: rightAttr, box1Word, box1Ink, box2Word, box2Ink, isMatch: wantMatch };
}

/** Builds a single demo question for the tutorial, forcing a specific rule
 * and a specific match/mismatch outcome. */
export function buildTutorialQuestion(rule: MindFlipRule, isMatch: boolean): MindFlipQuestion {
  const [a, b] = GAME_COLORS as [ColorName, ColorName];
  const [leftAttr, rightAttr] = parseRule(rule);
  const box1Word = a;
  const box1Ink = b;
  const leftValue = leftAttr === "WORD" ? box1Word : box1Ink;
  const rightValue = isMatch ? leftValue : leftValue === a ? b : a;

  let box2Word: ColorName;
  let box2Ink: ColorName;
  if (rightAttr === "WORD") {
    box2Word = rightValue;
    box2Ink = a;
  } else {
    box2Ink = rightValue;
    box2Word = a;
  }

  return { rule, box1Attr: leftAttr, box2Attr: rightAttr, box1Word, box1Ink, box2Word, box2Ink, isMatch };
}

export function difficultyForRush(streak: number): DifficultyTier {
  if (streak < 4) return "intermediate";
  if (streak < 10) return "advanced";
  return "expert";
}

export const RUSH_SESSION_SECONDS = 120;

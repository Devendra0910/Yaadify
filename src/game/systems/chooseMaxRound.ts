export interface ChooseMaxOption {
  label: string;
  value: number;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickDistinctValues(count: number, min: number, max: number): number[] {
  const values = new Set<number>();
  // max-min range is always kept well above `count` by the caller, so this
  // terminates quickly in practice.
  while (values.size < count) {
    values.add(randInt(min, max));
  }
  return Array.from(values);
}

/**
 * Builds one round of 2 choices: plain numbers early on, increasingly
 * replaced by simple +/- expressions as the round number grows, so telling
 * the greater value apart takes actual mental math rather than just reading
 * digits. Values are always distinct, so there's exactly one correct answer.
 *
 * Difficulty ramps twice as fast per level as it used to — what used to be
 * level 20/40 now shows up at level 10/20.
 */
export function generateRound(round: number): ChooseMaxOption[] {
  const spread = 12 + round * 10;
  const values = pickDistinctValues(2, 3, spread);
  const exprChance = Math.min(0.85, 0.1 + round * 0.16);

  const options = values.map((value) => {
    if (Math.random() < exprChance) {
      if (Math.random() < 0.5) {
        const a = randInt(1, value - 1);
        const b = value - a;
        return { label: `${a} + ${b}`, value };
      }
      const b = randInt(1, spread);
      const a = value + b;
      return { label: `${a} − ${b}`, value };
    }
    return { label: String(value), value };
  });

  // Shuffle display order so the max isn't predictably positioned.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  return options;
}

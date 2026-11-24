// Turns the verified reference tables in factflipWorldData.ts into large,
// reliable batches of True/False FactFlip questions. Each row only needs to
// be checked once; the template (and a deterministic "pick a different
// value" rule for the false version) takes care of correctness from there.
// This is the mechanism for scaling the bank into the thousands without
// hand-authoring every individual statement.

import {
  COUNTRIES,
  INDIAN_STATE_CAPITALS,
  US_STATE_CAPITALS,
  CHEMICAL_ELEMENTS,
  ADDITIONAL_CHEMICAL_ELEMENTS,
  ANIMAL_GROUP_NAMES,
  BODY_ORGAN_FUNCTIONS,
  SCIENTIST_DISCOVERIES,
  PLANETS,
  LANDMARK_COUNTRIES,
  FOOTBALL_WORLD_CUP_WINNERS,
  CRICKET_WORLD_CUP_WINNERS,
  OLYMPIC_HOST_CITIES,
  PAINTING_ARTISTS,
  BOOK_AUTHORS,
  DINOSAURS,
  COUNTRY_LANGUAGES,
  RIVER_COUNTRIES,
  MOUNTAIN_COUNTRIES,
  OLYMPIC_SPORT_SEASONS,
  INSTRUMENT_FAMILIES,
  COUNTRY_INDEPENDENCE_YEARS,
  type NamePairFact,
} from "./factflipWorldData";
import type { FactFlipCategory, FactFlipQuestion } from "./factflipQuestions";

function cyclicTier(index: number, tierOptions: number[]): number {
  return tierOptions[index % tierOptions.length]!;
}

/** Generic [a, b] pair -> True/False question builder. The false version
 * pairs `a` with some OTHER row's `b` (picked deterministically, skipping
 * forward until it finds a genuinely different value — important for
 * tables where several rows legitimately share a value, like a shared
 * currency or dinosaur period). */
function buildPairQuestions(
  pairs: NamePairFact[],
  category: FactFlipCategory,
  idPrefix: string,
  tierFor: (index: number) => number,
  trueStatement: (a: string, b: string) => string,
  falseStatement: (a: string, wrongB: string) => string,
  explanation: (a: string, b: string) => string,
  distractors?: readonly string[],
): FactFlipQuestion[] {
  const wrongValues = distractors ?? pairs.map(({ b }) => b);
  const out: FactFlipQuestion[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const { a, b } = pairs[i]!;
    const tier = tierFor(i);

    out.push({
      id: `${idPrefix}-${i}-t`,
      tier,
      category,
      statement: trueStatement(a, b),
      answer: true,
      explanation: explanation(a, b),
    });

    let wrongB = b;
    for (let step = 0; step < wrongValues.length && wrongB === b; step++) {
      wrongB = wrongValues[(i + 11 + step) % wrongValues.length]!;
    }
    if (wrongB === b) continue;

    out.push({
      id: `${idPrefix}-${i}-f`,
      tier,
      category,
      statement: falseStatement(a, wrongB),
      answer: false,
      explanation: explanation(a, b),
    });
  }
  return out;
}

// Geographic and legal relationships can have more than one valid answer.
// For those batches, pass distractors that are known to be wrong for the
// selected subjects instead of borrowing arbitrary values from other rows.
function buildTopicQuestions(
  pairs: NamePairFact[],
  category: FactFlipCategory,
  idPrefix: string,
  tiers: number[],
  statement: (a: string, b: string) => string,
  distractors?: readonly string[],
): FactFlipQuestion[] {
  return buildPairQuestions(
    pairs, category, idPrefix, (i) => cyclicTier(i, tiers),
    statement, statement, statement, distractors,
  );
}

function ordinal(n: number): string {
  const words = ["zeroth", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
  return words[n] ?? `${n}th`;
}

function generateAll(): FactFlipQuestion[] {
  const out: FactFlipQuestion[] = [];

  // Country facts — capital, continent, and currency — spread evenly across all tiers.
  out.push(
    ...buildPairQuestions(
      COUNTRIES.map((c) => ({ a: c.country, b: c.capital })),
      "world",
      "gen-capital",
      (i) => cyclicTier(i, [1, 2, 3, 4, 5, 6]),
      (a, b) => `${b} is the capital of ${a}.`,
      (a, b) => `${b} is the capital of ${a}.`,
      (a, b) => `${b} is the capital of ${a}.`,
    ),
  );
  out.push(
    ...buildPairQuestions(
      COUNTRIES.map((c) => ({ a: c.country, b: c.continent })),
      "geography",
      "gen-continent",
      (i) => cyclicTier(i, [1, 2, 3, 4, 5, 6]),
      (a, b) => `${a} is located in ${b}.`,
      (a, b) => `${a} is located in ${b}.`,
      (a, b) => `${a} is located in ${b}.`,
    ),
  );
  out.push(
    ...buildPairQuestions(
      COUNTRIES.map((c) => ({ a: c.country, b: c.currency })),
      "world",
      "gen-currency",
      (i) => cyclicTier(i, [2, 3, 4, 5, 6]),
      (a, b) => `The ${b} is used as currency in ${a}.`,
      (a, b) => `The ${b} is used as currency in ${a}.`,
      (a, b) => `${a}'s currency is the ${b}.`,
    ),
  );

  // Indian and US state capitals.
  out.push(
    ...buildPairQuestions(
      INDIAN_STATE_CAPITALS,
      "indian",
      "gen-instate",
      (i) => cyclicTier(i, [1, 2, 3, 4]),
      (a, b) => `${b} is the capital of ${a}.`,
      (a, b) => `${b} is the capital of ${a}.`,
      (a, b) => `${b} is the capital of ${a}.`,
    ),
  );
  out.push(
    ...buildPairQuestions(
      US_STATE_CAPITALS,
      "world",
      "gen-usstate",
      (i) => cyclicTier(i, [2, 3, 4, 5]),
      (a, b) => `${b} is the capital of the US state of ${a}.`,
      (a, b) => `${b} is the capital of the US state of ${a}.`,
      (a, b) => `${b} is the capital of the US state of ${a}.`,
    ),
  );

  // Chemical elements.
  out.push(
    ...buildPairQuestions(
      CHEMICAL_ELEMENTS.map((e) => ({ a: e.symbol, b: e.name })),
      "science",
      "gen-element",
      (i) => cyclicTier(i, [3, 4, 5, 6]),
      (a, b) => `The chemical symbol "${a}" stands for ${b}.`,
      (a, b) => `The chemical symbol "${a}" stands for ${b}.`,
      (a, b) => `The chemical symbol "${a}" stands for ${b}.`,
    ),
  );

  // Animal collective nouns.
  out.push(
    ...buildPairQuestions(
      ANIMAL_GROUP_NAMES,
      "animals",
      "gen-animalgroup",
      (i) => cyclicTier(i, [2, 3, 4, 5]),
      (a, b) => `A group of ${a.toLowerCase()} is called a ${b}.`,
      (a, b) => `A group of ${a.toLowerCase()} is called a ${b}.`,
      (a, b) => `A group of ${a.toLowerCase()} is traditionally called a "${b}."`,
    ),
  );

  // Body organ functions.
  out.push(
    ...buildPairQuestions(
      BODY_ORGAN_FUNCTIONS,
      "body",
      "gen-organ",
      (i) => cyclicTier(i, [1, 2, 3]),
      (a, b) => `One main job of ${a} is ${b}.`,
      (a, b) => `One main job of ${a} is ${b}.`,
      (a, b) => `${a.charAt(0).toUpperCase()}${a.slice(1)} is mainly responsible for ${b}.`,
    ),
  );

  // Famous scientists and their discoveries.
  out.push(
    ...buildPairQuestions(
      SCIENTIST_DISCOVERIES,
      "science",
      "gen-scientist",
      (i) => cyclicTier(i, [2, 3, 4, 5, 6]),
      (a, b) => `${a} is best known for ${b}.`,
      (a, b) => `${a} is best known for ${b}.`,
      (a, b) => `${a} is best known for ${b}.`,
    ),
  );

  // Planets' order from the Sun.
  out.push(
    ...buildPairQuestions(
      PLANETS.map((p) => ({ a: p.name, b: ordinal(p.order) })),
      "space",
      "gen-planet",
      (i) => cyclicTier(i, [1, 2]),
      (a, b) => `${a} is the ${b} planet from the Sun.`,
      (a, b) => `${a} is the ${b} planet from the Sun.`,
      (a, b) => `${a} is the ${b} planet from the Sun.`,
    ),
  );

  // Famous landmarks and their countries.
  out.push(
    ...buildPairQuestions(
      LANDMARK_COUNTRIES,
      "world",
      "gen-landmark",
      (i) => cyclicTier(i, [1, 2, 3]),
      (a, b) => `${a} is located in ${b}.`,
      (a, b) => `${a} is located in ${b}.`,
      (a, b) => `${a} is located in ${b}.`,
    ),
  );

  // Football and cricket World Cup winners by year.
  out.push(
    ...buildPairQuestions(
      FOOTBALL_WORLD_CUP_WINNERS.map((x) => ({ a: String(x.year), b: x.winner })),
      "sports",
      "gen-fifa",
      (i) => cyclicTier(i, [3, 4, 5, 6]),
      (a, b) => `${b} won the FIFA Football World Cup in ${a}.`,
      (a, b) => `${b} won the FIFA Football World Cup in ${a}.`,
      (a, b) => `${b} won the FIFA Football World Cup in ${a}.`,
    ),
  );
  out.push(
    ...buildPairQuestions(
      CRICKET_WORLD_CUP_WINNERS.map((x) => ({ a: String(x.year), b: x.winner })),
      "sports",
      "gen-cricketwc",
      (i) => cyclicTier(i, [3, 4, 5, 6]),
      (a, b) => `${b} won the Cricket World Cup in ${a}.`,
      (a, b) => `${b} won the Cricket World Cup in ${a}.`,
      (a, b) => `${b} won the Cricket World Cup in ${a}.`,
    ),
  );

  // Olympic host cities by year.
  out.push(
    ...buildPairQuestions(
      OLYMPIC_HOST_CITIES.map((x) => ({ a: String(x.year), b: x.city })),
      "sports",
      "gen-olympics",
      (i) => cyclicTier(i, [3, 4, 5, 6]),
      (a, b) => `${b} hosted the Summer Olympics in ${a}.`,
      (a, b) => `${b} hosted the Summer Olympics in ${a}.`,
      (a, b) => `${b} hosted the Summer Olympics in ${a}.`,
    ),
  );

  // Famous paintings and books.
  out.push(
    ...buildPairQuestions(
      PAINTING_ARTISTS,
      "world",
      "gen-painting",
      (i) => cyclicTier(i, [3, 4, 5, 6]),
      (a, b) => `${a} was painted by ${b}.`,
      (a, b) => `${a} was painted by ${b}.`,
      (a, b) => `${a} was painted by ${b}.`,
    ),
  );
  out.push(
    ...buildPairQuestions(
      BOOK_AUTHORS,
      "world",
      "gen-book",
      (i) => cyclicTier(i, [2, 3, 4, 5]),
      (a, b) => `${a} was written by ${b}.`,
      (a, b) => `${a} was written by ${b}.`,
      (a, b) => `${a} was written by ${b}.`,
    ),
  );

  // Dinosaurs and their geological period.
  out.push(
    ...buildPairQuestions(
      DINOSAURS.map((d) => ({ a: d.name, b: d.period })),
      "science",
      "gen-dino",
      (i) => cyclicTier(i, [3, 4, 5, 6]),
      (a, b) => `${a} lived during the ${b} period.`,
      (a, b) => `${a} lived during the ${b} period.`,
      (a, b) => `${a} lived during the ${b} period.`,
    ),
  );

  out.push(
    ...buildTopicQuestions(
      COUNTRY_LANGUAGES, "world", "gen-language", [1, 2, 3, 4, 5, 6],
      (country, language) => `${language} is an official or national language of ${country}.`,
      ["Icelandic", "Dhivehi", "Dzongkha", "Lao"],
    ),
    ...buildTopicQuestions(
      RIVER_COUNTRIES, "geography", "gen-river", [1, 2, 3, 4, 5, 6],
      (river, country) => `${river} flows through or along the border of ${country}.`,
      ["Iceland", "New Zealand", "Madagascar", "Japan"],
    ),
    ...buildTopicQuestions(
      MOUNTAIN_COUNTRIES, "geography", "gen-mountain", [1, 2, 3, 4, 5, 6],
      (mountain, country) => `${mountain} is located in or on the border of ${country}.`,
      ["Iceland", "Madagascar", "Sri Lanka", "Ireland"],
    ),
    ...buildTopicQuestions(
      OLYMPIC_SPORT_SEASONS, "sports", "gen-olympic-sport", [1, 2, 3, 4],
      (sport, season) => `${sport} is contested at the ${season} Olympics.`,
    ),
    ...buildTopicQuestions(
      INSTRUMENT_FAMILIES, "world", "gen-instrument", [1, 2, 3, 4],
      (instrument, family) => `${instrument} belongs to the ${family} family of instruments.`,
    ),
    ...buildTopicQuestions(
      COUNTRY_INDEPENDENCE_YEARS.map(({ event, year }) => ({ a: event, b: String(year) })),
      "history", "gen-independence", [2, 3, 4, 5, 6],
      (event, year) => `${event} in ${year}.`,
    ),
    ...buildTopicQuestions(
      ADDITIONAL_CHEMICAL_ELEMENTS.map(({ symbol, name }) => ({ a: symbol, b: name })),
      "science", "gen-element-extra", [3, 4, 5, 6],
      (symbol, name) => `The chemical symbol "${symbol}" stands for ${name}.`,
    ),
    ...buildTopicQuestions(
      [...CHEMICAL_ELEMENTS, ...ADDITIONAL_CHEMICAL_ELEMENTS]
        .filter(({ atomicNumber }) => atomicNumber <= 66)
        .sort((a, b) => a.atomicNumber - b.atomicNumber)
        .map(({ name, atomicNumber }) => ({ a: name, b: String(atomicNumber) })),
      "science", "gen-atomic-number", [1, 2, 3, 4, 5, 6],
      (element, number) => `${element} has atomic number ${number}.`,
    ),
  );

  return out;
}

export const GENERATED_QUESTIONS: FactFlipQuestion[] = generateAll();

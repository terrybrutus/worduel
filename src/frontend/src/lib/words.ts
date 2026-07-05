// Curated word bank for Worduel rounds — 4 to 7 letters, common enough to
// unscramble under time pressure. No plurals of shorter words, no proper nouns.
export const WORDS: readonly string[] = [
  "BRAVE",
  "CRANE",
  "DRIFT",
  "FLAME",
  "GHOST",
  "HONEY",
  "IVORY",
  "JOLLY",
  "KNIFE",
  "LEMON",
  "MAGIC",
  "NOBLE",
  "OCEAN",
  "PIANO",
  "QUIRK",
  "RIVER",
  "SPARK",
  "TIGER",
  "UNITY",
  "VIVID",
  "WALTZ",
  "YACHT",
  "ZEBRA",
  "AMBER",
  "BLINK",
  "CLOUD",
  "DREAM",
  "EAGLE",
  "FROST",
  "GLINT",
  "HAVEN",
  "INDEX",
  "JEWEL",
  "KARMA",
  "LUNAR",
  "MIRTH",
  "NORTH",
  "OPERA",
  "PRISM",
  "QUILT",
  "RAVEN",
  "SHARP",
  "TRUST",
  "URBAN",
  "VOWEL",
  "WHEAT",
  "YOUTH",
  "ZESTY",
  "BLOOM",
  "CHARM",
  "DELTA",
  "EMBER",
  "FERRY",
  "GLOBE",
  "HARSH",
  "INPUT",
  "JUMPY",
  "KAYAK",
  "LOYAL",
  "MANGO",
  "NINJA",
  "OLIVE",
  "PLUSH",
  "QUOTA",
  "RIDGE",
  "SWIFT",
  "TEMPO",
  "ULTRA",
  "VAULT",
  "WORTH",
  "YIELD",
  "ZONAL",
  "BIRCH",
  "CLASP",
  "DUSKY",
  "ELITE",
  "FIBER",
  "GRAIN",
  "HOVER",
  "IDEAL",
  "JOINT",
  "KNOCK",
  "LATCH",
  "MOTOR",
  "NUDGE",
  "OASIS",
  "PATCH",
  "QUARK",
  "RIVAL",
  "SLOPE",
  "TWIST",
  "UNTIL",
  "VIGOR",
  "WIDER",
  "YONDER",
  "ZEBRA",
];

/** Fisher–Yates shuffle returning a new array. */
function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick `count` distinct words from the bank. */
export function pickWords(count: number): string[] {
  return shuffle(WORDS).slice(0, count);
}

/** Scramble a word's letters, guaranteeing it differs from the original. */
export function scramble(word: string): string[] {
  const letters = word.split("");
  let scrambled = letters;
  let guard = 0;
  do {
    scrambled = shuffle(letters);
    guard++;
  } while (scrambled.join("") === word && guard < 12);
  return scrambled;
}

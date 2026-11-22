import dictionary from "worduel-dictionary";

export type WordLength = 5 | 6 | 7;
export const LONGER_ANSWERS: Record<6 | 7, readonly string[]> = {
  6: [
    "planet",
    "garden",
    "bridge",
    "silver",
    "castle",
    "stream",
    "forest",
    "bright",
    "puzzle",
    "orange",
    "travel",
    "friend",
    "bottle",
    "winter",
    "summer",
    "branch",
    "school",
    "flower",
    "gentle",
    "wonder",
    "little",
    "cheese",
    "rabbit",
    "smooth",
  ],
  7: [
    "journey",
    "picture",
    "blanket",
    "thunder",
    "library",
    "morning",
    "balance",
    "freedom",
    "curious",
    "whisper",
    "village",
    "orchard",
    "rainbow",
    "teacher",
    "kitchen",
    "weather",
    "bicycle",
    "dolphin",
    "feather",
    "lantern",
    "pumpkin",
    "stretch",
    "collect",
    "reflect",
  ],
};

export const LONGER_GUESSES = new Set(
  dictionary.split(/\r?\n/).filter((word) => /^[a-z]{6,7}$/.test(word)),
);
for (const word of [...LONGER_ANSWERS[6], ...LONGER_ANSWERS[7]])
  LONGER_GUESSES.add(word);

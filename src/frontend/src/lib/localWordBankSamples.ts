import { LOCAL_PREVIEW } from "./localPreview";
import { type SavedWordEntry, loadWordBank, saveWordBank } from "./wordBank";

const samples = [
  {
    word: "planet",
    definition: "A large, round world that travels around a star.",
    example: "Earth is the planet we live on.",
  },
  {
    word: "garden",
    definition: "An area of land where flowers or vegetables are grown.",
    example: "We planted carrots in the garden.",
  },
  {
    word: "brain",
    definition: "The organ inside your head that controls thought and memory.",
    example: "Your brain helps you remember a friend's name.",
  },
  {
    word: "library",
    definition: "A place with books that people can read or borrow.",
    example: "I borrowed a novel from the library.",
  },
  {
    word: "photosynthesis",
    definition:
      "The process plants use to turn light into energy for making food.",
    example: "Plants need light for photosynthesis.",
  },
];

export function addLocalSampleWords(username: string | undefined) {
  if (!LOCAL_PREVIEW)
    throw new Error("Sample words are available only in the local preview.");
  const existing = loadWordBank(username);
  const byWord = new Map(
    existing.map((entry) => [entry.word.toLowerCase(), entry]),
  );
  const now = Date.now();
  const additions: SavedWordEntry[] = samples
    .filter((sample) => !byWord.has(sample.word))
    .map((sample, index) => ({
      ...sample,
      source: "Local sample",
      confidence: "unknown",
      savedAt: now,
      lastSeenAt: now - index,
      nextReviewAt: now,
      reviewStreak: 0,
    }));
  const entries = [...additions, ...existing];
  // Save once, without altering existing definitions, examples, or review schedules.
  if (additions.length) saveWordBank(username, entries);
  const merged = new Map(
    entries.map((entry) => [entry.word.toLowerCase(), entry]),
  );
  return {
    entries,
    added: additions.length,
    sampleWords: samples.map((sample) => merged.get(sample.word)!),
  };
}

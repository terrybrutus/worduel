export type Confidence = "knew" | "guessed" | "unknown";

export interface SavedWordEntry {
  word: string;
  definition: string;
  confidence: Confidence | null;
  savedAt: number;
  lastSeenAt: number;
}

const GUEST_SCOPE = "guest";

export function wordBankScope(username: string | undefined): string {
  return username ? `user_${username}` : GUEST_SCOPE;
}

export function wordBankKey(username: string | undefined): string {
  return `worduel_word_bank_${wordBankScope(username)}`;
}

export function confidenceKey(
  username: string | undefined,
  word: string,
): string {
  return username
    ? `worduel_confidence_${username}_${word.toLowerCase()}`
    : `worduel_guest_confidence_${word.toLowerCase()}`;
}

export function loadWordBank(username: string | undefined): SavedWordEntry[] {
  try {
    const raw = localStorage.getItem(wordBankKey(username));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedWordEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry.word && entry.definition)
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  } catch {
    return [];
  }
}

export function saveWordBank(
  username: string | undefined,
  entries: SavedWordEntry[],
) {
  localStorage.setItem(wordBankKey(username), JSON.stringify(entries));
}

export function mergeGuestWordBankIntoUser(username: string): number {
  const guestEntries = loadWordBank(undefined);
  if (guestEntries.length === 0) return 0;

  const userEntries = loadWordBank(username);
  const mergedByWord = new Map<string, SavedWordEntry>();

  for (const entry of userEntries) {
    mergedByWord.set(entry.word, entry);
  }

  for (const guestEntry of guestEntries) {
    const existing = mergedByWord.get(guestEntry.word);
    mergedByWord.set(guestEntry.word, {
      ...guestEntry,
      confidence: guestEntry.confidence ?? existing?.confidence ?? null,
      savedAt: existing
        ? Math.min(existing.savedAt, guestEntry.savedAt)
        : guestEntry.savedAt,
      lastSeenAt: existing
        ? Math.max(existing.lastSeenAt, guestEntry.lastSeenAt)
        : guestEntry.lastSeenAt,
    });

    const guestConfidence = localStorage.getItem(
      confidenceKey(undefined, guestEntry.word),
    );
    if (guestConfidence) {
      localStorage.setItem(
        confidenceKey(username, guestEntry.word),
        guestConfidence,
      );
      localStorage.removeItem(confidenceKey(undefined, guestEntry.word));
    }
  }

  saveWordBank(
    username,
    Array.from(mergedByWord.values()).sort(
      (a, b) => b.lastSeenAt - a.lastSeenAt,
    ),
  );
  localStorage.removeItem(wordBankKey(undefined));
  return guestEntries.length;
}

export function isWordSaved(
  username: string | undefined,
  word: string,
): boolean {
  const normalized = word.toLowerCase();
  return loadWordBank(username).some((entry) => entry.word === normalized);
}

export function saveWord(
  username: string | undefined,
  word: string,
  definition: string,
  confidence: Confidence | null,
): SavedWordEntry[] {
  const normalized = word.toLowerCase();
  const now = Date.now();
  const existing = loadWordBank(username);
  const withoutWord = existing.filter((entry) => entry.word !== normalized);
  const previous = existing.find((entry) => entry.word === normalized);
  const nextEntry: SavedWordEntry = {
    word: normalized,
    definition,
    confidence,
    savedAt: previous?.savedAt ?? now,
    lastSeenAt: now,
  };
  const next = [nextEntry, ...withoutWord];
  saveWordBank(username, next);
  return next;
}

export function removeWord(
  username: string | undefined,
  word: string,
): SavedWordEntry[] {
  const normalized = word.toLowerCase();
  const next = loadWordBank(username).filter(
    (entry) => entry.word !== normalized,
  );
  saveWordBank(username, next);
  return next;
}

export function updateSavedWordConfidence(
  username: string | undefined,
  word: string,
  confidence: Confidence,
): SavedWordEntry[] {
  const normalized = word.toLowerCase();
  const entries = loadWordBank(username);
  const next = entries.map((entry) =>
    entry.word === normalized ? { ...entry, confidence } : entry,
  );
  saveWordBank(username, next);
  return next;
}

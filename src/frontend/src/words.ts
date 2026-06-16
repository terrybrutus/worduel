// Baked-in word list intentionally empty.
// Game validation relies entirely on user-imported custom words from the backend.
export const RAW: string[] = [];

// Deduplicated at module load time
export const VALID_WORDS = new Set(
  RAW.map((w) => w.toLowerCase()).filter(
    (w) => w.length === 5 && /^[a-z]+$/.test(w),
  ),
);

export function isValidWord(w: string): boolean {
  return VALID_WORDS.has(w.toLowerCase());
}

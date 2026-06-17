// The backend owns authoritative word validation.
// Keep this list optional so an empty export cannot block every guess locally.
export const RAW: string[] = [];

// Deduplicated at module load time
export const VALID_WORDS = new Set(
  RAW.map((w) => w.toLowerCase()).filter(
    (w) => w.length === 5 && /^[a-z]+$/.test(w),
  ),
);

export function isValidWord(w: string): boolean {
  if (VALID_WORDS.size === 0) return true;
  return VALID_WORDS.has(w.toLowerCase());
}

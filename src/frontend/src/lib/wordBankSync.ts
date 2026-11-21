import { localCall, localGuest } from "./localBackend";
import { loadWordBank, saveWordBank, type SavedWordEntry } from "./wordBank";

interface Bank { revision: number; payload: string }
const same = (a: unknown,b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function parse(payload: string): SavedWordEntry[] {
  const entries = JSON.parse(payload);
  if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry.word !== "string" || typeof entry.definition !== "string")) throw new Error("Word Bank data could not be read.");
  return entries;
}
// Merge changes relative to the last successful sync, including deletions.
export function mergeBanks(base: SavedWordEntry[], local: SavedWordEntry[], remote: SavedWordEntry[]) {
  const before = new Map(base.map(entry => [entry.word,entry]));
  const here = new Map(local.map(entry => [entry.word,entry]));
  const there = new Map(remote.map(entry => [entry.word,entry]));
  const result: SavedWordEntry[] = [];
  for (const word of new Set([...before.keys(),...here.keys(),...there.keys()])) {
    const old = before.get(word), left = here.get(word), right = there.get(word);
    const selected = same(left,old) ? right : same(right,old) ? left :
      !left ? right : !right ? left : left.lastSeenAt >= right.lastSeenAt ? left : right;
    if (selected) result.push(selected);
  }
  return result.sort((a,b) => b.lastSeenAt-a.lastSeenAt);
}
export function startWordBankSync(username: string, token: string) {
  let busy = false, stopped = false, again = false, writingRemote = false;
  const baseKey = `__worduel_bank_base_${username}__`;
  let base: SavedWordEntry[] = [];
  try { base = parse(localStorage.getItem(baseKey) || "[]"); } catch { /* Keep the original saved words intact. */ }
  const sync = async () => {
    if (busy) { again = true; return; }
    if (stopped || localGuest()?.token !== token) return;
    busy = true;
    try {
      const remote = await localCall<Bank>("wordBankGet");
      const local = loadWordBank(username);
      const merged = mergeBanks(base,local,parse(remote.payload));
      if (stopped || localGuest()?.token !== token) return;
      const saved = same(merged,parse(remote.payload)) ? remote : await localCall<Bank>("wordBankPut",[remote.revision,JSON.stringify(merged)]);
      if (stopped || localGuest()?.token !== token) return;
      const now = loadWordBank(username);
      const next = mergeBanks(local,now,parse(saved.payload));
      writingRemote = true;
      try { if (!same(next,now)) saveWordBank(username,next); } finally { writingRemote = false; }
      base = parse(saved.payload);
      localStorage.setItem(baseKey,JSON.stringify(base));
      window.dispatchEvent(new CustomEvent("worduel-bank-sync",{detail:{status:"synced"}}));
    } catch {
      window.dispatchEvent(new CustomEvent("worduel-bank-sync",{detail:{status:"local"}}));
    } finally {
      busy = false;
      if (again && !stopped) { again = false; void sync(); }
    }
  };
  const changed = (event: Event) => { if (!writingRemote && (event as CustomEvent).detail?.username === username) void sync(); };
  const storage = (event: StorageEvent) => { if (event.key?.startsWith("worduel_word_bank_")) void sync(); };
  window.addEventListener("worduel-bank-changed",changed); window.addEventListener("storage",storage);
  const timer = window.setInterval(() => void sync(),30000);
  void sync();
  return () => { stopped = true; clearInterval(timer); window.removeEventListener("worduel-bank-changed",changed); window.removeEventListener("storage",storage); };
}

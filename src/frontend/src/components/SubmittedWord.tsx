import { BookOpen, Star, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { isWordSaved, saveWord } from "../lib/wordBank";
import { getWordDefinition } from "./LearningRecap";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface Meaning { definition: string; example?: string }
const cache = new Map<string, Meaning>();

export function SubmittedWord({ word, children }: { word: string; children: ReactNode }) {
  const normalized = word.toLowerCase();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [meaning, setMeaning] = useState<Meaning | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaved(isWordSaved(user?.username, normalized));
    setNotice("");
    const known = getWordDefinition(normalized);
    const fallback = known === "Definition coming soon." ? null : { definition: known };
    const cached = cache.get(normalized);
    setMeaning(cached ?? fallback);
    if (cached) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("No entry");
        const entries = await response.json() as Array<{ meanings?: Array<{ definitions?: Meaning[] }> }>;
        const result = entries.flatMap(entry => entry.meanings ?? []).flatMap(entry => entry.definitions ?? []).find(entry => typeof entry.definition === "string" && entry.definition.length > 0);
        if (!result) throw new Error("No definition");
        const next = { definition: fallback?.definition ?? result.definition, example: result.example };
        cache.set(normalized, next);
        if (active) setMeaning(next);
      } catch {
        if (active && !fallback) setNotice("No definition available here yet.");
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [open, normalized, user?.username]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" onKeyDown={event => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }} className="relative flex items-center gap-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Meaning and save options for ${word}`} title={`Look up ${word}`}>
          {children}
          <BookOpen aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" collisionPadding={12} className="w-72 max-w-[calc(100vw-24px)] max-h-[min(360px,70dvh)] overflow-y-auto" onKeyDown={event => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold uppercase">{word}</h3>
          <button type="button" aria-label="Close definition" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div aria-live="polite" className="mt-2 text-sm">
          {meaning ? <p>{meaning.definition}</p> : <p>{loading ? "Looking up meaning..." : notice}</p>}
          {meaning?.example && <p className="mt-2 text-muted-foreground">Example: {meaning.example}</p>}
        </div>
        <button type="button" disabled={!meaning || saved} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:opacity-60" onClick={() => {
          if (!meaning) return;
          try {
            saveWord(user?.username, normalized, meaning.definition, null);
            setSaved(true);
            setNotice("");
          } catch { setNotice("Could not save. Browser storage may be full or disabled."); }
        }}>
          <Star className="h-4 w-4" />{saved ? "Saved" : "Save to Word Bank"}
        </button>
        {!user && <p className="mt-2 text-xs text-muted-foreground">Guest saves stay in this browser.</p>}
        {meaning && notice && <p role="status" className="mt-2 text-xs">{notice}</p>}
        <a className="mt-2 inline-block text-xs underline text-muted-foreground" href={`https://en.wiktionary.org/wiki/${encodeURIComponent(normalized)}`} target="_blank" rel="noreferrer">More meanings on Wiktionary</a>
        {meaning && <p className="mt-1 text-xs text-muted-foreground">Worduel / Free Dictionary API</p>}
      </PopoverContent>
    </Popover>
  );
}

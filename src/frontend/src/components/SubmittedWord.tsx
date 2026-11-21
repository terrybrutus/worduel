import { AppButton } from "./AppButton";
import { BookOpen, Star, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { isWordSaved, saveWord } from "../lib/wordBank";
import { getWordDefinition } from "./LearningRecap";
import { useWordMeaning } from "../hooks/useWordMeaning";
import { MeaningAttribution } from "./MeaningAttribution";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";


export function SubmittedWord({ word, children }: { word: string; children: ReactNode }) {
  const normalized = word.toLowerCase();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const result = useWordMeaning(normalized, getWordDefinition(normalized), open);
  const meaning = result.definition ? result : null;
  const loading = result.loading;
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaved(isWordSaved(user?.username, normalized));
    setNotice("");
  }, [open, normalized, user?.username]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AppButton type="button" onKeyDown={event => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }} className="relative flex items-center gap-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Meaning and save options for ${word}`} title={`Look up ${word}`}>
          {children}
          <BookOpen aria-hidden="true" className="absolute right-0.5 top-0.5 h-2 w-2 opacity-70 sm:right-1 sm:top-1 sm:h-3 sm:w-3" />
        </AppButton>
      </PopoverTrigger>
      <PopoverContent side="top" collisionPadding={12} className="w-72 max-w-[calc(100vw-24px)] max-h-[min(360px,70dvh)] overflow-y-auto" onKeyDown={event => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold uppercase">{word}</h3>
          <AppButton type="button" aria-label="Close definition" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center"><X className="h-4 w-4" /></AppButton>
        </div>
        <div aria-live="polite" className="mt-2 text-sm">
          {meaning ? <p>{meaning.definition}</p> : <p>{loading ? "Looking up meaning..." : "We couldn't retrieve a meaning. Check Wiktionary below, or close and reopen to retry."}</p>}
          {meaning?.example && <p className="mt-2 text-muted-foreground">Example: {meaning.example}</p>}
        </div>
        <AppButton type="button" disabled={!meaning || saved} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:opacity-60" onClick={() => {
          if (!meaning) return;
          try {
            saveWord(user?.username, normalized, meaning.definition, null, meaning);
            setSaved(true);
            setNotice("");
          } catch { setNotice("Could not save. Browser storage may be full or disabled."); }
        }}>
          <Star className="h-4 w-4" />{saved ? "Saved" : "Save to Word Bank"}
        </AppButton>
        {!user && <p className="mt-2 text-xs text-muted-foreground">Guest saves stay in this browser.</p>}
        {meaning && notice && <p role="status" className="mt-2 text-xs">{notice}</p>}
        <a className="mt-2 inline-block text-xs underline text-muted-foreground" href={`https://en.wiktionary.org/wiki/${encodeURIComponent(normalized)}`} target="_blank" rel="noreferrer">More meanings on Wiktionary</a>
        {meaning && <MeaningAttribution {...meaning} />}
      </PopoverContent>
    </Popover>
  );
}

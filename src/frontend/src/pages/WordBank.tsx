import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookMarked, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { type SavedWordEntry, loadWordBank, removeWord } from "../lib/wordBank";

function confidenceLabel(confidence: SavedWordEntry["confidence"]): string {
  if (confidence === "knew") return "Knew it";
  if (confidence === "guessed") return "Guessed it";
  if (confidence === "unknown") return "No idea";
  return "Not marked";
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export default function WordBank() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState(() => loadWordBank(user?.username));

  const summary = useMemo(() => {
    const needsReview = entries.filter(
      (entry) => entry.confidence !== "knew",
    ).length;
    return {
      total: entries.length,
      needsReview,
      known: entries.length - needsReview,
    };
  }, [entries]);

  const handleRemove = (word: string) => {
    setEntries(removeWord(user?.username, word));
  };

  const handleRefresh = () => {
    setEntries(loadWordBank(user?.username));
  };

  return (
    <div className="flex-1 bg-background px-4 py-5" data-ocid="word_bank.page">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/lobby" })}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-display font-bold text-foreground hover:bg-muted/40"
            data-ocid="word_bank.back_button"
          >
            <ArrowLeft className="h-4 w-4" />
            Lobby
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-display font-bold text-foreground hover:bg-muted/40"
            data-ocid="word_bank.refresh_button"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh
          </button>
        </header>

        <section className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-primary" />
                <h1 className="font-display text-2xl font-black text-foreground">
                  Word Memory Bank
                </h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Review the words you saved after a duel. Signed-in users get a
                separate browser-saved bank; guest saves stay temporary here.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Saved", summary.total],
                ["Review", summary.needsReview],
                ["Known", summary.known],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
                >
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {label}
                  </p>
                  <p className="font-display text-lg font-black text-primary">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {entries.length === 0 ? (
          <section
            className="rounded-xl border border-border/60 bg-card p-6 text-center"
            data-ocid="word_bank.empty_state"
          >
            <BookMarked className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-lg font-bold text-foreground">
              No saved words yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Finish a practice or multiplayer round, then save the revealed
              word from the learning recap.
            </p>
            <button
              type="button"
              onClick={() => void navigate({ to: "/practice" })}
              className="mt-5 rounded-lg border border-primary/40 px-4 py-2 text-sm font-display font-bold text-primary hover:bg-primary/10"
              data-ocid="word_bank.practice_button"
            >
              Play Practice
            </button>
          </section>
        ) : (
          <section className="grid gap-3 sm:grid-cols-2">
            {entries.map((entry) => (
              <article
                key={entry.word}
                className="rounded-xl border border-border/60 bg-card p-4"
                data-ocid={`word_bank.word.${entry.word}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-black uppercase tracking-widest text-foreground">
                      {entry.word}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.definition}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.word)}
                    className="rounded-lg border border-border p-2 text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                    aria-label={`Remove ${entry.word}`}
                    data-ocid={`word_bank.remove.${entry.word}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-display font-bold text-primary">
                    {confidenceLabel(entry.confidence)}
                  </span>
                  <span className="rounded-full border border-border bg-muted/10 px-2.5 py-1 text-muted-foreground">
                    Saved {formatDate(entry.savedAt)}
                  </span>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

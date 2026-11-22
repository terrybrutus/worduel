import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookMarked,
  FlaskConical,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppButton } from "../components/AppButton";
import { MeaningAttribution } from "../components/MeaningAttribution";
import { ReviewQuiz } from "../components/ReviewQuiz";
import { useAuth } from "../hooks/useAuth";
import { LOCAL_PREVIEW } from "../lib/localPreview";
import { addLocalSampleWords } from "../lib/localWordBankSamples";
import { prepareQuiz } from "../lib/prepareQuiz";
import { type ReviewQuestion, createReviewRound } from "../lib/reviewQuiz";
import {
  type SavedWordEntry,
  isReviewDue,
  loadWordBank,
  recordWordReview,
  removeWord,
  updateSavedWordConfidence,
} from "../lib/wordBank";

type Filter = "due" | "all" | "known";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted/40 disabled:opacity-50";
const filterLabels: Record<Filter, string> = {
  all: "All words",
  due: "Ready to review",
  known: "Already known",
};

export default function WordBank() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState(() => loadWordBank(user?.username));
  const [filter, setFilter] = useState<Filter>("all");
  const [queue, setQueue] = useState<SavedWordEntry[] | null>(null);
  const [quiz, setQuiz] = useState<ReviewQuestion[] | null>(null);
  const [quizSource, setQuizSource] = useState("");
  const [quizId, setQuizId] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [quizNotice, setQuizNotice] = useState("");
  const preparation = useRef(0);
  useEffect(
    () => () => {
      preparation.current++;
    },
    [],
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [syncStatus, setSyncStatus] = useState("syncing");
  useEffect(() => {
    const changed = (event: Event) => {
      if ((event as CustomEvent).detail?.username === user?.username)
        setEntries(loadWordBank(user?.username));
    };
    const synced = (event: Event) =>
      setSyncStatus((event as CustomEvent).detail?.status || "local");
    window.addEventListener("worduel-bank-changed", changed);
    window.addEventListener("worduel-bank-sync", synced);
    return () => {
      window.removeEventListener("worduel-bank-changed", changed);
      window.removeEventListener("worduel-bank-sync", synced);
    };
  }, [user?.username]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const due = entries
    .filter((entry) => isReviewDue(entry, now))
    .sort(
      (a, b) =>
        Number(b.confidence === "unknown") - Number(a.confidence === "unknown"),
    );
  const current = queue?.[index];
  const shown =
    filter === "due"
      ? due
      : filter === "known"
        ? entries.filter((entry) => entry.confidence === "knew")
        : entries;
  const quizCandidates = useMemo(() => {
    if (filter === "known")
      return entries.filter((entry) => entry.confidence === "knew");
    const ready = entries
      .filter((entry) => isReviewDue(entry, now))
      .sort(
        (a, b) =>
          Number(b.confidence === "unknown") -
          Number(a.confidence === "unknown"),
      );
    if (filter === "due") return ready;
    return [
      ...ready,
      ...entries.filter(
        (entry) =>
          entry.confidence !== "knew" &&
          entry.nextReviewAt !== null &&
          !isReviewDue(entry, now),
      ),
    ];
  }, [entries, filter, now]);
  const preparedRound = useMemo(
    () => createReviewRound(quizCandidates),
    [quizCandidates],
  );
  const mutate = (action: () => SavedWordEntry[]) => {
    try {
      setEntries(action());
      setNow(Date.now());
      setError("");
      return true;
    } catch {
      setError("Could not save changes. Browser storage may be unavailable.");
      return false;
    }
  };
  const start = (words: SavedWordEntry[]) => {
    setQueue(words);
    setIndex(0);
    setRevealed(false);
  };
  const startQuiz = async (words?: SavedWordEntry[], source?: string) => {
    const request = ++preparation.current;
    setPreparing(true);
    setQuizNotice("");
    setError("");
    const plan = words ? createReviewRound(words) : preparedRound;
    const result = await prepareQuiz(plan).catch(() => ({
      questions: plan,
      notice:
        "New questions aren't available right now. Standard choices are shown for this round.",
    }));
    if (request !== preparation.current) return;
    setQuiz(result.questions);
    setQuizNotice(result.notice);
    setQuizSource(source ?? (words ? "Selected word" : filterLabels[filter]));
    setQuizId((value) => value + 1);
    setPreparing(false);
  };
  const answer = (remembered: boolean) => {
    if (
      !current ||
      !mutate(() => recordWordReview(user?.username, current.word, remembered))
    )
      return;
    setIndex((value) => value + 1);
    setRevealed(false);
  };
  return (
    <main
      className={`mx-auto w-full max-w-3xl flex-1 px-4 ${quiz !== null ? "space-y-3 py-3" : "space-y-5 py-5"}`}
      data-ocid="word_bank.page"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <AppButton
          className={button}
          onClick={() => void navigate({ to: "/lobby" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Lobby
        </AppButton>
        {quiz !== null ? (
          <h1 className="text-lg font-bold">Word Bank</h1>
        ) : (
          <AppButton
            className={button}
            onClick={() => void navigate({ to: "/practice" })}
          >
            Practice
          </AppButton>
        )}
      </header>
      {quiz === null && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold">Word Bank</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {entries.length} saved · {due.length} ready to review
            </p>
          </div>
          {queue === null && quiz === null && (
            <div className="flex flex-wrap gap-2">
              <AppButton
                className={`${button} bg-primary text-primary-foreground hover:bg-primary/90`}
                aria-describedby="quiz-selection"
                tooltip="Up to five eligible words from the selected filter. Missed words get one extra retry."
                disabled={!preparedRound.length || preparing}
                onClick={() => void startQuiz()}
              >
                <Play className="h-4 w-4" />
                Quick quiz{" "}
                <span aria-hidden="true">({preparedRound.length})</span>
              </AppButton>
              <AppButton
                className={button}
                disabled={!entries.length || preparing}
                onClick={() => start(due.length ? due : entries)}
              >
                <BookMarked className="h-4 w-4" />
                Flashcards
              </AppButton>
              {LOCAL_PREVIEW && (
                <AppButton
                  className={button}
                  disabled={preparing}
                  tooltip="Add five local sample words and start a mixed quiz. Your saved words stay unchanged."
                  onClick={() => {
                    try {
                      const result = addLocalSampleWords(user?.username);
                      setEntries(result.entries);
                      setNow(Date.now());
                      setFilter("all");
                      void startQuiz(result.sampleWords, "Sample words");
                    } catch {
                      setError(
                        "Could not add samples. Browser storage may be full or disabled.",
                      );
                    }
                  }}
                >
                  <FlaskConical className="h-4 w-4" />
                  Try sample words
                </AppButton>
              )}
            </div>
          )}
        </div>
      )}
      {quiz === null && (
        <output className="block text-xs text-muted-foreground">
          {syncStatus === "synced"
            ? user?.isGuest
              ? "Saved for this guest session. Sign in to keep it across devices."
              : "Saved to your account and available on your other devices."
            : syncStatus === "local"
              ? "Saved on this device. Sync will retry."
              : "Saved in this browser. Syncing with Worduel..."}
        </output>
      )}
      {quiz === null && user?.isGuest && (
        <AppButton
          className={button}
          onClick={() => void navigate({ to: "/login" })}
        >
          Sign in to keep words and stats
        </AppButton>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {preparing && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <output className="block">Preparing your questions...</output>
          <AppButton
            className={button}
            onClick={() => {
              preparation.current++;
              setPreparing(false);
            }}
          >
            Cancel
          </AppButton>
        </div>
      )}
      {quizNotice && (
        <output className="block text-sm text-muted-foreground">
          {quizNotice}
        </output>
      )}
      {quiz !== null && (
        <ReviewQuiz
          key={quizId}
          questions={quiz}
          source={quizSource}
          busy={preparing}
          onReview={(word, remembered) =>
            mutate(() =>
              remembered &&
              entries.find((entry) => entry.word === word)?.confidence ===
                "knew"
                ? loadWordBank(user?.username)
                : recordWordReview(user?.username, word, remembered),
            )
          }
          onEnd={() => {
            preparation.current++;
            setPreparing(false);
            setQuiz(null);
            setQuizNotice("");
          }}
          onAgain={() => void startQuiz()}
        />
      )}
      {queue !== null && (
        <section
          aria-label="Word review"
          className="rounded-lg border border-primary/40 bg-card p-4 sm:p-6"
        >
          {current ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Word {index + 1} of {queue.length}
                </p>
                <AppButton className={button} onClick={() => setQueue(null)}>
                  End review
                </AppButton>
              </div>
              <h2 className="mt-4 break-words text-2xl font-bold uppercase">
                {current.word}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Can you recall its meaning?
              </p>
              {!revealed ? (
                <AppButton
                  className={`${button} mt-4`}
                  onClick={() => setRevealed(true)}
                >
                  Reveal meaning
                </AppButton>
              ) : (
                <>
                  <p className="mt-4 text-base">{current.definition}</p>
                  {current.example && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Example: {current.example}
                    </p>
                  )}
                  <MeaningAttribution {...current} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <AppButton className={button} onClick={() => answer(true)}>
                      Remembered
                    </AppButton>
                    <AppButton className={button} onClick={() => answer(false)}>
                      <RotateCcw className="h-4 w-4" />
                      Review again
                    </AppButton>
                    <AppButton
                      className={button}
                      onClick={() => {
                        if (
                          mutate(() =>
                            updateSavedWordConfidence(
                              user?.username,
                              current.word,
                              "knew",
                            ),
                          )
                        ) {
                          setIndex((value) => value + 1);
                          setRevealed(false);
                        }
                      }}
                    >
                      Stop reviewing this word
                    </AppButton>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Remembered words return in a few days. Review again brings
                    this word back in 10 minutes.
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">Review complete</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You reviewed {queue.length} words. Your next reviews are
                scheduled.
              </p>
              <AppButton
                className={`${button} mt-4`}
                onClick={() => setQueue(null)}
              >
                Back to saved words
              </AppButton>
            </>
          )}
        </section>
      )}
      {queue === null && quiz === null && (
        <>
          <div className="flex flex-wrap gap-2" aria-label="Saved word filters">
            {(
              [
                ["all", "All words"],
                ["due", "Ready to review"],
                ["known", "Already known"],
              ] as const
            ).map(([value, label]) => (
              <AppButton
                key={value}
                disabled={preparing}
                className={`${button} ${filter === value ? "border-primary bg-primary/10 text-primary" : ""}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </AppButton>
            ))}
          </div>
          <output
            id="quiz-selection"
            className="block text-xs text-muted-foreground"
          >
            {filterLabels[filter]}: {preparedRound.length}{" "}
            {preparedRound.length === 1 ? "word" : "words"} selected
            {filter === "all" ? "; already-known words excluded" : ""}.
          </output>
          {!shown.length ? (
            <p className="py-8 text-center text-muted-foreground">
              {!entries.length
                ? "No saved words yet. Save a submitted guess or a round's answer to start your collection."
                : filter === "due"
                  ? "Nothing due right now. You can review any saved word whenever you like."
                  : "No words in this view."}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((entry) => (
                <article
                  key={entry.word}
                  className="min-w-0 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="break-all text-lg font-bold uppercase">
                      {entry.word}
                    </h2>
                    <AppButton
                      className={button}
                      disabled={preparing}
                      title={`Remove ${entry.word}`}
                      aria-label={`Remove ${entry.word}`}
                      onClick={() =>
                        mutate(() => removeWord(user?.username, entry.word))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </AppButton>
                  </div>
                  <p className="mt-2 break-words text-sm">{entry.definition}</p>
                  {entry.example && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Example: {entry.example}
                    </p>
                  )}
                  <MeaningAttribution {...entry} />
                  <p className="mt-3 text-xs text-muted-foreground">
                    {entry.confidence === "knew"
                      ? "Automatic review off"
                      : isReviewDue(entry)
                        ? "Ready to review"
                        : `Next review: ${new Date(entry.nextReviewAt!).toLocaleString()}`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AppButton
                      className={button}
                      disabled={preparing}
                      onClick={() => void startQuiz([entry])}
                    >
                      Review word
                    </AppButton>
                    <AppButton
                      className={button}
                      disabled={preparing}
                      onClick={() =>
                        mutate(() =>
                          updateSavedWordConfidence(
                            user?.username,
                            entry.word,
                            entry.confidence === "knew" ? "guessed" : "knew",
                          ),
                        )
                      }
                    >
                      {entry.confidence === "knew"
                        ? "Add to review"
                        : "Already know it"}
                    </AppButton>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

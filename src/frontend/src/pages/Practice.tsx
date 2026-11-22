import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, RotateCcw, Trophy, UserPlus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { type Guess, TileState } from "../backend";
import { AppButton } from "../components/AppButton";
import {
  Keyboard,
  playInvalidSound,
  playLossSound,
  playWinSound,
} from "../components/Keyboard";
import { LearningRecap } from "../components/LearningRecap";
import { TileGrid } from "../components/TileGrid";
import { useAuth } from "../hooks/useAuth";
import { triggerHaptic, useHapticEnabled } from "../hooks/useHapticEnabled";
import { useSoundEnabled } from "../hooks/useSoundEnabled";
import {
  LONGER_ANSWERS,
  LONGER_GUESSES,
  type WordLength,
} from "../lib/longerWords";
import { PRACTICE_ANSWERS, PRACTICE_GUESSES } from "../lib/practiceDictionary";

const MAX_GUESSES = 6;

type PracticeStatus = "playing" | "won" | "lost";
type PracticeMode = "guess" | "meaning";

interface MeaningCard {
  word: string;
  definition: string;
  choices: string[];
  example: string;
  topic: string;
}

const MEANING_CARDS: MeaningCard[] = [
  {
    word: "mitigate",
    definition: "to make something less severe, harmful, or painful",
    example: "The team changed the launch plan to mitigate risk.",
    topic: "Workplace vocabulary",
    choices: [
      "to make something less severe, harmful, or painful",
      "to repeat an idea without adding new information",
      "to remove all evidence of a decision",
      "to move quickly without planning",
    ],
  },
  {
    word: "resilient",
    definition: "able to recover after difficulty or change",
    example: "A resilient team can adapt after a difficult release.",
    topic: "Leadership vocabulary",
    choices: [
      "able to recover after difficulty or change",
      "likely to reject every new idea",
      "focused only on short-term results",
      "unclear because too many details are missing",
    ],
  },
  {
    word: "ambiguous",
    definition: "open to more than one meaning or interpretation",
    example:
      "The instructions were ambiguous, so learners chose different paths.",
    topic: "Communication vocabulary",
    choices: [
      "open to more than one meaning or interpretation",
      "proven by a large amount of data",
      "easy to remember after one attempt",
      "arranged in exact alphabetical order",
    ],
  },
  {
    word: "photosynthesis",
    definition: "the process plants use to turn light into energy",
    example: "Photosynthesis lets plants use sunlight to make food.",
    topic: "Science vocabulary",
    choices: [
      "the process plants use to turn light into energy",
      "the study of word origins and language history",
      "the movement of heat through metal or water",
      "the breaking down of rocks by wind and rain",
    ],
  },
  {
    word: "stakeholder",
    definition: "a person or group affected by a decision or project",
    example:
      "The designer interviewed each stakeholder before changing the workflow.",
    topic: "Business vocabulary",
    choices: [
      "a person or group affected by a decision or project",
      "a tool used to measure exact distance",
      "a rule that blocks every possible exception",
      "a final answer that cannot be reviewed",
    ],
  },
  {
    word: "infer",
    definition: "to reach a conclusion using evidence and reasoning",
    example: "Readers can infer the character is nervous from the dialogue.",
    topic: "Reading vocabulary",
    choices: [
      "to reach a conclusion using evidence and reasoning",
      "to copy text exactly from a source",
      "to make a word shorter by removing vowels",
      "to organize numbers from lowest to highest",
    ],
  },
];

function randomIndex(max: number): number {
  if (max <= 1) return 0;
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const buffer = new Uint32Array(1);
    cryptoApi.getRandomValues(buffer);
    return buffer[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function pickAnswer(previous?: string, length: WordLength = 5): string {
  const answers: readonly string[] =
    length === 5 ? PRACTICE_ANSWERS : LONGER_ANSWERS[length];
  if (answers.length === 0) return "crane";
  if (answers.length === 1) return answers[0];
  let next = answers[randomIndex(answers.length)];
  if (next === previous) {
    next = answers[(answers.indexOf(next) + 1) % answers.length];
  }
  return next;
}

function pickMeaningCard(previous?: string): MeaningCard {
  if (MEANING_CARDS.length === 0) {
    return {
      word: "learn",
      definition: "to gain knowledge or skill",
      example: "Players learn a word through a short challenge.",
      topic: "Vocabulary",
      choices: [
        "to gain knowledge or skill",
        "to hide information from view",
        "to remove a correct answer",
        "to move without direction",
      ],
    };
  }
  let next = MEANING_CARDS[randomIndex(MEANING_CARDS.length)];
  if (MEANING_CARDS.length > 1 && next.word === previous) {
    next =
      MEANING_CARDS[(MEANING_CARDS.indexOf(next) + 1) % MEANING_CARDS.length];
  }
  return next;
}

function evaluateGuess(guess: string, answer: string): TileState[] {
  const WORD_LENGTH = answer.length;
  const states: TileState[] = Array(WORD_LENGTH).fill(TileState.absent);
  const answerLetters = answer.split("");
  const used = Array(WORD_LENGTH).fill(false);

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) {
      states[i] = TileState.correct;
      used[i] = true;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (states[i] === TileState.correct) continue;
    const found = answerLetters.findIndex(
      (letter, idx) => !used[idx] && letter === guess[i],
    );
    if (found >= 0) {
      states[i] = TileState.present;
      used[found] = true;
    }
  }

  return states;
}

function makeGuess(word: string, answer: string, playerNum: bigint): Guess {
  return {
    word,
    states: evaluateGuess(word, answer),
    playerNum,
    timestamp: BigInt(Date.now()) * BigInt(1_000_000),
  };
}

export default function Practice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { soundEnabled } = useSoundEnabled();
  const { hapticEnabled } = useHapticEnabled();

  const [practiceMode, setPracticeMode] = useState<PracticeMode>("guess");
  const [wordLength, setWordLength] = useState<WordLength>(5);
  const WORD_LENGTH = wordLength;
  const [answer, setAnswer] = useState(() => pickAnswer());
  const [meaningCard, setMeaningCard] = useState(() => pickMeaningCard());
  const [meaningChoice, setMeaningChoice] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [status, setStatus] = useState<PracticeStatus>("playing");
  const [message, setMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [roundId, setRoundId] = useState(0);

  const isFinished = status !== "playing";
  const isGuessMode = practiceMode === "guess";

  const headline = useMemo(() => {
    if (status === "won") return isGuessMode ? "You solved it" : "You got it";
    if (status === "lost") return "Round complete";
    return isGuessMode ? "Solo Practice" : "Meaning Duel";
  }, [isGuessMode, status]);

  const reset = useCallback(
    (mode: PracticeMode = practiceMode, length: WordLength = wordLength) => {
      if (mode === "guess") {
        setAnswer((current) => pickAnswer(current, length));
      } else {
        setMeaningCard((current) => pickMeaningCard(current.word));
      }
      setMeaningChoice(null);
      setCurrentInput("");
      setGuesses([]);
      setStatus("playing");
      setMessage(null);
      setIsShaking(false);
      setIsFlipping(false);
      setRoundId((current) => current + 1);
    },
    [practiceMode, wordLength],
  );

  const switchMode = (mode: PracticeMode) => {
    setPracticeMode(mode);
    reset(mode);
  };

  const rejectInput = useCallback(
    (text: string) => {
      setMessage(text);
      setIsShaking(true);
      triggerHaptic(120, hapticEnabled);
      if (soundEnabled) playInvalidSound();
      setTimeout(() => {
        setIsShaking(false);
        setMessage(null);
      }, 1400);
    },
    [hapticEnabled, soundEnabled],
  );

  const handleKey = useCallback(
    (key: string) => {
      if (isFinished || !isGuessMode) return;

      if (key === "BACKSPACE") {
        setCurrentInput((prev) => prev.slice(0, -1));
        return;
      }

      if (key === "ENTER") {
        if (currentInput.length < WORD_LENGTH) {
          rejectInput("Not enough letters");
          return;
        }

        const normalized = currentInput.toLowerCase();
        if (
          !(wordLength === 5 ? PRACTICE_GUESSES : LONGER_GUESSES).has(
            normalized,
          )
        ) {
          rejectInput("Not a word");
          return;
        }

        if (guesses.some((guess) => guess.word === normalized)) {
          rejectInput("Already guessed");
          return;
        }

        const nextGuess = makeGuess(normalized, answer, BigInt(1));
        const nextGuesses = [...guesses, nextGuess];
        setGuesses(nextGuesses);
        setCurrentInput("");
        setIsFlipping(true);
        setTimeout(() => setIsFlipping(false), 900);

        if (normalized === answer) {
          setStatus("won");
          if (soundEnabled) playWinSound();
          return;
        }

        if (nextGuesses.length >= MAX_GUESSES) {
          setStatus("lost");
          if (soundEnabled) playLossSound();
        }
        return;
      }

      if (/^[A-Z]$/.test(key) && currentInput.length < WORD_LENGTH) {
        setCurrentInput((prev) => prev + key.toLowerCase());
      }
    },
    [
      answer,
      currentInput,
      guesses,
      isFinished,
      isGuessMode,
      rejectInput,
      soundEnabled,
      wordLength,
      WORD_LENGTH,
    ],
  );

  const handleMeaningChoice = (choice: string) => {
    if (isFinished || isGuessMode) return;
    setMeaningChoice(choice);
    if (choice === meaningCard.definition) {
      setStatus("won");
      if (soundEnabled) playWinSound();
    } else {
      setStatus("lost");
      if (soundEnabled) playLossSound();
    }
  };

  return (
    <div
      className="flex-1 bg-background px-3 py-3 sm:px-4 sm:py-5"
      data-ocid="practice.page"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-5">
        <header className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <AppButton
            type="button"
            onClick={() => void navigate({ to: "/lobby" })}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-display font-bold text-foreground hover:bg-muted/40"
            data-ocid="practice.back_button"
          >
            <ArrowLeft className="h-4 w-4" />
            Lobby
          </AppButton>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">
              Practice
            </p>
            <p className="text-xs text-muted-foreground">
              {user
                ? `Signed in as ${user.username}`
                : "Progress saves after sign in"}
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-black text-foreground">
                {headline}
              </h1>
              <p className="mt-1 hidden max-w-2xl text-sm text-muted-foreground sm:block">
                {isGuessMode
                  ? "Solve the word, learn the meaning, and keep useful words for later."
                  : "Pick the real meaning, then save the word if it is worth reviewing."}
              </p>
            </div>
            <AppButton
              type="button"
              onClick={(event) => {
                event.currentTarget.blur();
                reset();
              }}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-primary/40 px-3 py-2 text-sm font-display font-bold text-primary hover:bg-primary/10"
              data-ocid="practice.new_round_button"
              tooltip="Start a fresh word at the selected length."
            >
              <RotateCcw className="h-4 w-4" />
              New Round
            </AppButton>
          </div>
          <div
            className="mt-3 grid grid-cols-2 gap-2"
            data-ocid="practice.mode_selector"
          >
            {[
              {
                mode: "guess" as const,
                label: "Guess Word",
                detail: "Classic guessing with 5, 6, or 7 letters.",
              },
              {
                mode: "meaning" as const,
                label: "Meaning Duel",
                detail: "Any-length vocabulary with definition choices.",
              },
            ].map((option) => {
              const selected = practiceMode === option.mode;
              return (
                <AppButton
                  key={option.mode}
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.blur();
                    switchMode(option.mode);
                  }}
                  aria-pressed={selected}
                  tooltip={
                    option.mode === "guess"
                      ? "Find the hidden word in six guesses."
                      : "Choose a definition for a longer word."
                  }
                  className={`rounded-lg border px-3 py-2 text-left transition-smooth ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-background/40 text-foreground hover:border-primary/40"
                  }`}
                  data-ocid={`practice.mode.${option.mode}`}
                >
                  <p className="font-display text-sm font-bold">
                    {option.label}
                  </p>
                  <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
                    {option.detail}
                  </p>
                </AppButton>
              );
            })}
          </div>
          {isGuessMode && (
            <fieldset className="mt-3 flex flex-wrap items-center gap-2">
              <legend className="mb-2 text-sm font-semibold">
                Word length
              </legend>
              {([5, 6, 7] as const).map((length) => (
                <label
                  key={length}
                  className={`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm ${wordLength === length ? "border-primary text-primary" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name="word-length"
                    value={length}
                    checked={wordLength === length}
                    onChange={() => {
                      setWordLength(length);
                      reset("guess", length);
                    }}
                  />
                  {length} letters
                </label>
              ))}
            </fieldset>
          )}
        </section>

        <main className="mx-auto grid w-full max-w-3xl gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-5">
          {isGuessMode ? (
            <>
              <section className="order-1 rounded-xl border border-border/60 bg-card/80 p-3 sm:p-4 lg:col-start-1 lg:row-start-1">
                <TileGrid
                  key={`player-${roundId}`}
                  wordLength={wordLength}
                  guesses={guesses}
                  currentInput={currentInput}
                  isFlipping={isFlipping}
                  isShaking={isShaking}
                  label="You"
                />
              </section>

              <div className="order-2 sticky bottom-0 z-20 -mx-3 border-t border-border/60 bg-background/95 px-3 py-2 backdrop-blur lg:static lg:col-start-1 lg:row-start-2 lg:mx-0 lg:border-t-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                <Keyboard
                  key={`keyboard-${roundId}`}
                  guesses={guesses}
                  onKey={handleKey}
                  disabled={isFinished}
                />
              </div>
            </>
          ) : (
            <section className="order-1 rounded-xl border border-border/60 bg-card/80 p-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-primary">
                    {meaningCard.topic}
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-black text-foreground">
                    {meaningCard.word}
                  </h2>
                </div>
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
                {meaningCard.example}
              </p>
              <div className="mt-4 grid gap-2">
                {meaningCard.choices.map((choice) => {
                  const selected = meaningChoice === choice;
                  const correct = choice === meaningCard.definition;
                  const revealed = isFinished;
                  return (
                    <AppButton
                      key={choice}
                      type="button"
                      onClick={() => handleMeaningChoice(choice)}
                      disabled={isFinished}
                      className={`rounded-lg border px-3 py-3 text-left text-sm transition-smooth disabled:cursor-default ${
                        revealed && correct
                          ? "border-primary bg-primary/10 text-primary"
                          : revealed && selected
                            ? "border-destructive/50 bg-destructive/10 text-destructive"
                            : selected
                              ? "border-primary/60 bg-primary/10 text-primary"
                              : "border-border/60 bg-background/40 text-foreground hover:border-primary/40"
                      }`}
                      data-ocid={`practice.meaning_choice.${correct ? "correct" : "distractor"}`}
                    >
                      {choice}
                    </AppButton>
                  );
                })}
              </div>
            </section>
          )}

          <aside className="order-3 flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3 text-center sm:p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Trophy className="mx-auto h-6 w-6 text-primary" />
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {isGuessMode ? "Your round" : "Round result"}
              </p>
              {isGuessMode ? (
                <>
                  <div className="mt-3 text-left">
                    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        You
                      </p>
                      <p className="mt-1 font-display text-lg font-black text-foreground">
                        {guesses.length}/{MAX_GUESSES}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isFinished
                      ? "Round complete."
                      : "Six guesses to find the word."}
                  </p>
                </>
              ) : (
                <div className="mt-3 rounded-lg border border-border/60 bg-background/40 px-3 py-3 text-left">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Meaning Duel
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {status === "playing"
                      ? "Choose the definition."
                      : status === "won"
                        ? "Correct meaning selected."
                        : "Review the correct meaning."}
                  </p>
                </div>
              )}
            </div>
            {message && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                {message}
              </p>
            )}
            {isFinished && (
              <LearningRecap
                key={`recap-${roundId}`}
                word={isGuessMode ? answer : meaningCard.word}
                won={status === "won"}
                guessCount={isGuessMode ? guesses.length : 1}
                mode="practice"
              />
            )}
            {!user && !isFinished && (
              <AppButton
                type="button"
                onClick={() => void navigate({ to: "/login" })}
                className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-display font-bold text-foreground hover:bg-muted/40"
                data-ocid="practice.create_account_button"
              >
                <UserPlus className="h-4 w-4" />
                Sign in to keep words
              </AppButton>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}

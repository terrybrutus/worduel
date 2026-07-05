import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Trophy, UserPlus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { type Guess, TileState } from "../backend";
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
import { PRACTICE_ANSWERS, PRACTICE_GUESSES } from "../lib/practiceDictionary";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

type PracticeStatus = "playing" | "won" | "lost" | "opponentWon";

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

function pickAnswer(previous?: string): string {
  const answers: readonly string[] = PRACTICE_ANSWERS;
  if (answers.length === 0) return "crane";
  if (answers.length === 1) return answers[0];
  let next = answers[randomIndex(answers.length)];
  if (next === previous) {
    next =
      answers[(answers.indexOf(next) + 1) % answers.length];
  }
  return next;
}

function evaluateGuess(guess: string, answer: string): TileState[] {
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

function pickBotGuess(answer: string, turn: number): string {
  const script = ["crane", "light", "sound", "plant", "brave", answer].filter(
    (word) => word !== answer,
  );
  if (turn >= MAX_GUESSES - 1) return answer;
  return script[Math.min(turn, script.length - 1)] ?? answer;
}

export default function Practice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { soundEnabled } = useSoundEnabled();
  const { hapticEnabled } = useHapticEnabled();

  const [answer, setAnswer] = useState(() => pickAnswer());
  const [currentInput, setCurrentInput] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [botGuesses, setBotGuesses] = useState<Guess[]>([]);
  const [status, setStatus] = useState<PracticeStatus>("playing");
  const [message, setMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  const isFinished = status !== "playing";

  const headline = useMemo(() => {
    if (status === "won") return "You solved it first";
    if (status === "opponentWon") return "Computer solved it first";
    if (status === "lost") return "Round complete";
    return "Guest Practice Duel";
  }, [status]);

  const reset = useCallback(() => {
    const nextAnswer = pickAnswer(answer);
    setAnswer(nextAnswer);
    setCurrentInput("");
    setGuesses([]);
    setBotGuesses([]);
    setStatus("playing");
    setMessage(null);
    setIsShaking(false);
    setIsFlipping(false);
  }, [answer]);

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
      if (isFinished) return;

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
        if (!PRACTICE_GUESSES.has(normalized)) {
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

        const botWord = pickBotGuess(answer, botGuesses.length);
        const nextBotGuess = makeGuess(botWord, answer, BigInt(2));
        const nextBotGuesses = [...botGuesses, nextBotGuess];
        setBotGuesses(nextBotGuesses);

        if (botWord === answer) {
          setStatus("opponentWon");
          if (soundEnabled) playLossSound();
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
      botGuesses,
      currentInput,
      guesses,
      isFinished,
      rejectInput,
      soundEnabled,
    ],
  );

  return (
    <div
      className="flex-1 bg-background px-3 py-3 sm:px-4 sm:py-5"
      data-ocid="practice.page"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-5">
        <header className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/lobby" })}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-display font-bold text-foreground hover:bg-muted/40"
            data-ocid="practice.back_button"
          >
            <ArrowLeft className="h-4 w-4" />
            Lobby
          </button>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary">
              Guest mode
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
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Play a fast vocabulary duel against the computer. No account
                required.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-primary/40 px-3 py-2 text-sm font-display font-bold text-primary hover:bg-primary/10"
              data-ocid="practice.new_round_button"
            >
              <RotateCcw className="h-4 w-4" />
              New Round
            </button>
          </div>
        </section>

        <main className="grid gap-3 lg:grid-cols-[1fr_18rem_1fr] lg:gap-5">
          <section className="order-1 rounded-xl border border-border/60 bg-card/80 p-3 sm:p-4">
            <TileGrid
              guesses={guesses}
              currentInput={currentInput}
              isFlipping={isFlipping}
              isShaking={isShaking}
              label="You"
            />
          </section>

          <div className="order-2 sticky bottom-0 z-20 -mx-3 border-t border-border/60 bg-background/95 px-3 py-2 backdrop-blur lg:static lg:col-span-3 lg:mx-0 lg:border-t-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Keyboard
              guesses={guesses}
              onKey={handleKey}
              disabled={isFinished}
            />
          </div>

          <aside className="order-3 flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-3 text-center sm:p-4 lg:order-2">
            <Trophy className="mx-auto h-6 w-6 text-primary" />
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Score
              </p>
              <p className="mt-1 font-display text-lg font-black text-foreground">
                {guesses.length} - {botGuesses.length}
              </p>
            </div>
            {message && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                {message}
              </p>
            )}
            {isFinished && (
              <LearningRecap
                word={answer}
                won={status === "won"}
                guessCount={guesses.length}
                mode="practice"
                opponentWon={status === "opponentWon"}
              />
            )}
            {!user && (
              <button
                type="button"
                onClick={() => void navigate({ to: "/login" })}
                className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-display font-bold text-foreground hover:bg-muted/40"
                data-ocid="practice.create_account_button"
              >
                <UserPlus className="h-4 w-4" />
                Save progress later
              </button>
            )}
          </aside>

          <section className="order-4 rounded-xl border border-border/60 bg-card/80 p-3 sm:p-4 lg:order-3">
            <TileGrid
              guesses={botGuesses}
              currentInput=""
              label="Computer"
              hideSubmittedLetters
            />
          </section>
        </main>
      </div>
    </div>
  );
}

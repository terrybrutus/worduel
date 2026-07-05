import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { pickWords, scramble } from "@/lib/words";

export type GamePhase = "start" | "playing" | "end";

export type RoundOutcome =
  | "correct"
  | "incorrect"
  | "skipped"
  | "timeout"
  | null;

export interface RoundState {
  target: string;
  pool: string[]; // letters available to tap (with stable ids)
  placed: (string | null)[]; // answer slots
  outcome: RoundOutcome;
}

export interface GameState {
  phase: GamePhase;
  roundIndex: number; // 0-based current round
  score: number;
  streak: number;
  bestStreak: number;
  timeLeft: number;
  rounds: RoundState[];
  lastOutcome: RoundOutcome;
}

export interface UseGameOptions {
  totalRounds?: number;
  roundSeconds?: number;
  bestScore?: number;
  onSubmitScore?: (score: number) => void;
}

export const DEFAULT_TOTAL_ROUNDS = 10;
export const DEFAULT_ROUND_SECONDS = 30;
export const POINTS_PER_SECOND = 10;
export const STREAK_BONUS = 25;

interface PoolLetter {
  id: number;
  char: string;
}

interface InternalRound {
  target: string;
  pool: PoolLetter[];
  placed: (number | null)[]; // pool id at each slot, or null
  outcome: RoundOutcome;
}

function buildRound(target: string): InternalRound {
  const scrambled = scramble(target);
  return {
    target,
    pool: scrambled.map((char, i) => ({ id: i, char })),
    placed: target.split("").map(() => null),
    outcome: null,
  };
}

function buildRounds(count: number): InternalRound[] {
  return pickWords(count).map((w) => buildRound(w));
}

export function useGame(options: UseGameOptions = {}) {
  const {
    totalRounds = DEFAULT_TOTAL_ROUNDS,
    roundSeconds = DEFAULT_ROUND_SECONDS,
    bestScore = 0,
    onSubmitScore,
  } = options;

  const [phase, setPhase] = useState<GamePhase>("start");
  const [roundIndex, setRoundIndex] = useState(0);
  const [rounds, setRounds] = useState<InternalRound[]>(() =>
    buildRounds(totalRounds),
  );
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [lastOutcome, setLastOutcome] = useState<RoundOutcome>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  const currentRound = rounds[roundIndex];

  // Derived: placed letters as characters for display
  const placedChars = useMemo(() => {
    if (!currentRound) return [];
    return currentRound.placed.map((id) =>
      id == null
        ? null
        : (currentRound.pool.find((p) => p.id === id)?.char ?? null),
    );
  }, [currentRound]);

  const usedIds = useMemo(
    () =>
      new Set(currentRound?.placed.filter((id): id is number => id != null)),
    [currentRound],
  );

  const isAnswerComplete = useMemo(
    () => currentRound?.placed.every((id) => id != null) ?? false,
    [currentRound],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finalizeRound = useCallback(
    (outcome: Exclude<RoundOutcome, null>) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      clearTimer();

      setRounds((prev) => {
        const next = [...prev];
        next[roundIndex] = { ...next[roundIndex], outcome };
        return next;
      });
      setLastOutcome(outcome);

      if (outcome === "correct") {
        const gained = timeLeft * POINTS_PER_SECOND + streak * STREAK_BONUS;
        setScore((s) => s + gained);
        setStreak((s) => {
          const ns = s + 1;
          setBestStreak((b) => Math.max(b, ns));
          return ns;
        });
      } else {
        setStreak(0);
      }
    },
    [clearTimer, roundIndex, timeLeft, streak],
  );

  const advance = useCallback(() => {
    submittedRef.current = false;
    setLastOutcome(null);
    if (roundIndex + 1 >= totalRounds) {
      setPhase("end");
      return;
    }
    setRoundIndex((i) => i + 1);
    setTimeLeft(roundSeconds);
  }, [roundIndex, totalRounds, roundSeconds]);

  // Timer effect — only runs while playing and restarts each round.
  // roundIndex is intentionally a dependency so the timer resets per round.
  // biome-ignore lint/correctness/useExhaustiveDependencies: roundIndex restarts the timer each round
  useEffect(() => {
    if (phase !== "playing") return;
    if (submittedRef.current) return;
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          finalizeRound("timeout");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase, roundIndex, clearTimer, finalizeRound]);

  // Submit final score to backend when game ends.
  useEffect(() => {
    if (phase !== "end") return;
    if (score > bestScore && onSubmitScore) {
      onSubmitScore(score);
    }
  }, [phase, score, bestScore, onSubmitScore]);

  const start = useCallback(() => {
    setRounds(buildRounds(totalRounds));
    setRoundIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(roundSeconds);
    setLastOutcome(null);
    submittedRef.current = false;
    setPhase("playing");
  }, [totalRounds, roundSeconds]);

  const placeLetter = useCallback(
    (poolId: number) => {
      if (submittedRef.current) return;
      setRounds((prev) => {
        const round = prev[roundIndex];
        if (round == null) return prev;
        const firstEmpty = round.placed.findIndex((id) => id == null);
        if (firstEmpty === -1) return prev;
        const next = [...prev];
        next[roundIndex] = {
          ...round,
          placed: round.placed.map((id, i) => (i === firstEmpty ? poolId : id)),
        };
        return next;
      });
    },
    [roundIndex],
  );

  const removeLetter = useCallback(
    (slotIndex: number) => {
      if (submittedRef.current) return;
      setRounds((prev) => {
        const round = prev[roundIndex];
        if (round == null) return prev;
        if (round.placed[slotIndex] == null) return prev;
        const next = [...prev];
        next[roundIndex] = {
          ...round,
          placed: round.placed.map((id, i) => (i === slotIndex ? null : id)),
        };
        return next;
      });
    },
    [roundIndex],
  );

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    if (!isAnswerComplete) return;
    const guess = placedChars.join("");
    finalizeRound(guess === currentRound.target ? "correct" : "incorrect");
  }, [isAnswerComplete, placedChars, currentRound, finalizeRound]);

  const skip = useCallback(() => {
    if (submittedRef.current) return;
    finalizeRound("skipped");
  }, [finalizeRound]);

  return {
    phase,
    roundIndex,
    totalRounds,
    score,
    streak,
    bestStreak,
    timeLeft,
    roundSeconds,
    bestScore,
    currentRound,
    placedChars,
    usedIds,
    isAnswerComplete,
    lastOutcome,
    start,
    placeLetter,
    removeLetter,
    submit,
    skip,
    advance,
  };
}

import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createActor } from "../backend";
import type { GameState, Guess } from "../backend";
import { GameMode, PlayerOutcome, type TileState } from "../backend";
import { SESSION_KEY } from "../types";
import { isValidWord } from "../words";

function useBackendActor() {
  return useActor((canisterId, uploadFile, downloadFile, options) =>
    createActor(canisterId, uploadFile, downloadFile, options),
  );
}

function getStoredSessionToken(): string {
  return localStorage.getItem(SESSION_KEY) ?? "";
}

function getStoredPlayerName(): string {
  try {
    const raw = localStorage.getItem("__worduel_user__");
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { username?: string };
    return parsed.username ?? "";
  } catch {
    return "";
  }
}

function isOpponentLeft(gameState: GameState | null | undefined): boolean {
  if (!gameState?.exitReason) return false;
  const reason = gameState.exitReason.toLowerCase();
  return reason === "opponent_left" || reason.includes("opponent_left");
}

function isForfeitTimeout(gameState: GameState | null | undefined): boolean {
  if (!gameState?.exitReason) return false;
  const reason = gameState.exitReason.toLowerCase();
  return (
    reason === "forfeit_timeout" ||
    reason.includes("forfeit") ||
    reason.includes("timeout")
  );
}

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

export type JoinStatus = "idle" | "joining" | "error";

export interface UseGameResult {
  // Remote state
  gameState: GameState | null | undefined;
  isLoading: boolean;
  joinStatus: JoinStatus;
  joinError: string | null;
  playerName: string;
  isMyTurn: boolean;
  currentGuesses: Guess[];
  opponentGuessCount: bigint;
  opponentGuessTileStates: TileState[][];
  opponentLeft: boolean;
  forfeitTimeout: boolean;
  myOutcome: PlayerOutcome;
  isHost: boolean;
  hostToken: string | null;
  // Local input state
  currentInput: string;
  invalidWordMessage: string | null;
  isShaking: boolean;
  isFlipping: boolean;
  isSubmitting: boolean;
  handleKey: (key: string) => void;
  forceRefresh: () => void;
}

export function useGame(): UseGameResult {
  const { gameId } = useParams({ from: "/game/$gameId" });
  const search = useSearch({ strict: false }) as Record<string, string>;
  const joinToken = search.join ?? null;

  const { actor, isFetching } = useBackendActor();
  const qc = useQueryClient();

  const sessionToken = getStoredSessionToken();
  const playerName = getStoredPlayerName();

  // Input state
  const [currentInput, setCurrentInput] = useState("");
  const [invalidWordMessage, setInvalidWordMessage] = useState<string | null>(
    null,
  );
  const [isShaking, setIsShaking] = useState(false);
  // isFlipping triggers only after the server confirms a new guess (via guess count delta)
  const [isFlipping, setIsFlipping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track guess count so we fire flip animation when the server confirms a new entry
  const prevGuessCountRef = useRef<number>(-1);

  const triggerShake = useCallback((message: string) => {
    setIsShaking(true);
    setInvalidWordMessage(message);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => {
      setIsShaking(false);
      setInvalidWordMessage(null);
    }, 1500);
  }, []);

  // Join token handling
  const joinAttemptedRef = useRef(false);
  const joinStatusRef = useRef<JoinStatus>("idle");
  const joinErrorRef = useRef<string | null>(null);
  const hostToken = (search.hostToken as string) ?? null;
  const urlCleanedRef = useRef(false);

  useEffect(() => {
    if (!hostToken || urlCleanedRef.current) return;
    urlCleanedRef.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("hostToken");
    window.history.replaceState({}, "", url.toString());
  }, [hostToken]);

  useEffect(() => {
    if (!joinToken || !actor || isFetching || joinAttemptedRef.current) return;
    if (!sessionToken) return;
    joinAttemptedRef.current = true;
    joinStatusRef.current = "joining";

    actor
      .joinByToken(sessionToken, joinToken, null)
      .then((result) => {
        if (result.__kind__ === "err") {
          joinStatusRef.current = "error";
          joinErrorRef.current = result.err;
        } else {
          joinStatusRef.current = "idle";
          const url = new URL(window.location.href);
          url.searchParams.delete("join");
          window.history.replaceState({}, "", url.toString());
          void qc.invalidateQueries({ queryKey: ["game", gameId] });
        }
      })
      .catch(() => {
        joinStatusRef.current = "error";
        joinErrorRef.current =
          "This join link has expired. Ask your partner for the room code.";
      });
  }, [joinToken, actor, isFetching, gameId, sessionToken, qc]);

  const { data: gameState, isLoading } = useQuery<GameState | null>({
    queryKey: ["game", gameId, sessionToken],
    queryFn: async () => {
      if (!actor || !gameId || !sessionToken) return null;
      const result = await actor.getGameState(sessionToken, gameId);
      if (result.__kind__ === "err") return null;
      return result.ok;
    },
    enabled:
      !!actor &&
      !isFetching &&
      !!gameId &&
      !!sessionToken &&
      joinStatusRef.current !== "joining",
    refetchInterval: (query) => {
      const data = query.state.data as GameState | null | undefined;
      if (!data) return 2000;
      const s = data.status.__kind__;
      // Stop polling for fully resolved terminal states
      if (s === "expired") return false;
      if (s === "won") return false;
      // FIX #3: keep polling after opponentWon so versus resolution arrives promptly
      if (s === "lost" && data.myOutcome !== PlayerOutcome.opponentWon)
        return false;
      return 2000;
    },
  });

  const forceRefresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["game", gameId] });
  }, [qc, gameId]);

  const isMyTurn = useMemo(() => {
    if (!gameState) return false;
    if (gameState.mode === GameMode.coop) {
      return gameState.currentTurn === gameState.playerNum;
    }
    // In versus: turn is yours as long as you're still playing
    if (gameState.myOutcome !== PlayerOutcome.playing) return false;
    const s = gameState.status.__kind__;
    if (s === "won" || s === "lost" || s === "expired" || s === "waiting")
      return false;
    return true;
  }, [gameState]);

  const currentGuesses = useMemo((): Guess[] => {
    if (!gameState) return [];
    if (gameState.mode === GameMode.coop) return gameState.coopGuesses;
    return gameState.myGuesses;
  }, [gameState]);

  // Trigger flip animation when the server confirms a new guess was added
  useEffect(() => {
    if (!gameState) return;
    const guesses =
      gameState.mode === GameMode.coop
        ? gameState.coopGuesses
        : gameState.myGuesses;
    const count = guesses.length;
    if (prevGuessCountRef.current >= 0 && count > prevGuessCountRef.current) {
      setIsFlipping(true);
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      // 5 tiles * 80ms stagger + 600ms flip duration = ~1000ms total
      flipTimerRef.current = setTimeout(() => setIsFlipping(false), 1100);
    }
    prevGuessCountRef.current = count;
  }, [gameState]);

  const handleKey = useCallback(
    async (key: string) => {
      if (!isMyTurn || isSubmitting || !actor || !sessionToken || !gameId)
        return;
      const guesses =
        gameState?.mode === GameMode.coop
          ? (gameState?.coopGuesses ?? [])
          : (gameState?.myGuesses ?? []);
      if (guesses.length >= MAX_GUESSES) return;

      if (key === "BACKSPACE") {
        setCurrentInput((prev) => prev.slice(0, -1));
        return;
      }

      if (key === "ENTER") {
        if (currentInput.length < WORD_LENGTH) {
          triggerShake("Not enough letters");
          return;
        }

        // Optional fast-path validation. The backend remains authoritative.
        if (!isValidWord(currentInput)) {
          triggerShake("Not a word");
          return;
        }

        // FIX #1: Reject already-submitted duplicate guesses
        const alreadyGuessed = guesses.some(
          (g) => g.word.toLowerCase() === currentInput.toLowerCase(),
        );
        if (alreadyGuessed) {
          triggerShake("Already guessed");
          return;
        }

        setIsSubmitting(true);
        try {
          const result = await actor.submitGuess(
            sessionToken,
            gameId,
            currentInput.toLowerCase(),
          );

          if (result.__kind__ === "err") {
            const errKind = result.err.__kind__;
            if (errKind === "notAWord") {
              triggerShake("Not a word");
            } else if (errKind === "notYourTurn") {
              triggerShake("Wait for your turn");
            } else if (errKind === "gameError") {
              triggerShake(
                (result.err as { __kind__: "gameError"; gameError: string })
                  .gameError,
              );
            } else {
              triggerShake("Could not submit guess");
            }
            return;
          }

          // Success: clear input and refresh; flip animation fires via guess count effect
          setCurrentInput("");
          void qc.invalidateQueries({ queryKey: ["game", gameId] });
        } catch {
          triggerShake("Connection error, try again");
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      // Regular letter
      if (/^[A-Z]$/.test(key) && currentInput.length < WORD_LENGTH) {
        setCurrentInput((prev) => prev + key);
      }
    },
    [
      isMyTurn,
      isSubmitting,
      actor,
      sessionToken,
      gameId,
      currentInput,
      gameState,
      triggerShake,
      qc,
    ],
  );

  // Reset input when turn changes (coop: opponent just played)
  const prevTurnRef = useRef<bigint | null>(null);
  useEffect(() => {
    if (!gameState) return;
    if (
      prevTurnRef.current !== null &&
      prevTurnRef.current !== gameState.currentTurn
    ) {
      setCurrentInput("");
    }
    prevTurnRef.current = gameState.currentTurn;
  }, [gameState]);

  const opponentGuessCount = gameState?.opponentGuessCount ?? BigInt(0);
  const opponentGuessTileStates: TileState[][] =
    gameState?.opponentGuessTileStates ?? [];

  return {
    gameState: gameState ?? null,
    isLoading,
    joinStatus: joinStatusRef.current,
    joinError: joinErrorRef.current,
    playerName,
    isMyTurn,
    currentGuesses,
    opponentGuessCount,
    opponentGuessTileStates,
    opponentLeft: isOpponentLeft(gameState),
    forfeitTimeout: isForfeitTimeout(gameState),
    myOutcome: gameState?.myOutcome ?? PlayerOutcome.playing,
    isHost: Number(gameState?.playerNum ?? 1) === 1,
    hostToken,
    currentInput,
    invalidWordMessage,
    isShaking,
    isFlipping,
    isSubmitting,
    handleKey,
    forceRefresh,
  };
}

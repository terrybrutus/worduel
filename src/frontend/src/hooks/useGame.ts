import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameState, Guess } from "../backend";
import { GameMode, PlayerOutcome, type TileState } from "../backend";
import { GameAccessError } from "../lib/gameConnection";
import { gameWordLength, localBackend, localGuest } from "../lib/localBackend";
import { SESSION_KEY } from "../types";

function useBackendActor() {
  return { actor: localBackend, isFetching: false };
}

function getStoredSessionToken(): string {
  if (localGuest()) return localGuest()!.token;
  return localStorage.getItem(SESSION_KEY) ?? "";
}

function getStoredPlayerName(): string {
  if (localGuest()) return localGuest()!.username;
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

const MAX_GUESSES = 6;

export type JoinStatus = "idle" | "joining" | "error";

export interface UseGameResult {
  // Remote state
  gameState: GameState | null | undefined;
  isLoading: boolean;
  connection: "connected" | "reconnecting" | "offline";
  loadError: string | null;
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
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const changed = () => setOnline(navigator.onLine);
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    return () => {
      window.removeEventListener("online", changed);
      window.removeEventListener("offline", changed);
    };
  }, []);

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
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const hostToken = (search.hostToken as string) ?? null;
  const urlCleanedRef = useRef(false);
  const activeGameId = useRef(gameId);
  activeGameId.current = gameId;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset transient input when the room or session changes.
  useEffect(() => {
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    setCurrentInput("");
    setInvalidWordMessage(null);
    setIsShaking(false);
    setIsFlipping(false);
    setIsSubmitting(false);
    prevGuessCountRef.current = -1;
    prevTurnRef.current = null;
    joinAttemptedRef.current = false;
    setJoinStatus("idle");
    setJoinError(null);
  }, [gameId, joinToken, sessionToken]);

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
    setJoinStatus("joining");

    actor
      .joinByToken(sessionToken, joinToken, null)
      .then((result) => {
        if (result.__kind__ === "err") {
          setJoinStatus("error");
          setJoinError(result.err);
        } else {
          setJoinStatus("idle");
          const url = new URL(window.location.href);
          url.searchParams.delete("join");
          window.history.replaceState({}, "", url.toString());
          void qc.invalidateQueries({ queryKey: ["game", gameId] });
        }
      })
      .catch(() => {
        setJoinStatus("error");
        setJoinError(
          "Could not connect. Check your connection and reopen this invitation.",
        );
      });
  }, [joinToken, actor, isFetching, gameId, sessionToken, qc]);

  const gameQuery = useQuery<GameState | null>({
    queryKey: ["game", gameId, sessionToken],
    queryFn: async () => {
      if (!actor || !gameId || !sessionToken) return null;
      const result = await actor.getGameState(sessionToken, gameId);
      if (result.__kind__ === "err") throw new GameAccessError(result.err);
      return result.ok;
    },
    enabled:
      !!actor &&
      !isFetching &&
      !!gameId &&
      !!sessionToken &&
      joinStatus !== "joining",
    retry: (count, error) => !(error instanceof GameAccessError) && count < 2,
    refetchOnReconnect: "always",
    refetchInterval: (query) => {
      if (query.state.error instanceof GameAccessError) return false;
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
  const { data: gameState, isLoading } = gameQuery;
  const accessError =
    gameQuery.error instanceof GameAccessError ? gameQuery.error.message : null;
  const connection = !online
    ? "offline"
    : gameQuery.failureCount > 0 || (gameQuery.isError && !accessError)
      ? "reconnecting"
      : "connected";

  useEffect(
    () => () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    },
    [],
  );

  const forceRefresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["game", gameId] });
  }, [qc, gameId]);
  const WORD_LENGTH = gameWordLength(gameState);

  const isMyTurn = useMemo(() => {
    if (
      !gameState ||
      connection !== "connected" ||
      accessError ||
      gameState.status.__kind__ !== "playing"
    )
      return false;
    if (gameState.mode === GameMode.coop) {
      return gameState.currentTurn === gameState.playerNum;
    }
    // In versus: turn is yours as long as you're still playing
    if (gameState.myOutcome !== PlayerOutcome.playing) return false;
    return true;
  }, [gameState, connection, accessError]);

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
    // A committed guess can arrive after its original response was lost.
    if (count) {
      const committedWord = guesses[count - 1].word.toLowerCase();
      setCurrentInput((input) =>
        committedWord === input.toLowerCase() ? "" : input,
      );
    }
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
          if (activeGameId.current !== gameId) return;

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
          if (activeGameId.current !== gameId) return;
          triggerShake("Connection error, try again");
        } finally {
          if (activeGameId.current === gameId) setIsSubmitting(false);
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
      WORD_LENGTH,
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
    isLoading: isLoading || joinStatus === "joining",
    connection,
    loadError: accessError || joinError,
    joinStatus,
    joinError,
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

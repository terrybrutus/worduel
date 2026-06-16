import { useEffect, useRef } from "react";
import type { GameState } from "../backend";

export function usePolling(fn: () => void, intervalMs: number, enabled = true) {
  const savedFn = useRef(fn);
  useEffect(() => {
    savedFn.current = fn;
  });

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => savedFn.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}

/** Returns true when a game is in a terminal state and polling should stop. */
export function isGameFinished(
  gameState: GameState | null | undefined,
): boolean {
  if (!gameState) return false;
  const s = gameState.status.__kind__;
  return s === "won" || s === "lost" || s === "expired";
}

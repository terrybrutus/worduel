import { useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GameSummary } from "../backend";
import { useAuth } from "../hooks/useAuth";
import { useMyActiveGames } from "../hooks/useBackend";

function useCurrentGameId(): string | null {
  const state = useRouterState();
  const match = state.location.pathname.match(/^\/game\/(.+)$/);
  return match ? match[1] : null;
}

function CoopAlert({
  game,
  onNavigate,
  onDismiss,
}: {
  game: GameSummary;
  onNavigate: () => void;
  onDismiss: () => void;
}) {
  const partner = game.players.find((p) => p !== "") ?? "your partner";

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-primary/15 border border-primary/50 rounded-xl shadow-[0_4px_24px_oklch(var(--primary)/0.3)] backdrop-blur-sm max-w-[calc(100vw-2rem)]"
      data-ocid="cross_game_alert.banner"
      style={{ animation: "worduel-slide-down 0.3s ease-out both" }}
    >
      <span className="relative flex-shrink-0">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-ping opacity-75" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
      </span>

      <button
        type="button"
        onClick={onNavigate}
        data-ocid="cross_game_alert.navigate_button"
        className="flex-1 min-w-0 text-left"
      >
        <span className="font-display font-bold text-primary text-xs sm:text-sm truncate block leading-tight">
          Co-op partner is waiting — {game.roomCode}
        </span>
        <span className="font-mono text-[10px] text-primary/60 truncate block">
          {partner} is waiting for your turn
        </span>
      </button>

      <button
        type="button"
        onClick={onNavigate}
        data-ocid="cross_game_alert.play_button"
        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-display font-bold text-xs uppercase tracking-wide hover:brightness-110 transition-all duration-150 active:scale-95"
        aria-label="Play your turn"
      >
        Play
      </button>

      <button
        type="button"
        onClick={onDismiss}
        data-ocid="cross_game_alert.dismiss_button"
        className="flex-shrink-0 p-1 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors duration-150"
        aria-label="Dismiss alert"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function CrossGameAlert() {
  const { user, sessionToken } = useAuth();
  const navigate = useNavigate();
  const currentGameId = useCurrentGameId();
  // Guard: only call useMyActiveGames when we have a real sessionToken
  const { data: activeGames } = useMyActiveGames(sessionToken ?? null);

  const pendingGames: GameSummary[] = (activeGames ?? []).filter((g) => {
    if (!g?.id) return false;
    if (g.id === currentGameId) return false;
    const isCoop =
      g.mode === "coop" ||
      (typeof g.mode === "object" &&
        g.mode !== null &&
        "coop" in (g.mode as object));
    if (!isCoop) return false;
    return !!g.waitingForMove;
  });

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const prevPendingIds = useRef<string>("");
  const currentPendingIds = pendingGames
    .map((g) => g.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (prevPendingIds.current !== currentPendingIds) {
      setDismissed((prev) => {
        const stillPending = new Set(pendingGames.map((g) => g.id));
        const next = new Set([...prev].filter((id) => !stillPending.has(id)));
        if (next.size === prev.size) return prev;
        return next;
      });
      prevPendingIds.current = currentPendingIds;
    }
  }, [currentPendingIds, pendingGames]);

  const visibleGames = pendingGames.filter((g) => !dismissed.has(g.id));

  if (!user || visibleGames.length === 0) return null;

  const game = visibleGames[0];

  return (
    <CoopAlert
      key={game.id}
      game={game}
      onNavigate={() =>
        void navigate({ to: "/game/$gameId", params: { gameId: game.id } })
      }
      onDismiss={() => setDismissed((prev) => new Set([...prev, game.id]))}
    />
  );
}

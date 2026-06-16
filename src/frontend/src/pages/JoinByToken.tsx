import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import { useJoinByToken, useMyActiveGames } from "../hooks/useBackend";

// Classifies a backend error message into a user-friendly category
function classifyJoinError(errMsg: string): {
  title: string;
  detail: string;
  alreadyInGame: boolean;
} {
  const lower = errMsg.toLowerCase();
  if (
    lower.includes("already in") ||
    lower.includes("already a player") ||
    lower.includes("already joined")
  ) {
    return {
      title: "Already in this game",
      detail: "You're already a player in this game. Jump back in below.",
      alreadyInGame: true,
    };
  }
  if (
    lower.includes("not found") ||
    lower.includes("invalid token") ||
    lower.includes("expired")
  ) {
    return {
      title: "Invite link expired",
      detail:
        "This invite link is no longer valid. Ask your opponent to send a new one.",
      alreadyInGame: false,
    };
  }
  if (
    lower.includes("started") ||
    lower.includes("in progress") ||
    lower.includes("playing")
  ) {
    return {
      title: "Game already started",
      detail:
        "This game is already in progress and is no longer accepting new players.",
      alreadyInGame: false,
    };
  }
  return {
    title: "Couldn't Join Game",
    detail: errMsg,
    alreadyInGame: false,
  };
}

export default function JoinByToken() {
  const { joinToken } = useParams({ from: "/game/join/$joinToken" });
  // Read optional ?gameId= hint from the URL (added by InviteModal for reliability)
  const search = useSearch({ strict: false }) as Record<string, string>;
  const gameIdHint = search.gameId ?? null;
  const { sessionToken, user } = useAuth();
  const navigate = useNavigate();
  const joinByToken = useJoinByToken();
  const didJoin = useRef(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [resolvedGameId, setResolvedGameId] = useState<string | null>(null);

  // After a failure, poll active games to see if we're already in this game
  const { data: activeGames } = useMyActiveGames(
    joinError ? sessionToken : null,
  );

  // If active games loaded after a join error, check for a match by join token
  // (the token is embedded in the game's joinToken field if still waiting, or
  // we match via any game that was recently found).  Since we can't match token
  // directly, we redirect to the first game found within 3s of the error.
  useEffect(() => {
    if (!joinError || !activeGames || resolvedGameId) return;
    if (activeGames.length > 0) {
      // Check if error indicates the player is already in the game
      const errInfo = classifyJoinError(joinError);
      if (errInfo.alreadyInGame) {
        // Redirect to the most recently active game (best proxy for the invited game)
        const target = activeGames[0];
        setResolvedGameId(target.id);
        void navigate({
          to: "/game/$gameId",
          params: { gameId: target.id },
          replace: true,
        });
      }
    }
  }, [joinError, activeGames, resolvedGameId, navigate]);

  useEffect(() => {
    if (!sessionToken || !user || didJoin.current) return;
    didJoin.current = true;
    joinByToken.mutate(
      { sessionToken, joinToken, gameIdHint },
      {
        onSuccess: (gameState) => {
          const targetId = gameState.id || gameIdHint || "";
          void navigate({
            to: "/game/$gameId",
            params: { gameId: targetId },
            replace: true,
          });
        },
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Could not join game";
          // If we have a gameId hint and the error indicates the player is already in,
          // redirect directly without waiting for active-games polling.
          const classified = classifyJoinError(msg);
          if (classified.alreadyInGame && gameIdHint) {
            setResolvedGameId(gameIdHint);
            void navigate({
              to: "/game/$gameId",
              params: { gameId: gameIdHint },
              replace: true,
            });
            return;
          }
          setJoinError(msg);
        },
      },
    );
  }, [sessionToken, user, joinToken, gameIdHint, joinByToken, navigate]);

  if (!user) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-background"
        data-ocid="join_by_token.page"
      >
        <p className="text-muted-foreground font-body text-sm">
          Sign in to join this game.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void navigate({ to: "/lobby" })}
          data-ocid="join_by_token.go_lobby_button"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (joinError) {
    const errInfo = classifyJoinError(joinError);
    // If we detected the player is already in the game, show a brief redirect message
    if (errInfo.alreadyInGame && resolvedGameId) {
      return (
        <div
          className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-background"
          data-ocid="join_by_token.redirect_state"
        >
          <LoadingSpinner size="lg" />
          <p className="font-display font-bold text-foreground">
            Resuming your game…
          </p>
        </div>
      );
    }
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-background px-6 text-center"
        data-ocid="join_by_token.error_state"
      >
        <div className="text-4xl">{errInfo.alreadyInGame ? "🔄" : "😕"}</div>
        <div className="space-y-2 max-w-xs">
          <h2 className="text-xl font-display font-bold text-foreground">
            {errInfo.title}
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            {errInfo.detail}
          </p>
        </div>
        {errInfo.alreadyInGame && activeGames && activeGames.length > 0 && (
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              void navigate({
                to: "/game/$gameId",
                params: { gameId: activeGames[0].id },
                replace: true,
              })
            }
            data-ocid="join_by_token.resume_game_button"
          >
            Resume Game
          </button>
        )}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void navigate({ to: "/lobby", replace: true })}
          data-ocid="join_by_token.back_to_lobby_button"
        >
          Go to Lobby
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-background"
      data-ocid="join_by_token.page"
    >
      <LoadingSpinner size="lg" />
      <div className="text-center space-y-1">
        <p className="font-display font-bold text-foreground">Joining game…</p>
        <p className="text-muted-foreground font-body text-sm">
          Please wait while we connect you
        </p>
      </div>
    </div>
  );
}

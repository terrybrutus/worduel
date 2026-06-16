import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type {
  GameHistoryEntry,
  GameState,
  GameSummary,
  OpponentRecord,
  PlayerInfo,
  PlayerStats,
  RematchOffer,
} from "../backend";
import { GameMode } from "../backend";

function useBackendActor() {
  return useActor((canisterId, uploadFile, downloadFile, options) =>
    createActor(canisterId, uploadFile, downloadFile, options),
  );
}

export function usePublicGames() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<GameSummary[]>({
    queryKey: ["publicGames"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPublicGames();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 2500,
  });
}

export function useMyActiveGames(sessionToken: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<GameSummary[]>({
    queryKey: ["myActiveGames", sessionToken],
    queryFn: async () => {
      if (!actor || !sessionToken) return [];
      const games = await actor.getMyActiveGames(sessionToken);
      // Filter out all terminal statuses so they don't linger in the active list
      const TERMINAL_STATUSES = new Set([
        "cancelled",
        "abandoned",
        "expired",
        "lost",
        "won",
        "draw",
        "wonByPlayer1",
        "wonByPlayer2",
        "finished",
      ]);
      return games.filter(
        (g) =>
          !TERMINAL_STATUSES.has((g.status as { __kind__: string }).__kind__),
      );
    },
    enabled: !!actor && !isFetching && !!sessionToken,
    refetchInterval: 3000,
  });
}

export function useGameState(
  gameId: string | null,
  sessionToken: string | null,
) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<GameState | null>({
    queryKey: ["game", gameId, sessionToken],
    queryFn: async () => {
      if (!actor || !gameId || !sessionToken) return null;
      const result = await actor.getGameState(sessionToken, gameId);
      if (result.__kind__ === "err") return null;
      return result.ok;
    },
    enabled: !!actor && !isFetching && !!gameId && !!sessionToken,
    refetchInterval: 2500,
  });
}

export function useCreateGame() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionToken,
      mode,
      isPrivate,
    }: {
      sessionToken: string;
      mode: GameMode;
      isPrivate: boolean;
    }) => {
      if (!actor) throw new Error("Not connected");
      if (isPrivate) {
        const result = await actor.createPrivateGame(sessionToken, mode);
        if (result.__kind__ === "err") throw new Error(result.err);
        return result.ok;
      }
      const result = await actor.createPublicGame(sessionToken, mode);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["publicGames"] });
      void qc.invalidateQueries({ queryKey: ["myActiveGames"] });
    },
  });
}

export function useJoinGame() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roomCode,
      sessionToken,
      joinToken = null,
    }: {
      roomCode: string;
      sessionToken: string;
      joinToken?: string | null;
    }): Promise<GameState> => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.joinGame(
        sessionToken,
        roomCode,
        joinToken ?? null,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["game", data.id] });
      void qc.invalidateQueries({ queryKey: ["publicGames"] });
      void qc.invalidateQueries({ queryKey: ["myActiveGames"] });
    },
  });
}

export function useJoinByToken() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionToken,
      joinToken,
      gameIdHint,
    }: {
      sessionToken: string;
      joinToken: string;
      gameIdHint?: string | null;
    }): Promise<GameState> => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.joinByToken(
        sessionToken,
        joinToken,
        gameIdHint ?? null,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["game", data.id] });
      void qc.invalidateQueries({ queryKey: ["myActiveGames"] });
    },
  });
}

export function useValidateWord() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async (word: string): Promise<boolean> => {
      if (!actor) return true;
      return actor.validateGuessWord(word);
    },
  });
}

export function useSubmitGuess() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gameId,
      sessionToken,
      word,
    }: {
      gameId: string;
      sessionToken: string;
      word: string;
    }): Promise<GameState> => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.submitGuess(sessionToken, gameId, word);
      if (result.__kind__ === "err") {
        let msg = "Guess error";
        if (result.err.__kind__ === "notAWord") {
          msg = "Not a word";
        } else if (result.err.__kind__ === "gameError") {
          msg = result.err.gameError;
        } else {
          msg = "Not your turn";
        }
        throw new Error(msg);
      }
      return result.ok;
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["game", vars.gameId] });
    },
  });
}

export function useLeaveGame() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gameId,
      sessionToken,
    }: {
      gameId: string;
      sessionToken: string;
    }): Promise<void> => {
      if (!actor) return;
      const result = await actor.leaveGame(sessionToken, gameId);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["game", vars.gameId] });
      void qc.invalidateQueries({ queryKey: ["publicGames"] });
      void qc.invalidateQueries({ queryKey: ["myActiveGames"] });
    },
  });
}

export function useRequestRematch() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gameId,
      sessionToken,
    }: {
      gameId: string;
      sessionToken: string;
    }): Promise<{ newGameId: string; roomCode: string; joinToken: string }> => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.requestRematch(sessionToken, gameId);
      if (result.__kind__ === "err") throw new Error(result.err);
      const { newGameId, roomCode, joinToken } = result.ok;
      return { newGameId, roomCode, joinToken };
    },
    onSuccess: (data) => {
      // Pre-warm the new game's cache key so it fetches immediately on navigation
      void qc.invalidateQueries({ queryKey: ["game", data.newGameId] });
      void qc.invalidateQueries({ queryKey: ["myActiveGames"] });
      void qc.invalidateQueries({ queryKey: ["publicGames"] });
    },
  });
}

export function useMyStats(token: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<PlayerStats | null>({
    queryKey: ["myStats", token],
    queryFn: async () => {
      if (!actor || !token) return null;
      return actor.getMyStats(token);
    },
    enabled: !!actor && !isFetching && !!token,
    refetchInterval: 5000,
  });
}

export function useMyGameHistory(playerName: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<GameHistoryEntry[]>({
    queryKey: ["myGameHistory", playerName],
    queryFn: async () => {
      if (!actor || !playerName) return [];
      return actor.getMyGameHistory(playerName);
    },
    enabled: !!actor && !isFetching && !!playerName,
  });
}

export function useOpponentStats(token: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Array<[string, OpponentRecord]>>({
    queryKey: ["myOpponentStats", token],
    queryFn: async () => {
      if (!actor || !token) return [];
      return actor.getMyOpponentStats(token);
    },
    enabled: !!actor && !isFetching && !!token,
    refetchInterval: 10000,
  });
}

export function useGetAdminSetupInfo() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["adminSetupInfo"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAdminSetupInfo();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListAllPlayers(token: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<PlayerInfo[]>({
    queryKey: ["allPlayers", token],
    queryFn: async () => {
      if (!actor || !token) return [];
      return actor.listAllPlayers(token);
    },
    enabled: !!actor && !isFetching && !!token,
    refetchInterval: 5000,
  });
}

export function useResetPlayerPassword() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      username,
      newPassword,
    }: {
      token: string;
      username: string;
      newPassword: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.resetPlayerPassword(
        token,
        username,
        newPassword,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["allPlayers"] });
    },
  });
}

export function useDisablePlayer() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      username,
    }: { token: string; username: string }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.disablePlayer(token, username);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["allPlayers"] });
    },
  });
}

export function useEnablePlayer() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      username,
    }: { token: string; username: string }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.enablePlayer(token, username);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["allPlayers"] });
    },
  });
}

export function useChangePassword() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async ({
      token,
      oldPassword,
      newPassword,
    }: {
      token: string;
      oldPassword: string;
      newPassword: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.changePassword(
        token,
        oldPassword,
        newPassword,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
    },
  });
}

export function useGamesNeedingAction(
  sessionToken: string | null,
  excludeGameId?: string | null,
): GameSummary[] {
  const { data: activeGames } = useMyActiveGames(sessionToken);
  return (activeGames ?? []).filter((g) => {
    if (excludeGameId && g.id === excludeGameId) return false;
    if (g.mode !== GameMode.coop) return false;
    return g.waitingForMove;
  });
}

export function useWordCount() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<bigint>({
    queryKey: ["wordCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getWordCount();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

export function useAllWords(token: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<string[]>({
    queryKey: ["allWords", token],
    queryFn: async () => {
      if (!actor || !token) return [];
      const result = await actor.getAllWords(token);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    enabled: !!actor && !isFetching && !!token,
  });
}

export function useAddWord() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ token, word }: { token: string; word: string }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.addWord(token, word);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["allWords"] });
      void qc.invalidateQueries({ queryKey: ["wordCount"] });
    },
  });
}

export function useRemoveWord() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ token, word }: { token: string; word: string }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.removeWord(token, word);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["allWords"] });
      void qc.invalidateQueries({ queryKey: ["wordCount"] });
    },
  });
}

// useFetchDatamuseWords removed — Datamuse integration deleted

export function useImportWords() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      words,
    }: {
      token: string;
      words: string[];
    }): Promise<{ added: bigint; unauthorized: boolean }> => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.importWords(token, words);
      // Return the full result so the caller can handle unauthorized gracefully
      // (e.g. retry with a delay) instead of throwing immediately.
      return { added: result.added, unauthorized: result.unauthorized };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["allWords"] });
      void qc.invalidateQueries({ queryKey: ["wordCount"] });
    },
  });
}

export function usePromoteToAdmin() {
  const { actor } = useBackendActor();
  return useMutation({
    mutationFn: async ({
      username,
      secretKey,
    }: {
      username: string;
      secretKey: string;
    }): Promise<void> => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.promoteToAdmin(username, secretKey);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
  });
}

// ── Rematch offer polling ─────────────────────────────────────────────────────
export function useRematchOffer(gameId: string | null, enabled: boolean) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<RematchOffer | null>({
    queryKey: ["rematchOffer", gameId],
    queryFn: async () => {
      if (!actor || !gameId) return null;
      return actor.getRematchOffer(gameId);
    },
    enabled: !!actor && !isFetching && !!gameId && enabled,
    refetchInterval: 3000,
  });
}

// ── Accept rematch — PB joins the new game created by PA ──────────────────────
export function useAcceptRematch() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionToken,
      originalGameId,
    }: {
      sessionToken: string;
      originalGameId: string;
    }): Promise<string> => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.acceptRematch(sessionToken, originalGameId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok.newGameId;
    },
    onSuccess: (newGameId) => {
      void qc.invalidateQueries({ queryKey: ["game", newGameId] });
      void qc.invalidateQueries({ queryKey: ["myActiveGames"] });
    },
  });
}

export function useAllPlayerStats(token: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<PlayerInfo[]>({
    queryKey: ["allPlayerStats", token],
    queryFn: async () => {
      if (!actor || !token) return [];
      return actor.getAllPlayerStats(token);
    },
    enabled: !!actor && !isFetching && !!token,
    refetchInterval: 5000,
  });
}

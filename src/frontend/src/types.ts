// Re-exports from backend.d.ts
export type {
  GameState,
  GameSummary,
  GameHistoryEntry,
  GameStatus,
  Guess,
  PlayerStats,
  PlayerInfo,
  AdminSetupInfo,
  Role,
  SessionToken,
  GameStateWithRole,
  CreatePrivateGameResult,
  CreateGameResult,
  OpponentRecord,
  JoinResult,
  GuessResultV2,
  LeaveResult,
  AuthResult,
  LoginResult,
  GameId,
  RoomCode,
  Timestamp,
} from "./backend";

export { GameMode, TileState, Role as RoleEnum } from "./backend";

// Frontend convenience types
export interface LocalSession {
  username: string;
  sessionToken: string;
}

export interface FrontendPlayerStats {
  totalWins: number;
  totalLosses: number;
  currentStreak: number;
  bestStreak: number;
}

import type { GameState, GameStatus } from "./backend";

export function isGameStatus(
  status: GameStatus | undefined | null,
  variant: "waiting" | "playing" | "won" | "lost" | "expired",
): boolean {
  if (!status) return false;
  return status.__kind__ === variant;
}

export function getOpponentName(
  state: GameState | null | undefined,
  myUsername: string,
): string {
  if (!state) return "Opponent";
  const opponent = state.players.find((p) => p !== myUsername);
  return opponent ?? "Opponent";
}

export function gameStatusLabel(status: GameStatus | undefined | null): string {
  if (!status) return "Unknown";
  switch (status.__kind__) {
    case "waiting":
      return "Waiting for opponent";
    case "playing":
      return "In progress";
    case "won":
      return "Complete";
    case "lost":
      return "Game over";
    case "expired":
      return "Expired";
    default:
      return "Unknown";
  }
}

export const SESSION_KEY = "__worduel_session__";
export const SOUND_KEY = "__worduel_sound__";
// Admin username check removed — admin status is determined by backend role or admin_promoted_* localStorage flag only.

export function getOpponentUsername(
  state: GameState | null | undefined,
  myUsername: string,
): string {
  return getOpponentName(state, myUsername);
}

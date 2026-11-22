import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export type LeaveResult = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export type PlayerName = string;
export interface Quiz {
    savedDefinition: string;
    sentence?: Sentence;
    source: string;
    word: string;
    sourceUrl: string;
    alternatives: Array<Alternative>;
    aiGenerated: boolean;
}
export interface AdminSetupInfo {
    initialPassword: string;
    username: string;
}
export interface GameStateWithRole {
    isHost: boolean;
    gameState: GameState;
}
export interface GameSummary {
    id: GameId;
    status: GameStatus;
    mode: GameMode;
    createdAt: Timestamp;
    waitingForMove: boolean;
    players: Array<PlayerName>;
    isPublic: boolean;
    roomCode: RoomCode;
}
export interface Alternative {
    word: string;
    definition: string;
}
export type RegisterResult = {
    __kind__: "ok";
    ok: SessionToken;
} | {
    __kind__: "err";
    err: string;
};
export interface Meaning {
    source: string;
    aiEnhanced: boolean;
    sourceUrl: string;
    example: string;
    originalDefinition: string;
    definition: string;
}
export type GameId = string;
export type GameStatus = {
    __kind__: "won";
    won: bigint;
} | {
    __kind__: "expired";
    expired: null;
} | {
    __kind__: "lost";
    lost: null;
} | {
    __kind__: "playing";
    playing: null;
} | {
    __kind__: "waiting";
    waiting: null;
};
export type SessionToken = string;
export interface PlayerInfo {
    username: string;
    createdAt: Timestamp;
    role: Role;
    stats: PlayerStats;
    isDisabled: boolean;
}
export type JoinResult = {
    __kind__: "ok";
    ok: GameState;
} | {
    __kind__: "err";
    err: string;
};
export type AcceptRematchResult = {
    __kind__: "ok";
    ok: {
        newGameId: GameId;
    };
} | {
    __kind__: "err";
    err: string;
};
export interface Guess {
    playerNum: bigint;
    states: Array<TileState>;
    word: string;
    timestamp: Timestamp;
}
export interface WordValidationDebug {
    lengthOk: boolean;
    acceptedAsAnswer: boolean;
    source: string;
    alphabetic: boolean;
    backendBuild: string;
    guessWordCount: bigint;
    dictionaryVersion: string;
    word: string;
    customWordCount: bigint;
    answerWordCount: bigint;
    acceptedAsGuess: boolean;
    normalized: string;
}
export type CreatePrivateGameResult = {
    __kind__: "ok";
    ok: {
        gameId: GameId;
        roomCode: RoomCode;
        joinToken: JoinToken;
    };
} | {
    __kind__: "err";
    err: string;
};
export type AuthResult = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export type GuessResultV2 = {
    __kind__: "ok";
    ok: GameState;
} | {
    __kind__: "err";
    err: GuessError;
};
export interface RematchOffer {
    newGameId: GameId;
    offeredBy: PlayerName;
    roomCode: RoomCode;
    joinToken: JoinToken;
}
export interface GameState {
    id: GameId;
    playerNum: bigint;
    status: GameStatus;
    currentTurnPlayer?: PlayerName;
    opponentGuessTileStates: Array<Array<TileState>>;
    exitReason: ExitReason;
    mode: GameMode;
    isHost: boolean;
    wordLength: bigint;
    answer?: string;
    coopGuesses: Array<Guess>;
    myOutcome: PlayerOutcome;
    currentTurn: bigint;
    players: Array<PlayerName>;
    myGuesses: Array<Guess>;
    opponentGuessCount: bigint;
    isPublic: boolean;
    roomCode: RoomCode;
}
export interface Bank {
    revision: bigint;
    payload: string;
}
export type GuessError = {
    __kind__: "notAWord";
    notAWord: null;
} | {
    __kind__: "gameError";
    gameError: string;
} | {
    __kind__: "notYourTurn";
    notYourTurn: null;
};
export interface GameHistoryEntry {
    won: boolean;
    endedAt: Timestamp;
    exitReason: ExitReason;
    mode: GameMode;
    gameId: GameId;
    myGuessCount: bigint;
    roomCode: RoomCode;
    opponent: PlayerName;
}
export type JoinToken = string;
export interface Sentence {
    text: string;
    alternatives: Array<Alternative>;
}
export interface OpponentRecord {
    wins: bigint;
    losses: bigint;
}
export type ExitReason = string;
export type CreateGameResult = {
    __kind__: "ok";
    ok: {
        gameId: GameId;
        roomCode: RoomCode;
        joinToken: JoinToken;
    };
} | {
    __kind__: "err";
    err: string;
};
export type RoomCode = string;
export type LoginResult = {
    __kind__: "ok";
    ok: SessionToken;
} | {
    __kind__: "err";
    err: string;
};
export interface PlayerStats {
    totalLosses: bigint;
    totalWins: bigint;
    bestStreak: bigint;
    currentStreak: bigint;
}
export enum GameMode {
    coop = "coop",
    versus = "versus"
}
export enum PlayerOutcome {
    won = "won",
    lost = "lost",
    playing = "playing",
    opponentWon = "opponentWon"
}
export enum Role {
    admin = "admin",
    player = "player"
}
export enum TileState {
    present = "present",
    correct = "correct",
    absent = "absent"
}
export enum Variant_win_draw_loss {
    win = "win",
    draw = "draw",
    loss = "loss"
}
export interface backendInterface {
    acceptRematch(sessionToken: string, originalGameId: GameId): Promise<AcceptRematchResult>;
    addWord(sessionToken: string, word: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    appCall(token: string, method: string, rawArgs: string): Promise<string>;
    challengeCall(token: string, method: string, rawArgs: string): Promise<string>;
    changePassword(token: string, oldPassword: string, newPassword: string): Promise<AuthResult>;
    checkAndForceTimeouts(): Promise<void>;
    createPrivateGame(sessionToken: string, mode: GameMode): Promise<CreatePrivateGameResult>;
    createPublicGame(sessionToken: string, mode: GameMode): Promise<CreateGameResult>;
    createSizedGame(sessionToken: string, mode: GameMode, length: bigint, isPrivate: boolean): Promise<CreateGameResult>;
    disablePlayer(token: string, username: string): Promise<AuthResult>;
    enablePlayer(token: string, username: string): Promise<AuthResult>;
    getAdminSetupInfo(): Promise<AdminSetupInfo | null>;
    getAllPlayerStats(token: string): Promise<Array<PlayerInfo>>;
    getAllWords(sessionToken: string): Promise<{
        __kind__: "ok";
        ok: Array<string>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getDictionaryInfo(): Promise<WordValidationDebug>;
    getGameByJoinToken(joinToken: JoinToken): Promise<GameId | null>;
    getGameState(sessionToken: string, gameId: GameId): Promise<JoinResult>;
    getGameStateWithRole(gameId: GameId, sessionToken: string): Promise<GameStateWithRole | null>;
    getMyActiveGames(sessionToken: string): Promise<Array<GameSummary>>;
    getMyGameHistory(playerName: PlayerName): Promise<Array<GameHistoryEntry>>;
    getMyOpponentStats(token: string): Promise<Array<[string, OpponentRecord]>>;
    getMyProfile(token: string): Promise<PlayerInfo | null>;
    getMyRematchOffer(sessionToken: string, originalGameId: GameId): Promise<RematchOffer | null>;
    getMyStats(token: string): Promise<PlayerStats | null>;
    getRematchOffer(originalGameId: GameId): Promise<RematchOffer | null>;
    getSessionGameHistory(token: string): Promise<Array<GameHistoryEntry>>;
    getUsernameForSession(token: string): Promise<string | null>;
    getWordBank(token: string): Promise<Bank>;
    getWordCount(): Promise<bigint>;
    importLegacyCache(entries: Array<[string, Meaning]>, questions: Array<[string, Quiz]>, day: bigint, dailyAttempts: bigint, monthlyAttempts: bigint): Promise<boolean>;
    importWords(sessionToken: string, words: Array<string>): Promise<{
        added: bigint;
        skipped: bigint;
        duplicates: bigint;
        unauthorized: boolean;
    }>;
    joinByToken(sessionToken: string, joinToken: string, gameIdHint: GameId | null): Promise<JoinResult>;
    joinGame(sessionToken: string, roomCode: RoomCode, joinToken: JoinToken | null): Promise<JoinResult>;
    leaveGame(sessionToken: string, gameId: GameId): Promise<LeaveResult>;
    listAllPlayers(token: string): Promise<Array<PlayerInfo>>;
    listPublicGames(): Promise<Array<GameSummary>>;
    login(username: string, password: string): Promise<LoginResult>;
    loginWithIdentity(requestedUsername: string): Promise<LoginResult>;
    logout(token: string): Promise<void>;
    meaningCall(token: string, method: string, rawArgs: string): Promise<string>;
    promoteToAdmin(username: string, secretKey: string): Promise<{
        __kind__: "ok";
        ok: {
            newToken: string;
            role: string;
            message: string;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    provisionIdentityAdmin(username: string, identity: Principal): Promise<AuthResult>;
    putWordBank(token: string, revision: bigint, payload: string): Promise<Bank>;
    recordResult(token: string, win: boolean, opponentName: string, outcome: Variant_win_draw_loss): Promise<AuthResult>;
    register(username: string, password: string): Promise<RegisterResult>;
    registerGuest(): Promise<{
        token: string;
        username: string;
    }>;
    removeWord(sessionToken: string, word: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    requestRematch(sessionToken: string, gameId: GameId): Promise<{
        __kind__: "ok";
        ok: {
            newGameId: GameId;
            roomCode: RoomCode;
            joinToken: string;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    resetPlayerPassword(token: string, username: string, newPassword: string): Promise<AuthResult>;
    signInAndCarryGuest(requestedUsername: string, guestToken: string, localWords: string): Promise<{
        __kind__: "ok";
        ok: {
            token: string;
            username: string;
            guestProgress: string;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    submitGuess(sessionToken: string, gameId: GameId, word: string): Promise<GuessResultV2>;
    validateGuessWord(word: string): Promise<boolean>;
    validateGuessWordDebug(word: string): Promise<WordValidationDebug>;
}

import Common "common";

module {
  // Re-export common scalars for convenience
  public type GameId      = Common.GameId;
  public type PlayerName  = Common.PlayerName;
  public type RoomCode    = Common.RoomCode;
  public type Timestamp   = Common.Timestamp;
  public type Passcode    = Common.Passcode;
  public type JoinToken   = Common.JoinToken;

  // ─── Tile evaluation ───────────────────────────────────────────────────────

  // Per-tile evaluation result for a submitted guess
  public type TileState = {
    #correct;  // right letter, right position
    #present;  // right letter, wrong position
    #absent;   // letter not in the answer
  };

  // ─── Game configuration ────────────────────────────────────────────────────

  public type GameMode = {
    #coop;    // shared board, alternate turns, team solves or loses together
    #versus;  // separate boards, same hidden word, first to solve wins
  };

  // ─── Guess ─────────────────────────────────────────────────────────────────

  // A single submitted guess with evaluated tile states
  public type Guess = {
    word      : Text;
    states    : [TileState];
    playerNum : Nat;       // 1 or 2
    timestamp : Timestamp;
  };

  // ─── Game status & outcome ─────────────────────────────────────────────────

  // Game lifecycle status — drives all client rendering decisions
  public type GameStatus = {
    #waiting;    // P2 hasn't joined yet
    #playing;    // active game in progress
    #won : Nat;  // Nat = winning player (1 or 2); 0 = co-op team win
    #lost;       // nobody solved in 6 guesses
    #expired;    // turn timer ran out with no resolution
  };

  // Per-player outcome for Versus mode — included in GameState.myOutcome
  public type PlayerOutcome = {
    #playing;     // still guessing
    #won;         // I solved the word
    #lost;        // I exhausted all 6 guesses without solving
    #opponentWon; // opponent solved it, I have not yet finished
  };

  // Reason the game ended — sent to both players on exit
  public type ExitReason = Text;
  // Canonical values: "normal", "opponent_left", "forfeit_timeout"

  // ─── Internal session (mutable) — NEVER shared over API ───────────────────

  public type GameSession = {
    id               : GameId;
    roomCode         : RoomCode;
    mode             : GameMode;
    var answer           : Text;          // hidden until game ends; set on creation, updated when P2 joins private game
    var players      : [PlayerName];  // index 0 = P1, index 1 = P2
    var joinToken    : ?JoinToken;    // one-time P2 invite token
    var coopGuesses  : [Guess];       // co-op shared board
    var p1Guesses    : [Guess];       // versus: P1's board
    var p2Guesses    : [Guess];       // versus: P2's board
    var currentTurn  : Nat;           // co-op: 1 or 2 (whose turn)
    var status       : GameStatus;
    var exitReason   : ExitReason;
    createdAt        : Timestamp;
    var lastMoveAt   : Timestamp;
    var finishedAt   : ?Timestamp;    // set when game ends (60s visibility window)
    isPublic         : Bool;
    var p1Done       : Bool;          // versus: true once P1 has won or used 6 guesses
    var p2Done       : Bool;          // versus: true once P2 has won or used 6 guesses
    var p1Won        : Bool;          // versus: true if P1 solved the word
    var p2Won        : Bool;          // versus: true if P2 solved the word
  };

  // ─── Public-facing view (immutable, masked) ────────────────────────────────

  // Returned to the requesting player — opponent letters hidden in versus
  public type GameState = {
    id                       : GameId;
    roomCode                 : RoomCode;
    mode                     : GameMode;
    players                  : [PlayerName];
    myGuesses                : [Guess];         // guesses made by the requesting player
    opponentGuessCount       : Nat;             // VERSUS ONLY: opponent guess count (no letters)
    opponentGuessTileStates  : [[TileState]];   // VERSUS ONLY: tile states per opponent guess row (no letters)
    coopGuesses              : [Guess];         // CO-OP ONLY: shared board
    currentTurn              : Nat;             // co-op: 1 or 2; versus: 0 (unused)
    currentTurnPlayer        : ?PlayerName;     // co-op: name of player whose turn it is; null in versus
    status                   : GameStatus;
    exitReason               : ExitReason;
    answer                   : ?Text;           // revealed when status is #won, #lost, or #expired
    isPublic                 : Bool;
    playerNum                : Nat;             // 1 or 2 — which player am I
    myOutcome                : PlayerOutcome;
    isHost                   : Bool;            // true if caller is player 1 (created the game)
  };

  // Lobby summary — no sensitive data
  public type GameSummary = {
    id             : GameId;
    roomCode       : RoomCode;
    mode           : GameMode;
    players        : [PlayerName];
    status         : GameStatus;
    isPublic       : Bool;
    createdAt      : Timestamp;
    waitingForMove : Bool; // true when THIS player needs to act (cross-game alert)
  };

  // Per-game history entry for player stats / profile panel
  public type GameHistoryEntry = {
    gameId       : GameId;
    roomCode     : RoomCode;
    mode         : GameMode;
    opponent     : PlayerName;
    myGuessCount : Nat;
    won          : Bool;
    exitReason   : ExitReason;
    endedAt      : Timestamp;
  };

  // End reason used when recording history
  public type EndReason = {
    #normalPlay;        // game ended normally (win or loss)
    #iForfeited;        // this player left mid-game
    #opponentLeft;      // opponent left mid-game
    #opponentForfeited; // server timer expired
  };

  // CreatePrivateGameResult includes joinToken for shareable link
  public type CreatePrivateGameResult = {
    #ok : { gameId : GameId; roomCode : RoomCode; joinToken : JoinToken };
    #err : Text;
  };

  // GameState with role context (host vs joiner)
  public type GameStateWithRole = {
    gameState : GameState;
    isHost    : Bool;
  };

  // ─── API result types ──────────────────────────────────────────────────────

  public type CreateGameResult = {
    #ok : { gameId : GameId; roomCode : RoomCode; joinToken : JoinToken };
    #err : Text;
  };

  public type JoinResult = {
    #ok : GameState;
    #err : Text;
  };

  public type GuessResult = {
    #ok : GameState;
    #err : Text;
  };

  // Distinct error variant for word-validation failures — frontend uses this
  // to trigger the shake animation and "Not a word" toast.
  public type GuessError = {
    #notAWord;           // word rejected by dictionary validation
    #notYourTurn;        // co-op: attempting to guess on the other player's turn
    #gameError : Text;   // any other game-logic error
  };

  // Extended guess result that distinguishes word-validation errors
  public type GuessResultV2 = {
    #ok : GameState;
    #err : GuessError;
  };

  public type LeaveResult = {
    #ok;
    #err : Text;
  };

  public type RematchResult = {
    #ok : GameId;
    #err : Text;
  };

  // Rematch offer stored against the original gameId so PB can discover it by polling.
  public type RematchOffer = {
    newGameId  : GameId;
    roomCode   : RoomCode;
    joinToken  : JoinToken;
    offeredBy  : PlayerName;
  };

  public type AcceptRematchResult = {
    #ok : { newGameId : GameId };
    #err : Text;
  };
};

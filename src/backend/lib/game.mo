import Types "../types/game";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Array "mo:core/Array";
import VarArray "mo:core/VarArray";

module {
  public type GameSession = Types.GameSession;
  public type GameState = Types.GameState;
  public type GameSummary = Types.GameSummary;
  public type GameStatus = Types.GameStatus;
  public type GameHistoryEntry = Types.GameHistoryEntry;
  public type Guess = Types.Guess;
  public type TileState = Types.TileState;
  public type PlayerOutcome = Types.PlayerOutcome;

  // Generate a new unique game ID from a counter
  public func generateGameId(counter : Nat) : Types.GameId {
    "game-" # counter.toText();
  };
  public func roomCodeFromSecret(secret : Text) : Text {
    let chars = secret.toArray();
    var code = "WORD-";
    var i = 0;
    while (i < 12) { code #= Text.fromChar(chars[i]); i += 1 };
    code.toUpper();
  };

  // Generate a "WORD-XXXX" room code using timestamp entropy + counter.
  // Uses uppercase letters and digits, excluding 0, O, I, 1 to avoid confusion.
  public func generateRoomCode(counter : Nat, nowNs : Types.Timestamp) : Types.RoomCode {
    let alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no 0/O/I/1
    let chars = alphabet.toArray();
    let alphabetSize = 32;
    let seed = (counter * 1_000_003 + (nowNs.toNat() % 1_000_000_007) * 999_983) % 1_073_741_824;
    var code = "WORD-";
    var remaining = seed;
    var i = 0;
    while (i < 4) {
      let idx = remaining % alphabetSize;
      code := code # Text.fromChar(chars[idx]);
      remaining := remaining / alphabetSize;
      i += 1;
    };
    code;
  };

  // Generate a 32-char hex join token using Time.now() + counter as entropy.
  public func generateJoinToken(counter : Nat, salt : Nat) : Text {
    let hexChars = "0123456789abcdef";
    let chars = hexChars.toArray();
    let seed1 = (counter * 1_000_003 + salt * 999_983) % 4_294_967_296;
    let seed2 = (counter * 999_983 + salt * 1_000_003 + 12_345_678) % 4_294_967_296;
    var token = "";
    var remaining = seed1;
    var i = 0;
    while (i < 16) {
      let idx = remaining % 16;
      token := Text.fromChar(chars[idx]) # token;
      remaining := remaining / 16;
      i += 1;
    };
    remaining := seed2;
    var j = 0;
    while (j < 16) {
      let idx = remaining % 16;
      token := token # Text.fromChar(chars[idx]);
      remaining := remaining / 16;
      j += 1;
    };
    token;
  };

  // Evaluate a guess word against the answer using Wordle rules.
  public func evaluateGuess(guess : Text, answer : Text) : [TileState] {
    let g = guess.toArray();
    let a = answer.toArray();
    let result = Array.repeat<TileState>(#absent,a.size()).toVarArray<TileState>();
    let used = Array.repeat(false,a.size()).toVarArray();
    if (g.size() != a.size()) return result.toArray();
    var i = 0;
    while (i < a.size()) {
      if (g[i] == a[i]) { result[i] := #correct; used[i] := true };
      i += 1;
    };
    i := 0;
    while (i < a.size()) {
      if (result[i] != #correct) {
        var j = 0;
        label find while (j < a.size()) {
          if (not used[j] and g[i] == a[j]) { result[i] := #present; used[j] := true; break find };
          j += 1;
        };
      };
      i += 1;
    };
    result.toArray();
  };

  public func createGame(
    gameId : Types.GameId,
    roomCode : Types.RoomCode,
    mode : Types.GameMode,
    hostPlayer : Types.PlayerName,
    answer : Text,
    isPublic : Bool,
    joinTokenOpt : ?Text,
    createdAt : Types.Timestamp,
  ) : GameSession {
    {
      id = gameId;
      roomCode;
      mode;
      var answer;
      var players = [hostPlayer];
      var coopGuesses = [];
      var p1Guesses = [];
      var p2Guesses = [];
      var currentTurn = 1;
      var status = #waiting;
      var exitReason = "";
      createdAt;
      var lastMoveAt = createdAt;
      isPublic;
      var joinToken = joinTokenOpt;
      var finishedAt = null;
      var p1Done = false;
      var p2Done = false;
      var p1Won = false;
      var p2Won = false;
    };
  };

  public func newPublicSession(
    gameId : Types.GameId,
    roomCode : Types.RoomCode,
    player1 : Types.PlayerName,
    mode : Types.GameMode,
    answer : Text,
    createdAt : Types.Timestamp,
  ) : GameSession {
    createGame(gameId, roomCode, mode, player1, answer, true, null, createdAt);
  };

  public func newPrivateSession(
    gameId : Types.GameId,
    roomCode : Types.RoomCode,
    player1 : Types.PlayerName,
    mode : Types.GameMode,
    answer : Text,
    joinTokenStr : Text,
    createdAt : Types.Timestamp,
  ) : GameSession {
    createGame(gameId, roomCode, mode, player1, answer, false, ?joinTokenStr, createdAt);
  };

  public func getPlayerNum(session : GameSession, playerName : Types.PlayerName) : Nat {
    if (session.players.size() >= 1 and session.players[0] == playerName) { 1 }
    else if (session.players.size() >= 2 and session.players[1] == playerName) { 2 }
    else { 0 };
  };

  public func getPlayerNumOpt(session : GameSession, playerName : Types.PlayerName) : ?Nat {
    let n = getPlayerNum(session, playerName);
    if (n == 0) { null } else { ?n };
  };

  func computeMyOutcome(session : GameSession, playerNum : Nat) : PlayerOutcome {
    if (session.mode != #versus or playerNum == 0) { return #playing };

    let iSolved = if (playerNum == 1) { session.p1Won } else { session.p2Won };
    if (iSolved) { return #won };

    let iExhausted = if (playerNum == 1) {
      session.p1Done and not session.p1Won
    } else {
      session.p2Done and not session.p2Won
    };

    let opponentWon = if (playerNum == 1) { session.p2Won } else { session.p1Won };

    if (opponentWon) {
      #opponentWon
    } else if (iExhausted) {
      #lost
    } else {
      #playing
    };
  };

  func hasGuessed(guesses : [Guess], word : Text) : Bool {
    guesses.find(func(g) { g.word == word }) != null;
  };

  public func toGameState(session : GameSession, playerName : ?Types.PlayerName) : GameState {
    let playerNum = switch (playerName) {
      case (?name) { getPlayerNum(session, name) };
      case null { 0 };
    };

    let myGuesses : [Guess] = switch (session.mode) {
      case (#coop) { [] };
      case (#versus) {
        if (playerNum == 1) { session.p1Guesses }
        else if (playerNum == 2) { session.p2Guesses }
        else { [] };
      };
    };

    let opponentGuessCount : Nat = switch (session.mode) {
      case (#coop) { 0 };
      case (#versus) {
        if (playerNum == 1) { session.p2Guesses.size() }
        else if (playerNum == 2) { session.p1Guesses.size() }
        else { 0 };
      };
    };

    // Opponent tile states: expose per-row TileState arrays without revealing letters.
    // Only populated in versus mode; empty in co-op.
    let opponentGuessTileStates : [[TileState]] = switch (session.mode) {
      case (#coop) { [] };
      case (#versus) {
        let opponentGuesses : [Guess] =
          if (playerNum == 1) { session.p2Guesses }
          else if (playerNum == 2) { session.p1Guesses }
          else { [] };
        opponentGuesses.map<Guess, [TileState]>(func(g) { g.states })
      };
    };

    let myOutcome = computeMyOutcome(session, playerNum);

    let revealAnswer = switch (session.status) {
      case (#won(_)) { true };
      case (#lost) { true };
      case (#expired) { true };
      case _ { myOutcome != #playing };
    };

    // co-op: expose which player's turn it is by name
    let currentTurnPlayer : ?Types.PlayerName = switch (session.mode) {
      case (#coop) {
        let turnNum = session.currentTurn;
        if (turnNum == 1 and session.players.size() >= 1) { ?session.players[0] }
        else if (turnNum == 2 and session.players.size() >= 2) { ?session.players[1] }
        else { null };
      };
      case (#versus) { null };
    };

    {
      id = session.id;
      wordLength = session.answer.size();
      roomCode = session.roomCode;
      mode = session.mode;
      players = session.players;
      myGuesses;
      opponentGuessCount;
      opponentGuessTileStates;
      coopGuesses = session.coopGuesses;
      currentTurn = session.currentTurn;
      currentTurnPlayer;
      status = session.status;
      exitReason = session.exitReason;
      answer = if (revealAnswer) { ?session.answer } else { null };
      isPublic = session.isPublic;
      playerNum;
      myOutcome;
      isHost = playerNum == 1;
    };
  };

  public func toGameSummary(session : GameSession, callerName : ?Types.PlayerName) : GameSummary {
    let waitingForMove : Bool = switch (callerName) {
      case null { false };
      case (?name) {
        let playerNum = getPlayerNum(session, name);
        if (playerNum == 0) { false }
        else {
          switch (session.status) {
            case (#playing) {
              switch (session.mode) {
                case (#coop) { session.currentTurn == playerNum };
                case (#versus) { false };
              };
            };
            case _ { false };
          };
        };
      };
    };
    {
      id = session.id;
      roomCode = session.roomCode;
      mode = session.mode;
      players = session.players;
      status = session.status;
      isPublic = session.isPublic;
      createdAt = session.createdAt;
      waitingForMove;
    };
  };

  // submitGuess: processes a guess for co-op or versus mode.
  //
  // Co-op: enforces turn order — returns #notYourTurn if it is not the caller's turn.
  //        After 6 guesses, game transitions to #lost immediately.
  //        On solve, transitions to #won(0) (team win).
  //
  // Versus: when a player solves the word, game transitions to #won(playerNum) IMMEDIATELY
  //         — the opponent does not need to finish. When a player exhausts 6 guesses without
  //         solving, their outcome is #lost. If both are done with no winner, status is #lost.
  public func submitGuess(
    session : GameSession,
    playerName : Types.PlayerName,
    word : Text,
    now : Types.Timestamp,
  ) : { #ok : (Guess, GameStatus); #err : Text; #notYourTurn } {
    if (word.size() != session.answer.size()) {
      return #err("Word must be exactly " # session.answer.size().toText() # " letters");
    };
    if (session.status != #playing) {
      return #err("Game is not in progress");
    };
    let playerNum = getPlayerNum(session, playerName);
    if (playerNum == 0) { return #err("You are not a player in this game") };

    let states = evaluateGuess(word, session.answer);
    let guess : Guess = { word; states; playerNum; timestamp = now };

    switch (session.mode) {
      case (#coop) {
        // Co-op turn enforcement: only the active player may guess
        if (session.currentTurn != playerNum) {
          return #notYourTurn;
        };
        if (hasGuessed(session.coopGuesses, word)) {
          return #err("Already guessed");
        };
        session.coopGuesses := session.coopGuesses.concat([guess]);
        session.lastMoveAt := now;
        let newStatus : GameStatus = if (word == session.answer) {
          #won(0) // team win
        } else if (session.coopGuesses.size() >= 6) {
          #lost // all 6 guesses exhausted — team lost
        } else {
          // Advance turn to the other player
          session.currentTurn := if (session.currentTurn == 1) { 2 } else { 1 };
          #playing
        };
        if (newStatus != #playing) {
          session.status := newStatus;
          session.finishedAt := ?now;
        };
        #ok((guess, newStatus));
      };
      case (#versus) {
        let alreadyDone = if (playerNum == 1) { session.p1Done } else { session.p2Done };
        if (alreadyDone) { return #err("You have no guesses remaining") };

        let myGuesses = if (playerNum == 1) { session.p1Guesses } else { session.p2Guesses };
        if (myGuesses.size() >= 6) { return #err("You have no guesses remaining") };
        if (hasGuessed(myGuesses, word)) {
          return #err("Already guessed");
        };

        let updated = myGuesses.concat([guess]);
        if (playerNum == 1) { session.p1Guesses := updated }
        else { session.p2Guesses := updated };
        session.lastMoveAt := now;

        let iSolved = word == session.answer;
        let iExhausted = updated.size() >= 6;

        if (iSolved) {
          if (playerNum == 1) { session.p1Won := true } else { session.p2Won := true };
        };
        if (iSolved or iExhausted) {
          if (playerNum == 1) { session.p1Done := true } else { session.p2Done := true };
        };

        // Versus resolution rule:
        // • A player who solves the word immediately wins the game — opponent is notified as lost.
        // • A player who exhausts all 6 guesses without solving is marked lost.
        //   – If the opponent already won, the session is already finished (no double-set).
        //   – If both are now done with no winner, status transitions to #lost.
        let newStatus : GameStatus = if (iSolved) {
          #won(playerNum)
        } else if (iExhausted) {
          let opponentWon = if (playerNum == 1) { session.p2Won } else { session.p1Won };
          if (opponentWon) {
            session.status // already finished; don't overwrite
          } else {
            let bothDone = session.p1Done and session.p2Done;
            if (bothDone) { #lost } else { #playing }
          }
        } else {
          #playing
        };

        if (newStatus != #playing) {
          session.status := newStatus;
          session.finishedAt := ?now;
        };
        #ok((guess, newStatus));
      };
    };
  };

  public func leaveGame(session : GameSession, playerName : Types.PlayerName, now : Types.Timestamp) : GameSession {
    let playerNum = getPlayerNum(session, playerName);
    if (playerNum == 0) { return session };
    session.status := #expired;
    session.exitReason := "opponent_left";
    session.finishedAt := ?now;
    session;
  };

  public func applyForfeit(session : GameSession, playerName : Types.PlayerName, now : Types.Timestamp) : GameSession {
    let _ = playerName;
    session.status := #expired;
    session.exitReason := "forfeit_timeout";
    session.finishedAt := ?now;
    session;
  };

  public func isPlayerTurn(session : GameSession, playerName : Types.PlayerName) : Bool {
    let playerNum = getPlayerNum(session, playerName);
    if (playerNum == 0) { return false };
    if (session.status != #playing) { return false };
    switch (session.mode) {
      case (#coop) { session.currentTurn == playerNum };
      case (#versus) {
        let done = if (playerNum == 1) { session.p1Done } else { session.p2Done };
        not done
      };
    };
  };

  // removePlayer: called by leaveGame.
  // On #waiting: mark as cancelled/expired and signal #delete so the session is removed.
  // On #playing: mark as expired with opponent_left reason, signal #keep so history is recorded.
  // On any already-finished state: #keep without mutating.
  public func removePlayer(
    session : GameSession,
    playerName : Types.PlayerName,
    now : Types.Timestamp,
  ) : { #delete; #keep; #err : Text } {
    let playerNum = getPlayerNum(session, playerName);
    if (playerNum == 0) { return #err("You are not a player in this game") };
    switch (session.status) {
      case (#waiting) {
        // Creator cancels before anyone joined: mark expired then signal deletion
        session.status := #expired;
        session.exitReason := "cancelled";
        session.finishedAt := ?now;
        #delete
      };
      case (#playing) {
        if (session.mode == #versus and session.players.size() == 2) {
          let winner = if (playerNum == 1) { 2 } else { 1 };
          session.status := #won(winner);
          if (winner == 1) { session.p1Won := true; session.p1Done := true }
          else { session.p2Won := true; session.p2Done := true };
        } else { session.status := #expired };
        session.exitReason := "opponent_left";
        session.finishedAt := ?now;
        #keep;
      };
      case _ { #keep };
    };
  };

  public func toHistoryEntry(
    session : GameSession,
    playerName : Types.PlayerName,
    endReason : Types.EndReason,
    now : Types.Timestamp,
  ) : GameHistoryEntry {
    let playerNum = getPlayerNum(session, playerName);
    let opponent : Types.PlayerName = if (playerNum == 1) {
      if (session.players.size() >= 2) { session.players[1] } else { "unknown" };
    } else {
      if (session.players.size() >= 1) { session.players[0] } else { "unknown" };
    };
    let myGuessCount : Nat = switch (session.mode) {
      case (#coop) { session.coopGuesses.size() };
      case (#versus) {
        if (playerNum == 1) { session.p1Guesses.size() }
        else { session.p2Guesses.size() };
      };
    };
    let won : Bool = switch (session.status) {
      case (#won(n)) { n == playerNum or n == 0 };
      case _ { false };
    };
    let _ = endReason;
    {
      gameId = session.id;
      roomCode = session.roomCode;
      mode = session.mode;
      opponent;
      myGuessCount;
      won;
      exitReason = session.exitReason;
      endedAt = switch (session.finishedAt) { case (?t) { t }; case null { now } };
    };
  };

  public func checkTurnExpiry(session : GameSession, now : Types.Timestamp) {
    if (session.status != #playing) { return };
    let elapsed = now - session.lastMoveAt;
    let twentyFourHours : Types.Timestamp = 86_400_000_000_000;
    if (elapsed > twentyFourHours) {
      session.status := #expired;
      session.exitReason := "forfeit_timeout";
      session.finishedAt := ?now;
    };
  };
};

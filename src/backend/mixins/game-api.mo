import Types "../types/game";
import GameLib "../lib/game";
import AuthLib "../lib/auth-and-stats";
import WordPoolLib "../lib/word-pool";
import WordPoolTypes "../types/word-pool";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Time "mo:core/Time";

mixin (
  sessions : Map.Map<Types.GameId, Types.GameSession>,
  counterBox : List.List<Nat>,
  gameCounter : List.List<Nat>,
  joinTokens : Map.Map<Types.GameId, Text>,
  gameHistory : Map.Map<Types.PlayerName, List.List<Types.GameHistoryEntry>>,
  rematchOffers : Map.Map<Types.GameId, Types.RematchOffer>,
  authSessions : Map.Map<Text, Text>,
  customWords : List.List<WordPoolTypes.WordPoolEntry>,
  knownValidWords : Set.Set<Text>,
  usedWords : Set.Set<Text>,
  // pairUsedWords: Map<"player1:player2" sorted canonical key, Set<word>>
  // prevents the same word from being reused for the same two players
  pairUsedWords : Map.Map<Text, Set.Set<Text>>,
  // statsStore and opponentStore: injected so recordHistory can auto-update stats
  statsStore : Map.Map<Text, AuthLib.PlayerStatsInternal>,
  opponentStore : Map.Map<Text, Map.Map<Text, AuthLib.OpponentRecordInternal>>,
) {

  func nextCounter() : Nat {
    let current = counterBox.at(0);
    let next = current + 1;
    counterBox.put(0, next);
    next;
  };

  func nextGameCounter() : Nat {
    let current = gameCounter.at(0);
    let next = current + 1;
    gameCounter.put(0, next);
    next;
  };

  func resolvePlayer(sessionToken : Text) : ?Text {
    authSessions.get(sessionToken);
  };

  func addHistoryEntry(playerName : Types.PlayerName, entry : Types.GameHistoryEntry) {
    switch (gameHistory.get(playerName)) {
      case (?existing) { existing.add(entry) };
      case null {
        let lst = List.singleton<Types.GameHistoryEntry>(entry);
        gameHistory.add(playerName, lst);
      };
    };
  };

  func recordHistory(
    session : Types.GameSession,
    now : Types.Timestamp,
    p1EndReason : Types.EndReason,
    p2EndReason : Types.EndReason,
  ) {
    // Only record history for games that had two players (not cancelled waiting games)
    if (session.players.size() < 2) { return };
    let p1Name = session.players[0];
    let p2Name = session.players[1];

    // Determine per-player win/loss for stats
    let p1Won : Bool = switch (session.status) {
      case (#won(n)) { n == 1 or n == 0 };
      case _ { false };
    };
    let p2Won : Bool = switch (session.status) {
      case (#won(n)) { n == 2 or n == 0 };
      case _ { false };
    };

    let entry1 = GameLib.toHistoryEntry(session, p1Name, p1EndReason, now);
    addHistoryEntry(p1Name, entry1);
    let entry2 = GameLib.toHistoryEntry(session, p2Name, p2EndReason, now);
    addHistoryEntry(p2Name, entry2);

    // Auto-update stats — no separate frontend call needed
    AuthLib.updateStats(statsStore, p1Name, p1Won);
    AuthLib.updateStats(statsStore, p2Name, p2Won);

    // Update head-to-head opponent records
    let p1Outcome : { #win; #loss; #draw } = if (p1Won and not p2Won) { #win }
      else if (p2Won and not p1Won) { #loss }
      else { #draw };
    let p2Outcome : { #win; #loss; #draw } = if (p2Won and not p1Won) { #win }
      else if (p1Won and not p2Won) { #loss }
      else { #draw };
    AuthLib.updateOpponentStats(opponentStore, p1Name, p2Name, p1Outcome);
    AuthLib.updateOpponentStats(opponentStore, p2Name, p1Name, p2Outcome);
  };

  // pairKey: canonical sorted key for a player pair (order-independent)
  func pairKey(p1 : Text, p2 : Text) : Text {
    if (p1 <= p2) { p1 # ":" # p2 } else { p2 # ":" # p1 };
  };

  // pickWordForPair: selects an answer word not already used by this player pair.
  // Falls back to any globally unused word, then resets if all words exhausted.
  func pickWordForPair(wordList : [Text], player1 : Text, player2 : Text) : Text {
    if (wordList.size() == 0) { return "crane" };
    let now = Time.now();
    let gc = nextGameCounter();
    let total = wordList.size();
    let key = pairKey(player1, player2);

    let pairSet : Set.Set<Text> = switch (pairUsedWords.get(key)) {
      case (?s) { s };
      case null {
        let s = Set.empty<Text>();
        pairUsedWords.add(key, s);
        s;
      };
    };

    var attempts = 0;
    var word = "crane";
    label search while (attempts < total) {
      let seed = (now.toNat() / 1_000_000 + (gc + attempts) * 999_983) % total;
      let candidate = wordList[seed];
      if (not pairSet.contains(candidate) and not usedWords.contains(candidate)) {
        word := candidate;
        pairSet.add(candidate);
        usedWords.add(candidate);
        break search;
      };
      attempts += 1;
    };
    // If all words exhausted for this pair, reset pair history and pick a fresh global word
    if (attempts >= total) {
      pairSet.clear();
      var fallbackAttempts = 0;
      label fallback while (fallbackAttempts < total) {
        let seed = (now.toNat() / 1_000_000 + (gc + fallbackAttempts + total) * 999_983) % total;
        let candidate = wordList[seed];
        if (not usedWords.contains(candidate)) {
          word := candidate;
          pairSet.add(candidate);
          usedWords.add(candidate);
          break fallback;
        };
        fallbackAttempts += 1;
      };
      // If even global set exhausted, reset everything
      if (fallbackAttempts >= total) {
        usedWords.clear();
        let seed = (now.toNat() / 1_000_000 + gc * 999_983) % total;
        word := wordList[seed];
        pairSet.add(word);
        usedWords.add(word);
      };
    };
    word;
  };

  // pickAnswerWord: selects an answer word fresh for the given player pair
  func pickAnswerWord(player1 : Text, player2 : Text) : Text {
    pickWordForPair(WordPoolLib.getAnswerWords(), player1, player2);
  };

  public func createPublicGame(
    sessionToken : Text,
    mode : Types.GameMode,
  ) : async Types.CreateGameResult {
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        let counter = nextCounter();
        let now = Time.now();
        let gameId = GameLib.generateGameId(counter);
        let roomCode = GameLib.generateRoomCode(counter, now);
        // Public games: use "public" as the second-player placeholder
        let answer = pickAnswerWord(playerName, "public");
        let session = GameLib.newPublicSession(gameId, roomCode, playerName, mode, answer, now);
        sessions.add(gameId, session);
        #ok({ gameId; roomCode; joinToken = "" });
      };
    };
  };

  public func createPrivateGame(
    sessionToken : Text,
    mode : Types.GameMode,
  ) : async Types.CreatePrivateGameResult {
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        let counter = nextCounter();
        let now = Time.now();
        let gameId = GameLib.generateGameId(counter);
        let roomCode = GameLib.generateRoomCode(counter, now);
        // Word is finalised when P2 joins (their name is known then);
        // use "tbd" as a placeholder for the pair key until then.
        let answer = pickAnswerWord(playerName, "tbd");
        let salt = now.toNat() % 1_000_000_007;
        let joinToken = GameLib.generateJoinToken(counter, salt);
        let session = GameLib.newPrivateSession(gameId, roomCode, playerName, mode, answer, joinToken, now);
        sessions.add(gameId, session);
        joinTokens.add(gameId, joinToken);
        #ok({ gameId; roomCode; joinToken });
      };
    };
  };

  // joinGame: unified join function.
  // If joinToken is provided, uses token-based lookup (private game).
  // Otherwise, uses roomCode lookup for public games.
  public func joinGame(
    sessionToken : Text,
    roomCode : Types.RoomCode,
    joinToken : ?Types.JoinToken,
  ) : async Types.JoinResult {
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        switch (joinToken) {
          case (?token) {
            // Private game join via token — delegate to joinByToken logic
            await joinByToken(sessionToken, token, null);
          };
          case null {
            // Room code join — works for both public AND private games.
            // P2 who has the room code can always join regardless of isPublic flag.
            let matchOpt = sessions.entries().find(func((_id, s)) {
              s.roomCode == roomCode and s.status == #waiting
            });
            switch (matchOpt) {
              case null { #err("Game not found or already started") };
              case (?(_, session)) {
                if (session.players.find(func(p) { p == playerName }) != null) {
                  return #err("You are already in this game");
                };
                // Pick a pair-specific word when P2 joins
                let host = if (session.players.size() >= 1) { session.players[0] } else { "host" };
                let freshAnswer = pickWordForPair(WordPoolLib.getAnswerWords(), host, playerName);
                session.answer := freshAnswer;
                session.players := session.players.concat([playerName]);
                session.status := #playing;
                let now = Time.now();
                session.lastMoveAt := now;
                #ok(GameLib.toGameState(session, ?playerName));
              };
            };
          };
        };
      };
    };
  };

  // joinByToken: private invite-link join.
  // Handles: host polling their own waiting game, P2 first join, idempotent re-join.
  // gameIdHint: optional gameId from the invite URL — used as a primary fast-path lookup
  // before the token-scan loop (avoids O(n) scan and timing edge cases).
  public func joinByToken(
    sessionToken : Text,
    joinToken : Text,
    gameIdHint : ?Types.GameId,
  ) : async Types.JoinResult {
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        // LAYER 1 — direct gameId hint lookup (fastest, O(1))
        let hintResultOpt : ?(Types.GameId, Types.GameSession) = switch (gameIdHint) {
          case (?hintId) {
            switch (sessions.get(hintId)) {
              case null { null };
              case (?s) {
                // Accept if token matches on session OR in joinTokens map
                let tokenOnSession = switch (s.joinToken) {
                  case (?t) { t == joinToken };
                  case null { false };
                };
                let tokenInMap = switch (joinTokens.get(hintId)) {
                  case (?t) { t == joinToken };
                  case null { false };
                };
                if (tokenOnSession or tokenInMap) { ?(hintId, s) } else { null };
              };
            };
          };
          case null { null };
        };

        // LAYER 2 — joinTokens map scan (O(n) over game tokens)
        let mapResultOpt : ?(Types.GameId, Types.GameSession) = switch (hintResultOpt) {
          case (?found) { ?found };
          case null {
            let tokenEntry = joinTokens.entries().find(func((gid, tok)) { tok == joinToken });
            switch (tokenEntry) {
              case null { null };
              case (?(gid, _)) {
                switch (sessions.get(gid)) {
                  case null { null };
                  case (?s) { ?(gid, s) };
                };
              };
            };
          };
        };

        // LAYER 3 — full session scan on session.joinToken field
        // Also syncs any found entry back into joinTokens map.
        let resolvedOpt : ?(Types.GameId, Types.GameSession) = switch (mapResultOpt) {
          case (?found) { ?found };
          case null {
            let scanResult = sessions.entries().find(func((_id, s)) {
              switch (s.joinToken) {
                case (?t) { t == joinToken };
                case null { false };
              };
            });
            // Sync back to map if found via scan but missing from map
            switch (scanResult) {
              case (?(gid, _)) {
                switch (joinTokens.get(gid)) {
                  case null { joinTokens.add(gid, joinToken) };
                  case _ {};
                };
              };
              case null {};
            };
            scanResult;
          };
        };

        switch (resolvedOpt) {
          case null {
            // Token not found in any lookup layer.
            // Check if this player is already inside an active game (re-join after session reset).
            let alreadyInGameOpt = sessions.entries().find(func((gid, s)) {
              s.players.find(func(p) { p == playerName }) != null and
              (s.status == #playing or s.status == #waiting)
            });
            switch (alreadyInGameOpt) {
              case (?(gid, _)) {
                #err("already_in_game:" # gid)
              };
              case null {
                #err("game_not_found")
              };
            };
          };
          case (?(gameId, session)) {
            // IDEMPOTENT: player already in this specific game — always return success
            if (session.players.find(func(p) { p == playerName }) != null) {
              return #ok(GameLib.toGameState(session, ?playerName));
            };

            // Determine joinability by player count, not just status.
            // A game in #playing state can still admit P2 if they haven't joined yet
            // (host polled and transitioned status optimistically, or timing edge case).
            let playerCount = session.players.size();

            if (playerCount >= 2) {
              // Both slots filled and this player is not one of them
              #err("game_full")
            } else {
              switch (session.status) {
                case (#expired or #lost or #won(_)) {
                  // Terminal state — game is over, cannot join
                  #err("game_started")
                };
                case _ {
                  // playerCount < 2 and game is in #waiting or #playing
                  // — allow the join regardless of status
                  let host = if (playerCount >= 1) { session.players[0] } else { "host" };
                  let freshAnswer = pickWordForPair(WordPoolLib.getAnswerWords(), host, playerName);
                  session.answer := freshAnswer;
                  session.players := session.players.concat([playerName]);
                  // Ensure status is #playing once P2 joins
                  if (session.status == #waiting) {
                    session.status := #playing;
                  };
                  // Keep joinToken on session forever — idempotent re-joins depend on it
                  let now = Time.now();
                  session.lastMoveAt := now;
                  #ok(GameLib.toGameState(session, ?playerName));
                };
              };
            };
          };
        };
      };
    };
  };

  public query func getGameState(
    sessionToken : Text,
    gameId : Types.GameId,
  ) : async Types.JoinResult {
    switch (authSessions.get(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        switch (sessions.get(gameId)) {
          case null { #err("Game not found") };
          case (?session) {
            #ok(GameLib.toGameState(session, ?playerName));
          };
        };
      };
    };
  };

  public query func getGameStateWithRole(
    gameId : Types.GameId,
    sessionToken : Text,
  ) : async ?Types.GameStateWithRole {
    switch (authSessions.get(sessionToken)) {
      case null { null };
      case (?playerName) {
        switch (sessions.get(gameId)) {
          case null { null };
          case (?session) {
            let gs = GameLib.toGameState(session, ?playerName);
            ?{ gameState = gs; isHost = gs.isHost };
          };
        };
      };
    };
  };

  // listPublicGames: only shows public waiting games (not cancelled or finished)
  public query func listPublicGames() : async [Types.GameSummary] {
    sessions.values()
      .filter(func(s) { s.isPublic and s.status == #waiting })
      .map(func(s) { GameLib.toGameSummary(s, null) })
      .toArray();
  };

  // getMyActiveGames: strictly returns only #waiting or #playing games.
  // Cancelled, expired, won, and lost games are never included.
  public query func getMyActiveGames(sessionToken : Text) : async [Types.GameSummary] {
    switch (authSessions.get(sessionToken)) {
      case null { [] };
      case (?playerName) {
        sessions.values()
          .filter(func(s) {
            s.players.find(func(p) { p == playerName }) != null and
            (s.status == #waiting or s.status == #playing)
          })
          .map(func(s) { GameLib.toGameSummary(s, ?playerName) })
          .toArray();
      };
    };
  };

  // submitGuess: accepts five-letter alphabetic guesses, then enforces turn rules.
  public func submitGuess(
    sessionToken : Text,
    gameId : Types.GameId,
    word : Text,
  ) : async Types.GuessResultV2 {
    switch (resolvePlayer(sessionToken)) {
      case null { #err(#gameError("Invalid or expired session")) };
      case (?playerName) {
        let normalized = word.toLower();
        if (not WordPoolLib.isPlausibleGuess(normalized)) {
          return #err(#notAWord);
        };
        switch (sessions.get(gameId)) {
          case null { #err(#gameError("Game not found")) };
          case (?session) {
            let now = Time.now();
            switch (GameLib.submitGuess(session, playerName, normalized, now)) {
              case (#err(msg)) { #err(#gameError(msg)) };
              case (#notYourTurn) { #err(#notYourTurn) };
              case (#ok((_guess, _status))) {
                #ok(GameLib.toGameState(session, ?playerName));
              };
            };
          };
        };
      };
    };
  };

  // leaveGame: cancel or forfeit.
  // Waiting game (only host, no opponent yet): delete silently, NO history.
  // Active game: mark expired, record history.
  public func leaveGame(
    sessionToken : Text,
    gameId : Types.GameId,
  ) : async Types.LeaveResult {
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        switch (sessions.get(gameId)) {
          case null { #err("Game not found") };
          case (?session) {
            let now = Time.now();
            switch (GameLib.removePlayer(session, playerName, now)) {
              case (#err(msg)) { #err(msg) };
              case (#delete) {
                // Creator cancelled a waiting game — remove entirely, no history.
                // Also clear any join token so the invite link stops working.
                sessions.remove(gameId);
                joinTokens.remove(gameId);
                #ok;
              };
              case (#keep) {
                // Active game: record history (only if 2 players present)
                recordHistory(session, now, #iForfeited, #opponentLeft);
                #ok;
              };
            };
          };
        };
      };
    };
  };

  public func requestRematch(
    sessionToken : Text,
    gameId : Types.GameId,
  ) : async { #ok : { newGameId : Types.GameId; roomCode : Types.RoomCode; joinToken : Text }; #err : Text } {
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        switch (sessions.get(gameId)) {
          case null { #err("Game not found") };
          case (?oldSession) {
            let counter = nextCounter();
            let now = Time.now();
            let newGameId = GameLib.generateGameId(counter);
            let newRoomCode = GameLib.generateRoomCode(counter, now);
            // Rematch: pick a fresh word for the same pair of players
            let p2Name : Text = if (oldSession.players.size() >= 2) { oldSession.players[1] } else { "tbd" };
            let answer = pickAnswerWord(playerName, p2Name);
            let salt = now.toNat() % 1_000_000_007;
            let joinToken = GameLib.generateJoinToken(counter, salt);
            // Create the new session with only the requester (host) — PB joins via acceptRematch
            let newSession = GameLib.newPrivateSession(newGameId, newRoomCode, playerName, oldSession.mode, answer, joinToken, now);
            sessions.add(newGameId, newSession);
            joinTokens.add(newGameId, joinToken);
            // Store the offer keyed by the ORIGINAL gameId so PB can find it by polling
            let offer : Types.RematchOffer = {
              newGameId;
              roomCode = newRoomCode;
              joinToken;
              offeredBy = playerName;
            };
            rematchOffers.add(gameId, offer);
            #ok({ newGameId; roomCode = newRoomCode; joinToken });
          };
        };
      };
    };
  };

  // getRematchOffer: allows PB to poll for a pending rematch offer from their finished game.
  public query func getRematchOffer(originalGameId : Types.GameId) : async ?Types.RematchOffer {
    rematchOffers.get(originalGameId);
  };

  // acceptRematch: PB accepts the rematch offer — auto-joins the new game and clears the offer.
  public func acceptRematch(
    sessionToken : Text,
    originalGameId : Types.GameId,
  ) : async Types.AcceptRematchResult {
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        switch (rematchOffers.get(originalGameId)) {
          case null { #err("No rematch offer found for this game") };
          case (?offer) {
            switch (sessions.get(offer.newGameId)) {
              case null { #err("Rematch game no longer exists") };
              case (?newSession) {
                // Prevent the host from accepting their own offer
                if (offer.offeredBy == playerName) {
                  return #err("You cannot accept your own rematch offer");
                };
                // Idempotent: if already in the new game, just return
                if (newSession.players.find(func(p) { p == playerName }) != null) {
                  rematchOffers.remove(originalGameId);
                  return #ok({ newGameId = offer.newGameId });
                };
                // Add PB to the new game
                let host = if (newSession.players.size() >= 1) { newSession.players[0] } else { "host" };
                let freshAnswer = pickWordForPair(WordPoolLib.getAnswerWords(), host, playerName);
                newSession.answer := freshAnswer;
                newSession.players := newSession.players.concat([playerName]);
                if (newSession.status == #waiting) {
                  newSession.status := #playing;
                };
                let now = Time.now();
                newSession.lastMoveAt := now;
                // Clear the offer — both players are now in the new game
                rematchOffers.remove(originalGameId);
                #ok({ newGameId = offer.newGameId });
              };
            };
          };
        };
      };
    };
  };

  // getGameByJoinToken: look up the gameId for a given join token.
  // Used by the frontend when the invite URL contains only the token (no gameId query param).
  public query func getGameByJoinToken(joinToken : Types.JoinToken) : async ?Types.GameId {
    switch (sessions.entries().find(func((_id, s)) {
      switch (s.joinToken) {
        case (?t) { t == joinToken };
        case null { false };
      };
    })) {
      case null { null };
      case (?(gameId, _)) { ?gameId };
    };
  };

  public query func getMyGameHistory(playerName : Types.PlayerName) : async [Types.GameHistoryEntry] {
    switch (gameHistory.get(playerName)) {
      case null { [] };
      case (?entries) { entries.toArray() };
    };
  };

  public func checkAndForceTimeouts() : async () {
    let now = Time.now();
    for (session in sessions.values()) {
      GameLib.checkTurnExpiry(session, now);
    };
  };
};

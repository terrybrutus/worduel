import Types "../types/game";
import GameLib "../lib/game";
import AuthLib "../lib/auth-and-stats";
import WordPoolLib "../lib/word-pool";
import WordPoolTypes "../types/word-pool";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Entropy "../lib/entropy";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Iter "mo:core/Iter";

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
  accounts : Map.Map<Text, AuthLib.PlayerAccount>,
  recordedGames : Set.Set<Text>,
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
    switch (AuthLib.resolveSession(authSessions,sessionToken)) {
      case null null;
      case (?name) { switch (accounts.get(name)) { case (?account) { if (account.isDisabled) null else ?name }; case null null } };
    };
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
    if (recordedGames.contains(session.id)) { return };
    recordedGames.add(session.id);
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

  let pendingAnswer = "crane";

  public func createPublicGame(
    sessionToken : Text,
    mode : Types.GameMode,
  ) : async Types.CreateGameResult {
    await createSizedGame(sessionToken,mode,5,false);
  };

  public func createSizedGame(sessionToken : Text, mode : Types.GameMode, length : Nat, isPrivate : Bool) : async Types.CreateGameResult {
    if (length < 5 or length > 7) return #err("Choose 5, 6, or 7 letters");
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        let nonce = await Entropy.hex();
        if (resolvePlayer(sessionToken) != ?playerName) { return #err("Session expired") };
        let counter = nextCounter();
        let now = Time.now();
        let gameId = GameLib.generateGameId(counter);
        let roomCode = GameLib.roomCodeFromSecret(nonce);
        let answer = WordPoolLib.getAnswerWordsForLength(length)[0];
        let session = if (isPrivate) GameLib.newPrivateSession(gameId,roomCode,playerName,mode,answer,nonce,now)
          else GameLib.newPublicSession(gameId,roomCode,playerName,mode,answer,now);
        sessions.add(gameId, session);
        if (isPrivate) joinTokens.add(gameId,nonce);
        #ok({ gameId; roomCode; joinToken = if (isPrivate) nonce else "" });
      };
    };
  };

  public func createPrivateGame(
    sessionToken : Text,
    mode : Types.GameMode,
  ) : async Types.CreatePrivateGameResult {
    await createSizedGame(sessionToken,mode,5,true);
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
              s.roomCode == roomCode and s.status == #waiting and (s.isPublic or s.roomCode.size() == 17)
            });
            switch (matchOpt) {
              case null { #err("Game not found or already started") };
              case (?(_, session)) {
                if (session.players.find(func(p) { p == playerName }) != null) {
                  return #err("You are already in this game");
                };
                // Pick a pair-specific word when P2 joins
                let host = if (session.players.size() >= 1) { session.players[0] } else { "host" };
                let freshAnswer = pickWordForPair(WordPoolLib.getAnswerWordsForLength(session.answer.size()), host, playerName);
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
    if (joinToken.size() != 64) return #err("This older invite has expired. Ask the host to create a new private game.");
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
                  let freshAnswer = pickWordForPair(WordPoolLib.getAnswerWordsForLength(session.answer.size()), host, playerName);
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
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        switch (sessions.get(gameId)) {
          case null { #err("Game not found") };
          case (?session) {
            if (GameLib.getPlayerNum(session,playerName) == 0) { return #err("You are not a player in this game") };
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
    switch (resolvePlayer(sessionToken)) {
      case null { null };
      case (?playerName) {
        switch (sessions.get(gameId)) {
          case null { null };
          case (?session) {
            if (GameLib.getPlayerNum(session,playerName) == 0) { return null };
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
    switch (resolvePlayer(sessionToken)) {
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
        if (not WordPoolLib.isValidWord(customWords, knownValidWords, normalized)) {
          return #err(#notAWord);
        };
        switch (sessions.get(gameId)) {
          case null { #err(#gameError("Game not found")) };
          case (?session) {
            let now = Time.now();
            switch (GameLib.submitGuess(session, playerName, normalized, now)) {
              case (#err(msg)) { #err(#gameError(msg)) };
              case (#notYourTurn) { #err(#notYourTurn) };
              case (#ok((_guess, newStatus))) {
                if (newStatus != #playing) { recordHistory(session,now,#normalPlay,#normalPlay) };
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
                for ((original,offer) in rematchOffers.entries().toArray().values()) {
                  if (offer.newGameId == gameId) rematchOffers.remove(original);
                };
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
            if (GameLib.getPlayerNum(oldSession,playerName) == 0) { return #err("You are not a player in this game") };
            if (oldSession.status == #playing or oldSession.status == #waiting) { return #err("Finish the round before requesting a rematch") };
            switch (rematchOffers.get(gameId)) {
              case (?offer) {
                if (offer.offeredBy != playerName) {
                  switch (await acceptRematch(sessionToken,gameId)) { case (#err(message)) return #err(message); case (#ok(_)) {} };
                };
                return #ok({ newGameId = offer.newGameId; roomCode = offer.roomCode; joinToken = offer.joinToken });
              };
              case null {};
            };
            let nonce = await Entropy.hex();
            if (resolvePlayer(sessionToken) != ?playerName) { return #err("Session expired") };
            switch (rematchOffers.get(gameId)) {
              case (?offer) {
                if (offer.offeredBy != playerName) {
                  switch (await acceptRematch(sessionToken,gameId)) { case (#err(message)) return #err(message); case (#ok(_)) {} };
                };
                return #ok({ newGameId = offer.newGameId; roomCode = offer.roomCode; joinToken = offer.joinToken });
              };
              case null {};
            };
            let counter = nextCounter();
            let now = Time.now();
            let newGameId = GameLib.generateGameId(counter);
            let newRoomCode = GameLib.roomCodeFromSecret(nonce);
            let joinToken = nonce;
            // Create the new session with only the requester (host) — PB joins via acceptRematch
            let newSession = GameLib.newPrivateSession(newGameId, newRoomCode, playerName, oldSession.mode, WordPoolLib.getAnswerWordsForLength(oldSession.answer.size())[0], joinToken, now);
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
    ignore originalGameId; null;
  };
  public query func getMyRematchOffer(sessionToken : Text, originalGameId : Types.GameId) : async ?Types.RematchOffer {
    switch (resolvePlayer(sessionToken),sessions.get(originalGameId)) {
      case (?name,?game) {
        if (GameLib.getPlayerNum(game,name) == 0) return null;
        switch (rematchOffers.get(originalGameId)) {
          case (?offer) { switch (sessions.get(offer.newGameId)) { case (?next) { if (next.status == #waiting and next.players.size() < 2 and offer.offeredBy != name) ?offer else null }; case null null } };
          case null null;
        };
      };
      case _ null;
    };
  };

  // acceptRematch: PB accepts the rematch offer — auto-joins the new game and clears the offer.
  public func acceptRematch(
    sessionToken : Text,
    originalGameId : Types.GameId,
  ) : async Types.AcceptRematchResult {
    switch (resolvePlayer(sessionToken)) {
      case null { #err("Invalid or expired session") };
      case (?playerName) {
        switch (sessions.get(originalGameId)) {
          case (?original) { if (GameLib.getPlayerNum(original,playerName) == 0) { return #err("You are not a player in this game") } };
          case null { return #err("Game not found") };
        };
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
                  return #ok({ newGameId = offer.newGameId });
                };
                // Add PB to the new game
                let host = if (newSession.players.size() >= 1) { newSession.players[0] } else { "host" };
                if (newSession.players.size() >= 2 or newSession.status != #waiting) return #err("Rematch is no longer available");
                let freshAnswer = pickWordForPair(WordPoolLib.getAnswerWordsForLength(newSession.answer.size()), host, playerName);
                newSession.answer := freshAnswer;
                newSession.players := newSession.players.concat([playerName]);
                if (newSession.status == #waiting) {
                  newSession.status := #playing;
                };
                let now = Time.now();
                newSession.lastMoveAt := now;
                // Clear the offer — both players are now in the new game
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
    if (joinToken.size() != 64) return null;
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
    ignore playerName; [];
  };
  public query func getSessionGameHistory(token : Text) : async [Types.GameHistoryEntry] {
    let playerName = switch (resolvePlayer(token)) { case (?name) name; case null return [] };
    switch (gameHistory.get(playerName)) {
      case null { [] };
      case (?entries) { entries.toArray() };
    };
  };

  public func checkAndForceTimeouts() : async () {
    let now = Time.now();
    for (session in sessions.values()) {
      GameLib.checkTurnExpiry(session, now);
      if (session.status != #playing and session.status != #waiting) { recordHistory(session,now,#normalPlay,#normalPlay) };
    };
  };
};

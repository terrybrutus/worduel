import GameTypes "types/game";
import AuthTypes "types/auth-and-stats";
import WordPoolTypes "types/word-pool";
import AuthLib "lib/auth-and-stats";
import GameMixin "mixins/game-api";
import AuthMixin "mixins/auth-and-stats-api";
import WordPoolMixin "mixins/word-pool-api";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Timer "mo:core/Timer";
import Time "mo:core/Time";




actor {
  // --- Game state ---
  let sessions = Map.empty<GameTypes.GameId, GameTypes.GameSession>();
  let counterBox = List.singleton<Nat>(0);
  // Separate monotonic counter for word selection — ensures different words even for
  // games created in the same millisecond
  let gameCounter = List.singleton<Nat>(0);
  let joinTokens = Map.empty<GameTypes.GameId, Text>();
  let gameHistory = Map.empty<GameTypes.PlayerName, List.List<GameTypes.GameHistoryEntry>>();
  let rematchOffers = Map.empty<GameTypes.GameId, GameTypes.RematchOffer>();

  // --- Auth & stats state ---
  let accounts = Map.empty<Text, AuthTypes.PlayerAccount>();
  let statsStore = Map.empty<Text, AuthTypes.PlayerStatsInternal>();
  let authSessions = Map.empty<Text, Text>();
  // Per-opponent records: Map<username, Map<opponentName, OpponentRecordInternal>>
  let opponentStore = Map.empty<Text, Map.Map<Text, AuthLib.OpponentRecordInternal>>();

  // adminSetupBox: mutable box for admin one-time setup state
  let adminSetupBox : AuthTypes.AdminSetupBox = {
    var consumed = false;
    var initialPass = null;
  };

  // --- Word pool state ---
  let customWords = List.empty<WordPoolTypes.WordPoolEntry>();
  // Cache of valid words fetched from Datamuse (and any externally validated words).
  // Used for guess validation without making synchronous HTTP calls during submitGuess.
  let knownValidWords = Set.empty<Text>();
  // usedWords: tracks answer words already used across games to prevent global repeats.
  let usedWords = Set.empty<Text>();
  // pairUsedWords: per-player-pair word tracking — prevents the same word for the same two players.
  let pairUsedWords = Map.empty<Text, Set.Set<Text>>();

  // Bootstrap admin account on first start (idempotent on upgrade).
  do {
    if (not accounts.containsKey("tmackk7121")) {
      let initialPassword = AuthLib.generateAdminPassword(Time.now());
      AuthLib.bootstrapAdmin(accounts, "tmackk7121", initialPassword);
      adminSetupBox.initialPass := ?initialPassword;
    };
  };

  // --- Mixins ---
  // GameMixin receives authSessions so it can resolve session tokens → player names,
  // plus customWords, knownValidWords for word validation, and usedWords for no-repeat selection
  include GameMixin(sessions, counterBox, gameCounter, joinTokens, gameHistory, rematchOffers, authSessions, customWords, knownValidWords, usedWords, pairUsedWords, statsStore, opponentStore);
  include AuthMixin(accounts, statsStore, authSessions, adminSetupBox, opponentStore);
  include WordPoolMixin(accounts, authSessions, customWords, knownValidWords);

  // --- Recurring timeout scanner: every 30 seconds ---
  let _timerId = Timer.recurringTimer<system>(#seconds(30), func() : async () {
    await checkAndForceTimeouts();
  });
};

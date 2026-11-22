import GameTypes "types/game";
import AuthTypes "types/auth-and-stats";
import WordPoolTypes "types/word-pool";
import AuthLib "lib/auth-and-stats";
import AccountTransfer "lib/account-transfer";
import GameMixin "mixins/game-api";
import AuthMixin "mixins/auth-and-stats-api";
import WordPoolMixin "mixins/word-pool-api";
import WordPoolLib "lib/word-pool";
import Wire "lib/wire";
import Challenges "types/challenges";
import ChallengeMixin "mixins/challenges-api";
import MeaningTypes "types/meanings";
import MeaningMixin "mixins/meanings-api";
import Error "mo:core/Error";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Timer "mo:core/Timer";




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
  let recordedGames = Set.empty<Text>();
  let challenges = Map.empty<Text,Challenges.Challenge>();
  let meanings = Map.empty<Text,MeaningTypes.Meaning>();
  let quizCache = Map.empty<Text,MeaningTypes.Quiz>();
  let aiAttempts = Map.empty<Text,Int>();
  let aiUsage = Map.empty<Text,Nat>();
  let wordBanks = Map.empty<Text,{revision:Nat;payload:Text}>();
  var legacyCacheImported = false;

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
  var nativeDictionaryVersion = 0;
  // usedWords: tracks answer words already used across games to prevent global repeats.
  let usedWords = Set.empty<Text>();
  // pairUsedWords: per-player-pair word tracking — prevents the same word for the same two players.
  let pairUsedWords = Map.empty<Text, Set.Set<Text>>();

  // Retain account/stat records, but retire plaintext-password credentials.
  do {
    if (nativeDictionaryVersion < 1) {
      for (word in WordPoolLib._makeGuessWordSet().values()) { knownValidWords.add(word) };
      nativeDictionaryVersion := 1;
    };
    adminSetupBox.initialPass := null;
    adminSetupBox.consumed := true;
    for (account in accounts.values()) {
      if (not account.passwordHash.startsWith(#text "identity:")) {
        account.passwordHash := "password-disabled";
      };
    };
    for (history in gameHistory.values()) { for (entry in history.values()) { recordedGames.add(entry.gameId) } };
  };

  // --- Mixins ---
  // GameMixin receives authSessions so it can resolve session tokens → player names,
  // plus customWords, knownValidWords for word validation, and usedWords for no-repeat selection
  include GameMixin(sessions, counterBox, gameCounter, joinTokens, gameHistory, rematchOffers, authSessions, customWords, knownValidWords, usedWords, pairUsedWords, statsStore, opponentStore, accounts, recordedGames);
  include AuthMixin(accounts, statsStore, authSessions, adminSetupBox, opponentStore);
  include WordPoolMixin(accounts, authSessions, customWords, knownValidWords);
  include ChallengeMixin(challenges,accounts,authSessions,customWords,knownValidWords);
  include MeaningMixin(meanings,quizCache,aiAttempts,aiUsage,authSessions,accounts);

  // Caffeine's sign-in hook calls this after verifying the provider delegation.
  // No implicit administrator enrollment and no email attributes are collected.
  public shared({caller}) func _initialize_access_control() : async () {
    if (caller.isAnonymous()) throw Error.reject("Sign in first");
  };

  func wordBankOwner(token : Text) : ?Text {
    let name = switch (AuthLib.resolveSession(authSessions,token)) {case (?n) n;case null return null};
    switch (accounts.get(name)) {case (?a) {if (a.isDisabled) return null};case null return null};
    ?name;
  };
  public query func getWordBank(token : Text) : async AccountTransfer.Bank {
    let name = switch (wordBankOwner(token)) {case (?n) n;case null throw Error.reject("Session expired or account unavailable")};
    switch (wordBanks.get(name)) {case (?bank) bank;case null ({revision=0;payload="[]"})};
  };
  public func putWordBank(token : Text, revision : Nat, payload : Text) : async AccountTransfer.Bank {
    let name = switch (wordBankOwner(token)) {case (?n) n;case null throw Error.reject("Session expired or account unavailable")};
    let existing = switch (wordBanks.get(name)) {case (?bank) bank;case null ({revision=0;payload="[]"})};
    if (existing.revision != revision) throw Error.reject("Word Bank changed on another device. Retry sync.");
    let checked = switch (AccountTransfer.mergeWords([payload])) {case (#ok(p)) p;case (#err(e)) throw Error.reject(e)};
    let bank = {revision=revision+1;payload=checked};
    wordBanks.add(name,bank);
    bank;
  };

  public shared({caller}) func signInAndCarryGuest(requestedUsername : Text, guestToken : Text, localWords : Text) : async {
    #ok : { token : Text; username : Text; guestProgress : Text };
    #err : Text;
  } {
    if (caller.isAnonymous()) return #err("Sign in with Google or Microsoft first.");
    let name = requestedUsername.trim(#char ' ');
    if (name.size() > 24) return #err("Use a username of up to 24 letters, numbers, underscores or hyphens.");
    for (c in name.chars()) {
      if (not ((c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or (c >= '0' and c <= '9') or c == '_' or c == '-')) return #err("Use only letters, numbers, underscores or hyphens in your username.");
    };
    // Entropy is the only await: ownership checks and the transfer commit atomically after it.
    let token = await AuthLib.generateToken("identity",0);
    let owner = caller.toText();
    let existing = AuthLib.findAccountByIdentity(accounts,owner);
    switch (existing) { case (?a) { if (a.isDisabled) return #err("Account is disabled") }; case null {} };
    var source : ?AuthTypes.PlayerAccount = null;
    var progress = "none";
    if (guestToken != "") {
      switch (AuthLib.resolveSession(authSessions,guestToken)) {
        case null { progress := "expired" };
        case (?name) switch (accounts.get(name)) {
          case (?account) {
            if (account.passwordHash == "identity:merged:" # owner) progress := "already-merged"
            else if (not account.isDisabled and account.passwordHash.startsWith(#text "identity:guest:")) {
              source := ?account; progress := "merged";
            } else return #err("Only your current guest progress can be transferred.");
          };
          case null return #err("Guest progress could not be verified.");
        };
      };
    };
    let targetName = switch (existing) { case (?a) a.username; case null "" };
    switch (source) {
      case (?guest) {
        for (game in sessions.values()) {
          if ((game.status == #playing or game.status == #waiting) and game.players.find(func(n) { n == guest.username }) != null and game.players.find(func(n) { n == targetName }) != null)
            return #err("Finish the match between these players before combining their progress.");
        };
      };
      case null {};
    };
    let emptyBank = {revision=0;payload="[]"};
    let targetBank = switch (wordBanks.get(targetName)) { case (?b) b; case null emptyBank };
    let guestBank = switch (source) { case (?a) switch (wordBanks.get(a.username)) {case (?b) b; case null emptyBank}; case null emptyBank };
    let payload = switch (AccountTransfer.mergeWords([targetBank.payload,guestBank.payload,localWords])) { case (#ok(p)) p; case (#err(e)) return #err(e) };
    let target = switch (existing) { case (?a) a; case null AuthLib.createIdentityAccount(accounts,requestedUsername,owner,#player) };
    switch (source) {
      case (?guest) {
        AccountTransfer.moveProgress(guest.username,target.username,statsStore,gameHistory,opponentStore,sessions,rematchOffers,challenges);
        guest.passwordHash := "identity:merged:" # owner;
        guest.isDisabled := true;
      };
      case null {};
    };
    wordBanks.add(target.username,{revision=targetBank.revision+1;payload});
    AuthLib.createSession(authSessions,token,target.username);
    #ok({token;username=target.username;guestProgress=progress});
  };

  public shared({caller}) func importLegacyCache(entries : [(Text,MeaningTypes.Meaning)], questions : [(Text,MeaningTypes.Quiz)], day : Int, dailyAttempts : Nat, monthlyAttempts : Nat) : async Bool {
    if (not caller.isController() or legacyCacheImported) return false;
    if (entries.size() > 5000 or questions.size() > 5000) throw Error.reject("Legacy cache is too large");
    for ((word,entry) in entries.values()) { if (not meanings.containsKey(word)) meanings.add(word,entry) };
    for ((key,question) in questions.values()) { if (not quizCache.containsKey(key)) quizCache.add(key,question) };
    func existing(key : Text) : Nat { switch (aiUsage.get(key)) {case (?n) n; case null 0} };
    let today = "ai:" # day.toText();
    let previous = "ai:" # (day-1).toText();
    let todayCount = if (existing(today) > dailyAttempts) existing(today) else dailyAttempts;
    aiUsage.add(today,todayCount);
    let earlier = if (monthlyAttempts > dailyAttempts) Nat.sub(monthlyAttempts,dailyAttempts) else 0;
    if (existing(previous) < earlier) aiUsage.add(previous,earlier);
    legacyCacheImported := true;
    true;
  };

  public func appCall(token : Text, method : Text, rawArgs : Text) : async Text {
    if (rawArgs.size() > (if (method == "wordBankPut") 600000 else 12000)) throw Error.reject("Request too large");
    let args = Wire.args(rawArgs);
    switch (method) {
      case ("guest") { Wire.encode(to_candid(await registerGuest())) };
      case ("getMyProfile") { Wire.encode(to_candid(await getMyProfile(token))) };
      case ("isGuestSession") {
        let name = switch (AuthLib.resolveSession(authSessions,token)) {case (?n) n;case null throw Error.reject("Session expired")};
        let account = switch (accounts.get(name)) {case (?a) a;case null throw Error.reject("Account unavailable")};
        if (account.isDisabled) throw Error.reject("Account unavailable");
        Wire.encode(to_candid(account.passwordHash.startsWith(#text "identity:guest:")));
      };
      case ("getUsernameForSession") { Wire.encode(to_candid(await getUsernameForSession(token))) };
      case ("getMyStats") { Wire.encode(to_candid(await getMyStats(token))) };
      case ("logout") { await logout(token); "null" };
      case ("getAdminSetupInfo") { "null" };
      case ("changePassword" or "resetPlayerPassword" or "promoteToAdmin") { Wire.encode(to_candid(#err("Use Caffeine identity. Administrator access requires controller provisioning."))) };
      case ("wordBankGet" or "wordBankPut") {
        let name = switch (AuthLib.resolveSession(authSessions,token)) { case (?n) n; case null throw Error.reject("Session expired") };
        switch (accounts.get(name)) { case (?a) { if (a.isDisabled) throw Error.reject("Account is disabled") }; case null throw Error.reject("Invalid account") };
        let existing = switch (wordBanks.get(name)) { case (?bank) bank; case null ({revision=0;payload="[]"}) };
        if (method == "wordBankGet") return Wire.encode(to_candid(existing));
        if (existing.revision != Wire.nat(args,0,0)) throw Error.reject("Word Bank changed on another device. Retry sync.");
        let payload = Wire.text(args,1);
        if (payload.size() > 500000) throw Error.reject("Word Bank storage limit reached");
        switch (Wire.parse(payload)) { case (#Array(words)) { if (words.size() > 1000) throw Error.reject("Word Bank supports up to 1000 saved words") }; case _ throw Error.reject("Invalid Word Bank data") };
        let saved = {revision=existing.revision+1;payload};
        wordBanks.add(name,saved); Wire.encode(to_candid(saved));
      };
      case ("getMyOpponentStats") { Wire.encode(to_candid(await getMyOpponentStats(token))) };
      case ("getMyActiveGames") { Wire.encode(to_candid(await getMyActiveGames(token))) };
      case ("listPublicGames") { Wire.encode(to_candid(await listPublicGames())) };
      case ("createPrivateGame" or "createPublicGame") {
        let mode = if (Wire.text(args,1) == "coop") #coop else #versus;
        Wire.encode(to_candid(await createSizedGame(token,mode,Wire.nat(args,2,5),method == "createPrivateGame")));
      };
      case ("joinGame") {
        let invite = Wire.text(args,2);
        Wire.encode(to_candid(await joinGame(token,Wire.text(args,1),if (invite == "") null else ?invite)));
      };
      case ("joinByToken") {
        let hint = Wire.text(args,2);
        Wire.encode(to_candid(await joinByToken(token,Wire.text(args,1),if (hint == "") null else ?hint)));
      };
      case ("getGameState") { Wire.encode(to_candid(await getGameState(token,Wire.text(args,1)))) };
      case ("getGameStateWithRole") { Wire.encode(to_candid(await getGameStateWithRole(Wire.text(args,0),token))) };
      case ("getGameByJoinToken") { Wire.encode(to_candid(await getGameByJoinToken(Wire.text(args,0)))) };
      case ("submitGuess") { Wire.encode(to_candid(await submitGuess(token,Wire.text(args,1),Wire.text(args,2)))) };
      case ("leaveGame") { Wire.encode(to_candid(await leaveGame(token,Wire.text(args,1)))) };
      case ("requestRematch") { Wire.encode(to_candid(await requestRematch(token,Wire.text(args,1)))) };
      case ("getRematchOffer") { Wire.encode(to_candid(await getMyRematchOffer(token,Wire.text(args,0)))) };
      case ("acceptRematch") { Wire.encode(to_candid(await acceptRematch(token,Wire.text(args,1)))) };
      case ("getMyGameHistory") {
        Wire.encode(to_candid(await getSessionGameHistory(token)));
      };
      case ("validateGuessWord") { Wire.encode(to_candid(await validateGuessWord(Wire.text(args,0)))) };
      case ("getDictionaryInfo") { Wire.encode(to_candid(await getDictionaryInfo())) };
      case ("validateGuessWordDebug") { Wire.encode(to_candid(await validateGuessWordDebug(Wire.text(args,0)))) };
      case ("getWordCount") { Wire.encode(to_candid(await getWordCount())) };
      case ("getAllWords") { Wire.encode(to_candid(await getAllWords(token))) };
      case ("listAllPlayers") { Wire.encode(to_candid(await listAllPlayers(token))) };
      case ("getAllPlayerStats") { Wire.encode(to_candid(await getAllPlayerStats(token))) };
      case ("disablePlayer") { Wire.encode(to_candid(await disablePlayer(token,Wire.text(args,1)))) };
      case ("enablePlayer") { Wire.encode(to_candid(await enablePlayer(token,Wire.text(args,1)))) };
      case ("addWord") { Wire.encode(to_candid(await addWord(token,Wire.text(args,1)))) };
      case ("removeWord") { Wire.encode(to_candid(await removeWord(token,Wire.text(args,1)))) };
      case ("importWords") {
        let list = if (args.size() > 1) Wire.array(args[1]) else [];
        let words = list.map(func(v) { Wire.string(v) });
        Wire.encode(to_candid(await importWords(token,words)));
      };
      case ("dailyChallenge" or "createReplay" or "listChallenges" or "challengeState" or "submitChallengeGuess") { await challengeCall(token,method,rawArgs) };
      case ("wordMeaning" or "wordQuiz") { await meaningCall(token,method,rawArgs) };
      case _ throw Error.reject("Unknown native backend operation: " # method);
    };
  };

  // --- Recurring timeout scanner: every 30 seconds ---
  let _timerId = Timer.recurringTimer<system>(#seconds(30), func() : async () {
    await checkAndForceTimeouts();
  });
};

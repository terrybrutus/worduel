import Types "../types/auth-and-stats";
import Common "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";

module {
  public type PlayerAccount = Types.PlayerAccount;
  public type PlayerStats = Types.PlayerStats;
  public type PlayerStatsInternal = Types.PlayerStatsInternal;
  public type PlayerInfo = Types.PlayerInfo;
  public type Role = Types.Role;
  public type SessionToken = Types.SessionToken;
  public type OpponentRecord = Types.OpponentRecord;

  func legacyPasswordHash(password : Text) : Text {
    "rpc:" # password;
  };

  func hashPassword(username : Text, password : Text) : Text {
    "v2:" # username # ":" # password;
  };

  public func verifyPassword(account : PlayerAccount, candidate : Text) : Bool {
    account.passwordHash == hashPassword(account.username, candidate)
      or account.passwordHash == legacyPasswordHash(candidate);
  };

  public func upgradePasswordHashIfLegacy(account : PlayerAccount, candidate : Text) {
    if (account.passwordHash == legacyPasswordHash(candidate)) {
      account.passwordHash := hashPassword(account.username, candidate);
    };
  };

  public func generateToken(username : Text, now : Int) : SessionToken {
    ignore username;
    "tok:" # generateAdminPassword(now) # ":" # now.toText();
  };

  public func createAccount(
    accounts : Map.Map<Text, PlayerAccount>,
    username : Text,
    password : Text,
    role : Role,
  ) : { #ok; #err : Text } {
    if (accounts.containsKey(username)) {
      return #err("Username already taken");
    };
    if (username.size() < 3) {
      return #err("Username must be at least 3 characters");
    };
    let account : PlayerAccount = {
      username;
      var passwordHash = hashPassword(username, password);
      role;
      var isDisabled = false;
      createdAt = Time.now();
    };
    accounts.add(username, account);
    #ok;
  };

  public func getAccount(
    accounts : Map.Map<Text, PlayerAccount>,
    username : Text,
  ) : ?PlayerAccount {
    accounts.get(username);
  };

  public func setPassword(
    account : PlayerAccount,
    newPassword : Text,
  ) {
    account.passwordHash := hashPassword(account.username, newPassword);
  };

  public func disableAccount(
    accounts : Map.Map<Text, PlayerAccount>,
    username : Text,
  ) : { #ok; #err : Text } {
    switch (accounts.get(username)) {
      case null { #err("Account not found") };
      case (?account) {
        account.isDisabled := true;
        #ok;
      };
    };
  };

  public func enableAccount(
    accounts : Map.Map<Text, PlayerAccount>,
    username : Text,
  ) : { #ok; #err : Text } {
    switch (accounts.get(username)) {
      case null { #err("Account not found") };
      case (?account) {
        account.isDisabled := false;
        #ok;
      };
    };
  };

  public func listAllAccounts(
    accounts : Map.Map<Text, PlayerAccount>,
    statsStore : Map.Map<Text, PlayerStatsInternal>,
  ) : [PlayerInfo] {
    accounts.values()
      .map<PlayerAccount, PlayerInfo>(func(a) { toPlayerInfo(a, statsStore) })
      .toArray();
  };

  public func isAdmin(
    accounts : Map.Map<Text, PlayerAccount>,
    username : Text,
  ) : Bool {
    switch (accounts.get(username)) {
      case null { false };
      case (?account) {
        switch (account.role) {
          case (#admin) { true };
          case (#player) { false };
        };
      };
    };
  };

  public func createSession(
    sessions : Map.Map<Text, Text>,
    token : Text,
    username : Text,
  ) {
    sessions.add(token, username);
  };

  public func resolveSession(
    sessions : Map.Map<Text, Text>,
    token : Text,
  ) : ?Text {
    sessions.get(token);
  };

  public func invalidateSession(
    sessions : Map.Map<Text, Text>,
    token : Text,
  ) {
    sessions.remove(token);
  };

  public func getStats(
    statsStore : Map.Map<Text, PlayerStatsInternal>,
    username : Text,
  ) : PlayerStats {
    switch (statsStore.get(username)) {
      case null {
        { totalWins = 0; totalLosses = 0; currentStreak = 0; bestStreak = 0 };
      };
      case (?s) {
        {
          totalWins = s.totalWins;
          totalLosses = s.totalLosses;
          currentStreak = s.currentStreak;
          bestStreak = s.bestStreak;
        };
      };
    };
  };

  public func updateStats(
    statsStore : Map.Map<Text, PlayerStatsInternal>,
    username : Text,
    win : Bool,
  ) {
    let s : PlayerStatsInternal = switch (statsStore.get(username)) {
      case null {
        let fresh : PlayerStatsInternal = {
          var totalWins = 0;
          var totalLosses = 0;
          var currentStreak = 0;
          var bestStreak = 0;
        };
        statsStore.add(username, fresh);
        fresh;
      };
      case (?existing) { existing };
    };
    if (win) {
      s.totalWins += 1;
      s.currentStreak += 1;
      if (s.currentStreak > s.bestStreak) {
        s.bestStreak := s.currentStreak;
      };
    } else {
      s.totalLosses += 1;
      s.currentStreak := 0;
    };
  };

  public type OpponentRecordInternal = {
    var wins : Nat;
    var losses : Nat;
    var draws : Nat;
  };

  public func updateOpponentStats(
    opponentStore : Map.Map<Text, Map.Map<Text, OpponentRecordInternal>>,
    username : Text,
    opponentName : Text,
    outcome : { #win; #loss; #draw },
  ) {
    let playerMap : Map.Map<Text, OpponentRecordInternal> = switch (opponentStore.get(username)) {
      case (?m) { m };
      case null {
        let m = Map.empty<Text, OpponentRecordInternal>();
        opponentStore.add(username, m);
        m;
      };
    };
    let rec : OpponentRecordInternal = switch (playerMap.get(opponentName)) {
      case (?r) { r };
      case null {
        let r : OpponentRecordInternal = { var wins = 0; var losses = 0; var draws = 0 };
        playerMap.add(opponentName, r);
        r;
      };
    };
    switch (outcome) {
      case (#win)  { rec.wins  += 1 };
      case (#loss) { rec.losses += 1 };
      case (#draw) { rec.draws += 1 };
    };
  };

  public func getOpponentStats(
    opponentStore : Map.Map<Text, Map.Map<Text, OpponentRecordInternal>>,
    username : Text,
  ) : [(Text, OpponentRecord)] {
    switch (opponentStore.get(username)) {
      case null { [] };
      case (?playerMap) {
        playerMap.entries()
          .map<(Text, OpponentRecordInternal), (Text, OpponentRecord)>(func((name, r)) {
             (name, { wins = r.wins; losses = r.losses })
          })
          .toArray();
      };
    };
  };

  public func getAllStats(
    accounts : Map.Map<Text, PlayerAccount>,
    statsStore : Map.Map<Text, PlayerStatsInternal>,
  ) : [PlayerInfo] {
    listAllAccounts(accounts, statsStore);
  };

  public func bootstrapAdmin(
    accounts : Map.Map<Text, PlayerAccount>,
    adminUsername : Text,
    password : Text,
  ) {
    if (not accounts.containsKey(adminUsername)) {
      let account : PlayerAccount = {
        username = adminUsername;
        var passwordHash = hashPassword(adminUsername, password);
        role = #admin;
        var isDisabled = false;
        createdAt = Time.now();
      };
      accounts.add(adminUsername, account);
    };
  };

  // Promote an existing account to admin role.
  // Since `role` is immutable, we replace the map entry with a new record.
  public func promoteToAdmin(
    accounts : Map.Map<Text, PlayerAccount>,
    username : Text,
  ) : { #ok; #err : Text } {
    switch (accounts.get(username)) {
      case null { #err("Account not found") };
      case (?existing) {
        let promoted : PlayerAccount = {
          username = existing.username;
          var passwordHash = existing.passwordHash;
          role = #admin;
          var isDisabled = existing.isDisabled;
          createdAt = existing.createdAt;
        };
        accounts.add(username, promoted);
        #ok;
      };
    };
  };

  public func generateAdminPassword(seed : Int) : Text {
    let chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let arr = chars.toArray();
    let len = arr.size();
    let s = if (seed < 0) { (-seed).toNat() } else { seed.toNat() };
    var result = "";
    var i = 0;
    while (i < 8) {
      let idx = (s + i * 37) % len;
      let char = arr[idx];
      result := result # Text.fromChar(char);
      i += 1;
    };
    result;
  };

  public func toPlayerInfo(
    account : PlayerAccount,
    statsStore : Map.Map<Text, PlayerStatsInternal>,
  ) : PlayerInfo {
    {
      username = account.username;
      role = account.role;
      isDisabled = account.isDisabled;
      createdAt = account.createdAt;
      stats = getStats(statsStore, account.username);
    };
  };
};

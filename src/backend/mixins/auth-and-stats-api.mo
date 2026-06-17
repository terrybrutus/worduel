import Types "../types/auth-and-stats";
import AuthLib "../lib/auth-and-stats";
import Map "mo:core/Map";
import Time "mo:core/Time";

mixin (
  accounts : Map.Map<Text, AuthLib.PlayerAccount>,
  statsStore : Map.Map<Text, AuthLib.PlayerStatsInternal>,
  sessions : Map.Map<Text, Text>,
  adminSetupBox : Types.AdminSetupBox,
  opponentStore : Map.Map<Text, Map.Map<Text, AuthLib.OpponentRecordInternal>>,
) {

  func requireSession(token : Text) : ?Text {
    AuthLib.resolveSession(sessions, token);
  };

  func requireAdmin(token : Text) : ?Text {
    switch (requireSession(token)) {
      case null { null };
      case (?username) {
        if (AuthLib.isAdmin(accounts, username)) { ?username } else { null };
      };
    };
  };

  public func register(username : Text, password : Text) : async Types.RegisterResult {
    switch (AuthLib.createAccount(accounts, username, password, #player)) {
      case (#err(msg)) { #err(msg) };
      case (#ok) {
        let token = AuthLib.generateToken(username, Time.now());
        AuthLib.createSession(sessions, token, username);
        #ok(token);
      };
    };
  };

  public func login(username : Text, password : Text) : async Types.LoginResult {
    switch (AuthLib.getAccount(accounts, username)) {
      case null { #err("Invalid username or password") };
      case (?account) {
        if (account.isDisabled) {
          return #err("Account is disabled");
        };
        if (not AuthLib.verifyPassword(account, password)) {
          return #err("Invalid username or password");
        };
        AuthLib.upgradePasswordHashIfLegacy(account, password);
        let token = AuthLib.generateToken(username, Time.now());
        AuthLib.createSession(sessions, token, username);
        #ok(token);
      };
    };
  };

  public func logout(token : Text) : async () {
    AuthLib.invalidateSession(sessions, token);
  };

  public func changePassword(token : Text, oldPassword : Text, newPassword : Text) : async Types.AuthResult {
    switch (requireSession(token)) {
      case null { #err("Invalid or expired session") };
      case (?username) {
        switch (AuthLib.getAccount(accounts, username)) {
          case null { #err("Account not found") };
          case (?account) {
            if (not AuthLib.verifyPassword(account, oldPassword)) {
              return #err("Old password is incorrect");
            };
            AuthLib.setPassword(account, newPassword);
            if (username == "admin") {
              adminSetupBox.initialPass := null;
              adminSetupBox.consumed := true;
            };
            #ok;
          };
        };
      };
    };
  };

  public func getMyStats(token : Text) : async ?Types.PlayerStats {
    switch (requireSession(token)) {
      case null { null };
      case (?username) {
        ?AuthLib.getStats(statsStore, username);
      };
    };
  };

  public func recordResult(token : Text, win : Bool, opponentName : Text, outcome : { #win; #loss; #draw }) : async Types.AuthResult {
    switch (requireSession(token)) {
      case null { #err("Invalid or expired session") };
      case (?username) {
        AuthLib.updateStats(statsStore, username, win);
        AuthLib.updateOpponentStats(opponentStore, username, opponentName, outcome);
        #ok;
      };
    };
  };

  public query func getMyOpponentStats(token : Text) : async [(Text, Types.OpponentRecord)] {
    switch (requireSession(token)) {
      case null { [] };
      case (?username) {
        AuthLib.getOpponentStats(opponentStore, username);
      };
    };
  };

  public func getAllPlayerStats(token : Text) : async [Types.PlayerInfo] {
    switch (requireAdmin(token)) {
      case null { [] };
      case (?_) {
        AuthLib.getAllStats(accounts, statsStore);
      };
    };
  };

  public func resetPlayerPassword(token : Text, username : Text, newPassword : Text) : async Types.AuthResult {
    switch (requireAdmin(token)) {
      case null { #err("Unauthorized") };
      case (?_) {
        switch (AuthLib.getAccount(accounts, username)) {
          case null { #err("Account not found") };
          case (?account) {
            AuthLib.setPassword(account, newPassword);
            #ok;
          };
        };
      };
    };
  };

  public func disablePlayer(token : Text, username : Text) : async Types.AuthResult {
    switch (requireAdmin(token)) {
      case null { #err("Unauthorized") };
      case (?_) {
        switch (AuthLib.disableAccount(accounts, username)) {
          case (#ok) { #ok };
          case (#err(msg)) { #err(msg) };
        };
      };
    };
  };

  public func enablePlayer(token : Text, username : Text) : async Types.AuthResult {
    switch (requireAdmin(token)) {
      case null { #err("Unauthorized") };
      case (?_) {
        switch (AuthLib.enableAccount(accounts, username)) {
          case (#ok) { #ok };
          case (#err(msg)) { #err(msg) };
        };
      };
    };
  };

  public func listAllPlayers(token : Text) : async [Types.PlayerInfo] {
    switch (requireAdmin(token)) {
      case null { [] };
      case (?_) {
        AuthLib.listAllAccounts(accounts, statsStore);
      };
    };
  };

  // Self-service admin promotion is disabled; admin access should come from an
  // existing admin account rather than a repo-embedded shared secret.
  public func promoteToAdmin(username : Text, secretKey : Text) : async { #ok : { message : Text; role : Text; newToken : Text }; #err : Text } {
    ignore username;
    ignore secretKey;
    #err("Self-service admin promotion is disabled. Sign in with an existing admin account.");
  };

  public query func getAdminSetupInfo() : async ?Types.AdminSetupInfo {
    if (adminSetupBox.consumed) {
      return null;
    };
    switch (adminSetupBox.initialPass) {
      case null { null };
      case (?pass) {
        ?{ username = "tmackk7121"; initialPassword = pass };
      };
    };
  };
};

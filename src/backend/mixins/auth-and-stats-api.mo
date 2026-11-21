import Types "../types/auth-and-stats";
import AuthLib "../lib/auth-and-stats";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Text "mo:core/Text";

mixin (
  accounts : Map.Map<Text, AuthLib.PlayerAccount>,
  statsStore : Map.Map<Text, AuthLib.PlayerStatsInternal>,
  sessions : Map.Map<Text, Text>,
  adminSetupBox : Types.AdminSetupBox,
  opponentStore : Map.Map<Text, Map.Map<Text, AuthLib.OpponentRecordInternal>>,
) {
  func requireSession(token : Text) : ?Text {
    switch (AuthLib.resolveSession(sessions, token)) {
      case null null;
      case (?username) { switch (accounts.get(username)) { case (?account) { if (account.isDisabled) null else ?username }; case null null } };
    };
  };
  func requireAdmin(token : Text) : Bool {
    switch (requireSession(token)) { case (?username) AuthLib.isAdmin(accounts, username); case null false };
  };
  public query func getUsernameForSession(token : Text) : async ?Text { requireSession(token) };
  public query func getMyProfile(token : Text) : async ?Types.PlayerInfo {
    switch (requireSession(token)) { case null null; case (?name) { switch (accounts.get(name)) { case null null; case (?account) ?AuthLib.toPlayerInfo(account,statsStore) } } };
  };
  public func register(username : Text, password : Text) : async Types.RegisterResult {
    ignore username; ignore password; #err("Use Caffeine identity sign-in or guest play. Password registration is disabled.");
  };
  public func login(username : Text, password : Text) : async Types.LoginResult {
    ignore username; ignore password; #err("Use Caffeine identity sign-in. Legacy password login is disabled.");
  };
  public func registerGuest() : async { token : Text; username : Text } {
    let token = await AuthLib.generateToken("guest",Time.now());
    let account = AuthLib.createIdentityAccount(accounts,"Guest", "guest:" # token, #player);
    AuthLib.createSession(sessions,token,account.username);
    { token; username = account.username };
  };
  public shared({ caller }) func loginWithIdentity(requestedUsername : Text) : async Types.LoginResult {
    if (caller.isAnonymous()) { return #err("Sign in with Caffeine identity first") };
    let token = await AuthLib.generateToken("identity",Time.now());
    let account = switch (AuthLib.findAccountByIdentity(accounts,caller.toText())) {
      case (?existing) existing;
      case null AuthLib.createIdentityAccount(accounts,requestedUsername,caller.toText(),#player);
    };
    if (account.isDisabled) { return #err("Account is disabled") };
    AuthLib.createSession(sessions,token,account.username);
    #ok(token);
  };
  public func logout(token : Text) : async () { AuthLib.invalidateSession(sessions,token) };
  public func changePassword(token : Text, oldPassword : Text, newPassword : Text) : async Types.AuthResult {
    ignore token; ignore oldPassword; ignore newPassword; #err("Passwords are managed by the identity provider.");
  };
  public func resetPlayerPassword(token : Text, username : Text, newPassword : Text) : async Types.AuthResult {
    ignore token; ignore username; ignore newPassword; #err("Passwords are managed by the identity provider.");
  };
  public shared({ caller }) func provisionIdentityAdmin(username : Text, identity : Principal) : async Types.AuthResult {
    if (not caller.isController() or identity.isAnonymous()) { return #err("Only a canister controller can provision an identity administrator") };
    switch (AuthLib.findAccountByIdentity(accounts,identity.toText())) {
      case (?existing) { if (existing.username != username) { return #err("Provision the identity's existing username") } };
      case null {};
    };
    for ((token,name) in sessions.entries().toArray().values()) { if (name == username) { sessions.remove(token) } };
    let old = accounts.get(username);
    let account : Types.PlayerAccount = {
      username; var passwordHash = "identity:" # identity.toText(); role = #admin;
      var isDisabled = false; createdAt = switch (old) { case (?a) a.createdAt; case null Time.now() };
    };
    accounts.add(username,account);
    #ok;
  };
  public func getMyStats(token : Text) : async ?Types.PlayerStats {
    switch (requireSession(token)) { case null null; case (?name) ?AuthLib.getStats(statsStore,name) };
  };
  public func recordResult(token : Text, win : Bool, opponentName : Text, outcome : { #win; #loss; #draw }) : async Types.AuthResult {
    ignore token; ignore win; ignore opponentName; ignore outcome;
    #err("Results are recorded only by the game engine.");
  };
  public query func getMyOpponentStats(token : Text) : async [(Text,Types.OpponentRecord)] {
    switch (requireSession(token)) { case null []; case (?name) AuthLib.getOpponentStats(opponentStore,name) };
  };
  public func getAllPlayerStats(token : Text) : async [Types.PlayerInfo] {
    if (requireAdmin(token)) AuthLib.getAllStats(accounts,statsStore) else [];
  };
  public func listAllPlayers(token : Text) : async [Types.PlayerInfo] {
    if (requireAdmin(token)) AuthLib.listAllAccounts(accounts,statsStore) else [];
  };
  public func disablePlayer(token : Text, username : Text) : async Types.AuthResult {
    if (not requireAdmin(token)) { return #err("Unauthorized") };
    AuthLib.disableAccount(accounts,username);
  };
  public func enablePlayer(token : Text, username : Text) : async Types.AuthResult {
    if (not requireAdmin(token)) { return #err("Unauthorized") };
    AuthLib.enableAccount(accounts,username);
  };
  public func promoteToAdmin(username : Text, secretKey : Text) : async { #ok : { message : Text; role : Text; newToken : Text }; #err : Text } {
    ignore username; ignore secretKey; #err("Administrator roles require controller provisioning.");
  };
  public query func getAdminSetupInfo() : async ?Types.AdminSetupInfo { null };
};

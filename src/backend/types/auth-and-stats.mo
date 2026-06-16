import Common "common";

module {
  public type PlayerName    = Common.PlayerName;
  public type Timestamp     = Common.Timestamp;
  public type SessionToken  = Common.SessionToken;

  // ─── Role ──────────────────────────────────────────────────────────────────

  public type Role = {
    #admin;
    #player;
  };

  // ─── Account (internal, mutable) — NEVER returned raw over API ─────────────

  public type PlayerAccount = {
    username         : Text;
    var passwordHash : Text;    // bcrypt/sha256 hash
    role             : Role;
    var isDisabled   : Bool;
    createdAt        : Timestamp;
  };

  // ─── Stats (internal, mutable) ─────────────────────────────────────────────

  // Per-opponent win/loss record — stored in a map keyed by opponent username
  public type OpponentRecord = {
    wins   : Nat;
    losses : Nat;
  };

  public type PlayerStatsInternal = {
    var totalWins     : Nat;
    var totalLosses   : Nat;
    var currentStreak : Nat;
    var bestStreak    : Nat;
  };

  // ─── Public types (shared, safe for API boundary) ──────────────────────────

  // Immutable player stats — safe to return over the wire
  public type PlayerStats = {
    totalWins     : Nat;
    totalLosses   : Nat;
    currentStreak : Nat;
    bestStreak    : Nat;
  };

  // Admin panel player listing entry
  public type PlayerInfo = {
    username   : Text;
    role       : Role;
    isDisabled : Bool;
    createdAt  : Timestamp;
    stats      : PlayerStats;
  };

  // ─── Auth result types ─────────────────────────────────────────────────────

  public type LoginResult = {
    #ok : SessionToken;
    #err : Text;
  };

  public type RegisterResult = {
    #ok : SessionToken;
    #err : Text;
  };

  public type AuthResult = {
    #ok;
    #err : Text;
  };

  // ─── Admin setup ───────────────────────────────────────────────────────────

  // Mutable box for one-time admin credential delivery
  public type AdminSetupBox = {
    var consumed    : Bool;
    var initialPass : ?Text;
  };

  // One-time admin credential info returned to client
  public type AdminSetupInfo = {
    username        : Text;
    initialPassword : Text;
  };
};

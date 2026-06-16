import Common "common";

module {
  public type PlayerName = Common.PlayerName;
  public type Timestamp  = Common.Timestamp;

  // ─── Word pool entries ─────────────────────────────────────────────────────

  // A single entry in the custom word pool (admin-managed or Datamuse-sourced)
  public type WordPoolEntry = {
    word    : Text;
    addedAt : Timestamp;
    addedBy : ?PlayerName; // null = system/Datamuse; set when admin adds manually
  };

  // Validation source hint — tracks where a word was confirmed valid
  public type ValidationSource = {
    #embedded;  // found in the baked-in 5-letter word list
    #datamuse;  // confirmed via Datamuse HTTP outcall
    #admin;     // admin-added, bypasses validation
  };

  // Result of a word validation check
  public type ValidationResult = {
    #valid   : ValidationSource;
    #invalid : Text;  // reason string e.g. "not a word"
  };

  // Full word pool state stored in the canister
  public type WordPoolState = {
    embedded             : [Text];          // baked-in word list (immutable at runtime)
    var custom           : [WordPoolEntry]; // admin-added or Datamuse-synced words
    var usedWords        : [Text];          // words already used in previous games (no repeats)
    var lastDatamuseSync : Timestamp;       // nanosecond timestamp of last Datamuse pull
  };

  // Result types for word-pool API
  public type AddWordResult = {
    #ok;
    #err : Text;
  };
};

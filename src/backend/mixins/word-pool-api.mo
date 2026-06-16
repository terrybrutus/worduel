import WordPoolLib "../lib/word-pool";
import AuthLib "../lib/auth-and-stats";
import WordPoolTypes "../types/word-pool";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Time "mo:core/Time";

mixin (
  accounts : Map.Map<Text, AuthLib.PlayerAccount>,
  authSessions : Map.Map<Text, Text>,
  customWords : List.List<WordPoolTypes.WordPoolEntry>,
  knownValidWords : Set.Set<Text>,
) {

  func requireWordPoolAdmin(token : Text) : Bool {
    switch (AuthLib.resolveSession(authSessions, token)) {
      case null { false };
      case (?username) { AuthLib.isAdmin(accounts, username) };
    };
  };

  public query func getWordCount() : async Nat {
    let embeddedSet = WordPoolLib._makeWordSet();
    embeddedSet.size() + customWords.size();
  };

  public func addWord(sessionToken : Text, word : Text) : async { #ok : Nat; #err : Text } {
    if (not requireWordPoolAdmin(sessionToken)) {
      return #err("Unauthorized");
    };
    let lower = word.toLower();
    // Reject duplicates explicitly
    if (WordPoolLib.isValidWord(customWords, knownValidWords, lower)) {
      return #err("Word already exists in the word pool");
    };
    let now = Time.now();
    let added = WordPoolLib.addCustomWord(customWords, knownValidWords, lower, null, now);
    if (added) {
      #ok(WordPoolLib.getAllWords(customWords).size());
    } else {
      #err("Word is invalid or not exactly 5 alphabetic characters");
    };
  };

  public func removeWord(sessionToken : Text, word : Text) : async { #ok : Nat; #err : Text } {
    if (not requireWordPoolAdmin(sessionToken)) {
      return #err("Unauthorized");
    };
    let removed = WordPoolLib.removeWord(customWords, word);
    if (removed) {
      #ok(WordPoolLib.getAllWords(customWords).size());
    } else {
      #err("Word not found in custom pool (embedded words cannot be removed)");
    };
  };

  public query func getAllWords(sessionToken : Text) : async { #ok : [Text]; #err : Text } {
    if (not requireWordPoolAdmin(sessionToken)) {
      return #err("Unauthorized");
    };
    #ok(WordPoolLib.getAllWords(customWords));
  };

  // Batch import words from a CSV-parsed array (admin only).
  // Validates each word: must be exactly 5 alphabetic characters.
  // Returns count of added, skipped (invalid format), duplicates, and unauthorized flag.
  public func importWords(sessionToken : Text, words : [Text]) : async { added : Nat; skipped : Nat; duplicates : Nat; unauthorized : Bool } {
    if (not requireWordPoolAdmin(sessionToken)) {
      return { added = 0; skipped = 0; duplicates = 0; unauthorized = true };
    };
    let now = Time.now();
    var added = 0;
    var skipped = 0;
    var duplicates = 0;
    for (raw in words.values()) {
      let lower = raw.toLower();
      if (lower.size() == 5) {
        let allAlpha = lower.toArray().all(func(c) { c.isAlphabetic() });
        if (allAlpha) {
          // Check if word already exists in any pool before attempting to add
          let alreadyExists = WordPoolLib.isValidWord(customWords, knownValidWords, lower);
          if (alreadyExists) {
            duplicates += 1;
          } else {
            let wasAdded = WordPoolLib.addCustomWord(customWords, knownValidWords, lower, null, now);
            if (wasAdded) { added += 1 } else { duplicates += 1 };
          };
        } else {
          skipped += 1;
        };
      } else {
        skipped += 1;
      };
    };
    { added; skipped; duplicates; unauthorized = false };
  };

  public query func validateGuessWord(word : Text) : async Bool {
    WordPoolLib.isValidWord(customWords, knownValidWords, word);
  };
};

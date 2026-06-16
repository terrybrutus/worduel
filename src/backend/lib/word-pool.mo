import Types "../types/word-pool";
import Common "../types/common";
import WordListData "word-list-data";
import List "mo:core/List";
import Set "mo:core/Set";

module {
  public type WordPoolEntry = Types.WordPoolEntry;
  public type PlayerName = Common.PlayerName;
  public type Timestamp = Common.Timestamp;

  // ── WORD LIST ──────────────────────────────────────────────────────────────
  // The full word list is defined in word-list-data.mo, split into 40 chunks
  // to stay within Motoko instruction limits. Each chunk returns a [Text] array.
  //
  // ANSWER_WORDS: used for random word selection (chunk01 is a broad, common set)
  public func getAnswerWords() : [Text] { WordListData.chunk01() };
  public let VALID_GUESSES_EXTRA : [Text] = [];

  // Pure helper: build a dedup Set from all word-list chunks.
  // Called only during validation — not on every canister heartbeat.
  public func _makeWordSet() : Set.Set<Text> {
    let s = Set.empty<Text>();
    for (arr in WordListData.getAllChunks().values()) {
      for (w in arr.values()) {
        if (w.size() == 5) {
          s.add(w);
        };
      };
    };
    s;
  };

  // Pure helper: build a dedup List preserving insertion order.
  func _makeWordList() : List.List<Text> {
    let s = Set.empty<Text>();
    let l = List.empty<Text>();
    for (arr in WordListData.getAllChunks().values()) {
      for (w in arr.values()) {
        if (w.size() == 5 and not s.contains(w)) {
          s.add(w);
          l.add(w);
        };
      };
    };
    l;
  };

  public func getAllWords(custom : List.List<WordPoolEntry>) : [Text] {
    let wordList = _makeWordList();
    let customWords = custom.map(func(e) { e.word });
    wordList.toArray().concat(customWords.toArray());
  };

  public func getRandomWord(_custom : List.List<WordPoolEntry>, seed : Nat) : Text {
    let words = WordListData.chunk01();
    let total = words.size();
    if (total == 0) { return "crane" };
    words[seed % total];
  };

  public func isValidWord(
    custom : List.List<WordPoolEntry>,
    _knownValidWords : Set.Set<Text>,
    word : Text,
  ) : Bool {
    let lower = word.toLower();
    let wordSet = _makeWordSet();
    if (wordSet.contains(lower)) { return true };
    // Check custom admin words
    let inCustom = custom.find(func(e) = e.word == lower);
    switch (inCustom) {
      case (?_) { return true };
      case null {};
    };
    // Check runtime-cached valid words (admin-imported)
    _knownValidWords.contains(lower);
  };

  public func cacheValidWord(knownValidWords : Set.Set<Text>, word : Text) {
    let lower = word.toLower();
    if (lower.size() != 5) { return };
    let allAlpha = lower.toArray().all(func(c) = c.isAlphabetic());
    if (not allAlpha) { return };
    knownValidWords.add(lower);
  };

  public func addCustomWord(
    custom : List.List<WordPoolEntry>,
    knownValidWords : Set.Set<Text>,
    word : Text,
    addedBy : ?PlayerName,
    timestamp : Timestamp,
  ) : Bool {
    let lower = word.toLower();
    if (lower.size() != 5) { return false };
    let allAlpha = lower.toArray().all(func(c) = c.isAlphabetic());
    if (not allAlpha) { return false };
    if (isValidWord(custom, knownValidWords, lower)) { return false };
    custom.add({ word = lower; addedAt = timestamp; addedBy = addedBy });
    true;
  };

  public func removeWord(custom : List.List<WordPoolEntry>, word : Text) : Bool {
    let lower = word.toLower();
    let sizeBefore = custom.size();
    let filtered = custom.filter(func(e) = e.word != lower);
    custom.clear();
    custom.append(filtered);
    custom.size() < sizeBefore;
  };
};

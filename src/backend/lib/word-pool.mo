import Types "../types/word-pool";
import Common "../types/common";
import WordListData "word-list-data";
import GuessWordListData "guess-word-list-data";
import List "mo:core/List";
import Set "mo:core/Set";

module {
  public type WordPoolEntry = Types.WordPoolEntry;
  public type PlayerName = Common.PlayerName;
  public type Timestamp = Common.Timestamp;
  public type WordValidationDebug = Types.WordValidationDebug;

  public let DICTIONARY_VERSION : Text = "worduel-dictionary-2026-07-03-v1";
  public let BACKEND_BUILD : Text = "worduel-backend-2026-07-03-dictionary-v1";

  // Keep answers curated, but accept a much broader set of real guesses.
  public func getAnswerWords() : [Text] { WordListData.chunk01() };

  public func _makeAnswerWordSet() : Set.Set<Text> {
    let s = Set.empty<Text>();
    for (w in getAnswerWords().values()) {
      if (w.size() == 5) {
        s.add(w);
      };
    };
    s;
  };

  public func _makeGuessWordSet() : Set.Set<Text> {
    let s = Set.empty<Text>();
    for (arr in GuessWordListData.getAllChunks().values()) {
      for (w in arr.values()) {
        if (w.size() == 5) {
          s.add(w);
        };
      };
    };
    s;
  };

  public func _makeWordSet() : Set.Set<Text> {
    _makeGuessWordSet();
  };

  func _makeGuessWordList() : List.List<Text> {
    let s = Set.empty<Text>();
    let l = List.empty<Text>();
    for (arr in GuessWordListData.getAllChunks().values()) {
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
    let wordList = _makeGuessWordList();
    let customWords = custom.map(func(e) { e.word });
    wordList.toArray().concat(customWords.toArray());
  };

  public func getRandomWord(_custom : List.List<WordPoolEntry>, seed : Nat) : Text {
    let words = getAnswerWords();
    let total = words.size();
    if (total == 0) { return "crane" };
    words[seed % total];
  };

  public func isValidWord(
    custom : List.List<WordPoolEntry>,
    knownValidWords : Set.Set<Text>,
    word : Text,
  ) : Bool {
    validateWordDebug(custom, knownValidWords, word).acceptedAsGuess;
  };

  public func validateWordDebug(
    custom : List.List<WordPoolEntry>,
    knownValidWords : Set.Set<Text>,
    word : Text,
  ) : WordValidationDebug {
    let lower = word.toLower();
    let lengthOk = lower.size() == 5;
    let alphabetic = lower.toArray().all(func(c) = c.isAlphabetic());
    let guessWordSet = _makeGuessWordSet();
    let answerWordSet = _makeAnswerWordSet();
    let acceptedAsAnswer = answerWordSet.contains(lower);
    let baseDebug = func(acceptedAsGuess : Bool, source : Text) : WordValidationDebug {
      {
        word;
        normalized = lower;
        lengthOk;
        alphabetic;
        acceptedAsGuess;
        acceptedAsAnswer;
        source;
        guessWordCount = GuessWordListData.WORD_COUNT;
        answerWordCount = getAnswerWords().size();
        customWordCount = custom.size();
        dictionaryVersion = DICTIONARY_VERSION;
        backendBuild = BACKEND_BUILD;
      };
    };

    if (lengthOk and alphabetic and guessWordSet.contains(lower)) {
      return baseDebug(true, if (acceptedAsAnswer) { "answer_list" } else { "guess_list" });
    };

    switch (custom.find(func(e) = e.word == lower)) {
      case (?_) { return baseDebug(true, "admin_custom") };
      case null {};
    };

    if (knownValidWords.contains(lower)) {
      return baseDebug(true, "runtime_cache");
    };

    baseDebug(
      false,
      if (not lengthOk) { "invalid_length" } else if (not alphabetic) { "invalid_characters" } else { "not_found" },
    );
  };

  public func isPlausibleGuess(word : Text) : Bool {
    let lower = word.toLower();
    if (lower.size() != 5) { return false };
    lower.toArray().all(func(c) = c.isAlphabetic());
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

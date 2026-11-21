import JSON "mo:serde-core/JSON";
import FromText "mo:serde-core/JSON/FromText";
import Candid "mo:serde-core/Candid";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

module {
  public type Value = Candid.Candid;
  public func render(value : Value) : Text { switch (JSON.fromCandid(value)) { case (#ok(t)) t; case _ "null" } };
  public func parse(raw : Text) : Value { switch (FromText.toCandid(raw)) { case (#ok(v)) v; case _ #Null } };
  public func field(value : Value, key : Text) : Value {
    switch (value) { case (#Record(fields)) { for ((name,item) in fields.values()) { if (name == key) return item }; #Null }; case _ #Null };
  };
  public func string(value : Value) : Text { switch (value) { case (#Text(t)) t; case _ "" } };
  public func array(value : Value) : [Value] { switch (value) { case (#Array(items)) items; case _ [] } };
  public func yes(value : Value) : Bool { switch (value) { case (#Bool(true)) true; case _ false } };
  public func args(raw : Text) : [Value] {
    switch (FromText.toCandid(raw)) { case (#ok(#Array(values))) values; case _ [] };
  };
  public func text(values : [Value], index : Nat) : Text {
    if (index >= values.size()) return "";
    switch (values[index]) { case (#Text(value)) value; case _ "" };
  };
  public func nat(values : [Value], index : Nat, fallback : Nat) : Nat {
    if (index >= values.size()) return fallback;
    switch (values[index]) { case (#Nat(value)) value; case _ fallback };
  };
  public func encode(blob : Blob) : Text {
    switch (Candid.decode(blob,keys,null)) { case (#ok(values)) { if (values.size() == 1) render(exact(values[0])) else "null" }; case _ "null" };
  };
  func exact(value : Value) : Value {
    switch (value) {
      case (#Nat(n)) { if (n > 9007199254740991) #Record([("__worduelBigInt",#Text(n.toText()))]) else value };
      case (#Int(n)) { if (Int.abs(n) > 9007199254740991) #Record([("__worduelBigInt",#Text(n.toText()))]) else value };
      case (#Array(a)) #Array(a.map(exact));
      case (#Tuple(a)) #Array(a.map(exact));
      case (#Map(a)) #Record(a.map(func((k,v)) { (k,exact(v)) }));
      case (#Record(a)) {
        if (a.size() == 2) {
          switch (a.find(func((k,_)) { k == "0" }),a.find(func((k,_)) { k == "1" })) {
            case (?( _,left),?( _,right)) return #Array([exact(left),exact(right)]);
            case _ {};
          };
        };
        #Record(a.map(func((k,v)) { (k,exact(v)) }));
      };
      case (#Variant((k,v))) #Variant(k,exact(v));
      case (#Option(v)) #Option(exact(v));
      case _ value;
    };
  };
  let keys = ["ok","err","token","username","role","player","admin","isDisabled","createdAt","stats",
    "totalWins","totalLosses","currentStreak","bestStreak","wins","losses","gameId","roomCode","joinToken",
    "newGameId","offeredBy","gameState","isHost","id","mode","coop","versus","players","myGuesses",
    "opponentGuessCount","opponentGuessTileStates","coopGuesses","currentTurn","currentTurnPlayer","status",
    "waiting","playing","won","lost","expired","exitReason","answer","isPublic","playerNum","myOutcome",
    "opponentWon","word","states","correct","present","absent","timestamp","wordLength","waitingForMove",
    "opponent","myGuessCount","endedAt","gameError","notAWord","notYourTurn","kind","daily","replay","day",
    "guesses","finished","solved","streak","scores","isYou","definition","example","source","sourceUrl",
    "aiEnhanced","originalDefinition","question","aiGenerated","savedDefinition","alternatives","sentence","text",
    "wordBank","revision","entries","updatedAt","payload","not-configured","unavailable","ready","limit",
    "model","max_tokens","system","messages","content","verifiedDefinition","savedMeaning","candidate","meaningValid","sentenceValid","supported","__worduelBigInt",
    "word","normalized","lengthOk","alphabetic","acceptedAsGuess","acceptedAsAnswer","guessWordCount","answerWordCount","customWordCount","dictionaryVersion","backendBuild","added","skipped","duplicates","unauthorized"];
};

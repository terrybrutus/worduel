import Types "../types/challenges";
import Auth "../lib/auth-and-stats";
import Game "../lib/game";
import Words "../lib/word-pool";
import Entropy "../lib/entropy";
import Wire "../lib/wire";
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Time "mo:core/Time";
import Error "mo:core/Error";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Char "mo:core/Char";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Text "mo:core/Text";
import Iter "mo:core/Iter";

mixin(challenges : Map.Map<Text,Types.Challenge>, accounts : Map.Map<Text,Auth.PlayerAccount>, authSessions : Map.Map<Text,Text>, custom : List.List<Words.WordPoolEntry>, dictionary : Set.Set<Text>) {
  func challengePlayer(token : Text) : ?Text {
    switch (Auth.resolveSession(authSessions,token)) { case (?name) { switch (accounts.get(name)) { case (?a) { if (a.isDisabled) null else ?name }; case null null } }; case null null };
  };
  func dayNow() : Int { Time.now() / (86400 * 1_000_000_000) };
  func dayId(day : Int, length : Nat) : Text { "daily-" # day.toText() # "-" # length.toText() };
  func streakFor(name : Text, length : Nat) : Nat {
    var day = dayNow(); var streak = 0;
    func solvedOnDay(d : Int) : Bool {
      switch (challenges.get(dayId(d,length))) { case (?c) { switch (c.runs.get(name)) { case (?r) { switch (r.completed) { case (?t) r.solved and t / (86400 * 1_000_000_000) == d; case null false } }; case null false } }; case null false };
    };
    if (not solvedOnDay(day)) day -= 1;
    while (streak < 365 and solvedOnDay(day)) { streak += 1; day -= 1 };
    streak;
  };
  func challengeView(c : Types.Challenge, name : Text) : Types.View {
    let run : Types.Run = switch (c.runs.get(name)) { case (?r) r; case null ({ username = name; var guesses = []; var solved = false; var completed = null }) };
    let finished = run.completed != null;
    let scores : [Types.Score] = if (finished) c.runs.values().filter(func(r) { r.completed != null }).map<Types.Run,Types.Score>(func(r) { { username = r.username; isYou = r.username == name; solved = r.solved; guesses = r.guesses.size() } }).toArray() else [];
    let sorted = scores.sort(func(a,b) { if (a.solved != b.solved) { if (a.solved) #less else #greater } else if (a.guesses < b.guesses) #less else if (a.guesses > b.guesses) #greater else #equal });
    { id = c.id; kind = c.kind; day = c.day.toText(); wordLength = c.wordLength; guesses = run.guesses; finished; solved = run.solved;
      answer = if (finished) ?c.answer else null; streak = if (c.kind == "daily") streakFor(name,c.wordLength) else 0; scores = Array.tabulate<Types.Score>(if (sorted.size() < 20) sorted.size() else 20,func(i) { sorted[i] }) };
  };
  public func challengeCall(token : Text, method : Text, rawArgs : Text) : async Text {
    let name = switch (challengePlayer(token)) { case (?n) n; case null throw Error.reject("Invalid or expired session") };
    let args = Wire.args(rawArgs);
    if (method == "listChallenges") {
      let recent = challenges.values().filter(func(c) { c.runs.containsKey(name) and Time.now() - c.created <= 30 * 86400 * 1_000_000_000 }).toArray().sort(func(a,b) { Int.compare(b.created,a.created) });
      let views = Array.tabulate(if (recent.size() < 10) recent.size() else 10,func(i) { challengeView(recent[i],name) });
      return Wire.encode(to_candid(views));
    };
    var id = Wire.text(args,0);
    if (method == "dailyChallenge" or method == "createReplay") {
      let length = Wire.nat(args,0,5);
      if (length < 5 or length > 7) throw Error.reject("Choose 5, 6, or 7 letters");
      let nonce = await Entropy.hex();
      if (challengePlayer(token) != ?name) throw Error.reject("Session expired");
      let day = dayNow();
      id := if (method == "dailyChallenge") dayId(day,length) else nonce;
      if (not challenges.containsKey(id)) {
        if (challenges.size() >= 5000) throw Error.reject("Challenge capacity reached");
        let pool = Words.getAnswerWordsForLength(length);
        var seed = 0;
        for (c in nonce.chars()) { seed := (seed * 31 + c.toNat32().toNat()) % pool.size() };
        challenges.add(id,{ id; kind = if (method == "dailyChallenge") "daily" else "replay"; day; wordLength = length; answer = pool[seed]; created = Time.now(); runs = Map.empty<Text,Types.Run>() });
      };
    } else if (method != "challengeState" and method != "submitChallengeGuess") throw Error.reject("Unknown challenge operation");
    let c = switch (challenges.get(id)) { case (?found) found; case null throw Error.reject("Challenge not found") };
    if (Time.now() - c.created > 30 * 86400 * 1_000_000_000) throw Error.reject("Challenge expired");
    if (not c.runs.containsKey(name)) {
      if (c.runs.size() >= 100) throw Error.reject("This challenge is full");
      let fresh : Types.Run = { username = name; var guesses = []; var solved = false; var completed = null };
      c.runs.add(name,fresh);
    };
    if (method == "submitChallengeGuess") {
      let run = switch (c.runs.get(name)) { case (?r) r; case null throw Error.reject("Run not found") };
      if (run.completed != null) throw Error.reject("This round is finished");
      let word = Wire.text(args,1).toLower();
      if (word.size() != c.wordLength or not Words.isValidWord(custom,dictionary,word)) throw Error.reject("Not in the word list");
      if (run.guesses.find(func(g) { g.word == word }) != null) throw Error.reject("Already guessed");
      run.guesses := run.guesses.concat([{ word; states = Game.evaluateGuess(word,c.answer); playerNum = 1; timestamp = Time.now() }]);
      run.solved := word == c.answer;
      if (run.solved or run.guesses.size() >= 6) run.completed := ?Time.now();
    };
    Wire.encode(to_candid(challengeView(c,name)));
  };
};

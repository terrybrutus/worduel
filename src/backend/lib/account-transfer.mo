import Wire "wire";
import Auth "auth-and-stats";
import Game "../types/game";
import Challenges "../types/challenges";
import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Char "mo:core/Char";

module {
  public type Bank = { revision : Nat; payload : Text };

  // The legacy JSON parser exhausts its stack on wide arrays. Tokenize only
  // the array envelope iteratively; the existing parser still validates each record.
  func readWords(payload : Text) : ?[Wire.Value] {
    let result = List.empty<Wire.Value>();
    let chunk = List.empty<Char>();
    var opened = false;
    var closed = false;
    var quoted = false;
    var escaped = false;
    var depth : Nat = 0;
    var afterComma = false;
    func whitespace(c : Char) : Bool { c == ' ' or c == '\n' or c == '\r' or c == '\t' };
    func finish() : Bool {
      let raw = Text.fromIter(chunk.values()).trim(#predicate whitespace);
      if (raw.size() == 0 or result.size() >= 1000) return false;
      switch (Wire.parse(raw)) { case (#Record(fields)) result.add(#Record(fields)); case _ return false };
      chunk.clear(); true;
    };
    for (c in payload.chars()) {
      if (not opened) { if (c == '[') opened := true else if (not whitespace(c)) return null }
      else if (closed) { if (not whitespace(c)) return null }
      else if (quoted) {
        chunk.add(c);
        if (escaped) escaped := false else if (c.toNat32() == 92) escaped := true else if (c.toNat32() == 34) quoted := false;
      } else if (c.toNat32() == 34) { quoted := true; chunk.add(c) }
      else if (c == '{' or c == '[') { depth += 1; if (depth > 24) return null; chunk.add(c) }
      else if (c == ']' and depth == 0) {
        let pending = Text.fromIter(chunk.values()).trim(#predicate whitespace);
        if (pending.size() > 0) { if (not finish()) return null }
        else if (afterComma) return null;
        closed := true;
      } else if (c == '}' or c == ']') { if (depth == 0) return null; depth -= 1; chunk.add(c) }
      else if (c == ',' and depth == 0) { if (not finish()) return null; afterComma := true }
      else chunk.add(c);
      if (chunk.size() > 16384) return null;
    };
    if (not opened or not closed or quoted or depth != 0) null else ?result.toArray();
  };

  public func mergeWords(payloads : [Text]) : { #ok : Text; #err : Text } {
    let words = Map.empty<Text,Wire.Value>();
    for (payload in payloads.values()) {
      if (payload.size() > 500000) return #err("Word Bank storage limit reached. No progress was transferred.");
      let entries = switch (readWords(payload)) { case (?a) a; case null return #err("Saved words could not be read or exceed the 1000-word limit. No progress was transferred.") };
      for (entry in entries.values()) {
        let word = Wire.string(Wire.field(entry,"word")).toLower();
        if (word.size() == 0 or Wire.string(Wire.field(entry,"definition")).size() == 0) return #err("A saved word could not be read. No progress was transferred.");
        let previous = words.get(word);
        let latest = switch (previous) {
          case null entry;
          case (?old) {
            if (Wire.nat([Wire.field(entry,"lastSeenAt")],0,0) >= Wire.nat([Wire.field(old,"lastSeenAt")],0,0)) entry else old;
          };
        };
        words.add(word,latest);
      };
    };
    if (words.size() > 1000) return #err("The combined Word Bank exceeds 1000 words. No progress was transferred.");
    let payload = Wire.render(#Array(words.values().toArray()));
    if (payload.size() > 500000) return #err("The combined Word Bank is too large. No progress was transferred.");
    #ok(payload);
  };

  // Called once, synchronously, after verifying both the identity and guest token.
  public func moveProgress(
    source : Text, target : Text,
    stats : Map.Map<Text,Auth.PlayerStatsInternal>,
    history : Map.Map<Text,List.List<Game.GameHistoryEntry>>,
    opponents : Map.Map<Text,Map.Map<Text,Auth.OpponentRecordInternal>>,
    games : Map.Map<Text,Game.GameSession>,
    offers : Map.Map<Text,Game.RematchOffer>,
    challenges : Map.Map<Text,Challenges.Challenge>,
  ) {
    let combined = Map.empty<Text,Game.GameHistoryEntry>();
    switch (history.get(target)) { case (?entries) for (entry in entries.values()) combined.add(entry.gameId,entry); case null {} };
    var duplicateWins = 0;
    var duplicateLosses = 0;
    switch (history.get(source)) {
      case (?entries) for (entry in entries.values()) {
        if (combined.containsKey(entry.gameId)) {
          if (entry.won) duplicateWins += 1 else duplicateLosses += 1;
        } else combined.add(entry.gameId,entry);
      };
      case null {};
    };
    let ordered = combined.values().toArray().sort(func(a,b) { Int.compare(a.endedAt,b.endedAt) });
    let a = Auth.getStats(stats,target);
    let b = Auth.getStats(stats,source);
    var streak = 0;
    var best = Nat.max(a.bestStreak,b.bestStreak);
    for (entry in ordered.values()) {
      streak := if (entry.won) streak + 1 else 0;
      best := Nat.max(best,streak);
    };
    stats.add(target,{
      var totalWins = Nat.sub(a.totalWins+b.totalWins,Nat.min(duplicateWins,a.totalWins+b.totalWins));
      var totalLosses = Nat.sub(a.totalLosses+b.totalLosses,Nat.min(duplicateLosses,a.totalLosses+b.totalLosses));
      var currentStreak = if (ordered.size() > 0) streak else Nat.max(a.currentStreak,b.currentStreak);
      var bestStreak = best;
    });
    let entries = List.empty<Game.GameHistoryEntry>();
    for (entry in ordered.values()) entries.add(entry);
    history.add(target,entries);
    let targetOpponents = switch (opponents.get(target)) { case (?m) m; case null Map.empty<Text,Auth.OpponentRecordInternal>() };
    switch (opponents.get(source)) {
      case (?records) for ((name,record) in records.entries()) {
        if (name != target and name != source) {
          let old : Auth.OpponentRecordInternal = switch (targetOpponents.get(name)) { case (?r) r; case null ({var wins=0;var losses=0;var draws=0}) };
          targetOpponents.add(name,{var wins=old.wins+record.wins;var losses=old.losses+record.losses;var draws=old.draws+record.draws});
        };
      };
      case null {};
    };
    opponents.add(target,targetOpponents);
    for (game in games.values()) {
      game.players := game.players.map(func(name) { if (name == source) target else name });
    };
    for ((id,offer) in offers.entries().toArray().values()) {
      if (offer.offeredBy == source) offers.add(id,{offer with offeredBy=target});
    };
    for (challenge in challenges.values()) {
      switch (challenge.runs.get(source)) {
        case (?run) {
          let keepGuest = switch (challenge.runs.get(target)) {
            case null true;
            case (?existing) existing.completed == null and run.completed != null;
          };
          if (keepGuest) challenge.runs.add(target,{username=target;var guesses=run.guesses;var solved=run.solved;var completed=run.completed});
          challenge.runs.remove(source);
        };
        case null {};
      };
    };
  };
};

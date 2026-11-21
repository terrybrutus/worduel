import Map "mo:core/Map";
import Game "game";
module {
  public type Run = { username : Text; var guesses : [Game.Guess]; var solved : Bool; var completed : ?Int };
  public type Challenge = { id : Text; kind : Text; day : Int; wordLength : Nat; answer : Text; created : Int; runs : Map.Map<Text,Run> };
  public type Score = { username : Text; isYou : Bool; solved : Bool; guesses : Nat };
  public type View = { id : Text; kind : Text; day : Text; wordLength : Nat; guesses : [Game.Guess]; finished : Bool; solved : Bool; answer : ?Text; streak : Nat; scores : [Score] };
};

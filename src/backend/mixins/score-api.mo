import Types "../types/score";
import ScoreLib "../lib/score";

mixin (bestScore : { var value : Types.BestScore }) {
  public query func getBestScore() : async Types.BestScore {
    ScoreLib.getBestScore(bestScore.value);
  };

  public shared ({ caller }) func submitScore(score : Types.BestScore) : async Types.BestScore {
    ignore caller;
    let newBest = ScoreLib.submitScore(bestScore.value, score);
    bestScore.value := newBest;
    newBest;
  };
};

import Types "../types/score";

module {
  public func getBestScore(best : Types.BestScore) : Types.BestScore {
    best;
  };

  public func submitScore(best : Types.BestScore, score : Types.BestScore) : Types.BestScore {
    if (score > best) { score } else { best };
  };
};

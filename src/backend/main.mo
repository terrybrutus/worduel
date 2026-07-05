import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Types "types/score";
import ScoreApi "mixins/score-api";

actor {
  include MixinViews();

  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  let bestScore : { var value : Types.BestScore };
  include ScoreApi(bestScore);
};

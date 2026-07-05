import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type UserRole = {
    #admin;
    #user;
    #guest;
  };

  type OldActor = {};
  type NewActor = {
    bestScore : { var value : Nat };
    accessControlState : {
      var adminAssigned : Bool;
      userRoles : Map.Map<Principal, UserRole>;
    };
  };

  public func migration(_old : OldActor) : NewActor {
    {
      bestScore = { var value = 0 : Nat };
      accessControlState = {
        var adminAssigned = false;
        userRoles = Map.empty();
      };
    };
  };
};
